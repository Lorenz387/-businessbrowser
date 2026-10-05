import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import multer from 'multer'
import { one, all, run, tx, UPLOAD_DIR } from '../../db.js'
import { h, str, oneOf, badRequest, notFound, forbidden } from '../../lib/http.js'
import { aiAvailable } from '../../lib/ai.js'
import { consumeDaily } from '../../lib/usage.js'
import { appScope, appEnabled, ORG_WRITE_ROLES } from '../../lib/workspace.js'
import { audit } from '../../lib/audit.js'
import { notify } from '../../lib/engine.js'
import {
  TASK_STATUS, PRIORITY, KIND, CATEGORIES, INBOX_STATUS, BUILTIN_TEMPLATES, officeWhere, taskOut, inboxOut, canEdit, assignees, assertAssignee,
  notifyAssignment, todayUtc, placeholders,
} from './service.js'
import { classifyDocument, draftLetter } from './ai.js'

const r = Router()
const scope = (req) => ({ ...appScope(req, 'office'), userId: req.user.id })
const DATE = /^\d{4}-\d{2}-\d{2}$/
const date = (v, field = 'Datum') => {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  if (!DATE.test(v)) throw badRequest(`${field} im Format JJJJ-MM-TT angeben.`)
  return v
}

const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_q, _f, cb) => cb(null, crypto.randomBytes(16).toString('hex')) }),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_q, f, cb) => (/^(application\/pdf|image\/(png|jpeg|gif|webp)|text\/plain)$/.test(f.mimetype) ? cb(null, true)
    : cb(Object.assign(new Error('Bitte lade eine PDF-, Bild- oder Textdatei hoch.'), { status: 415 }))),
})

function own(table, sc, id) {
  const [w, p] = officeWhere(sc)
  const row = one(`SELECT * FROM ${table} WHERE id = ? AND ${w}`, Number(id), ...p)
  if (!row) throw notFound('Dieser Eintrag existiert nicht.')
  return row
}

// ---------- Übersicht ----------

r.get('/apps/office', h(async (req, res) => {
  const sc = scope(req)
  const [w, p] = officeWhere(sc)
  const today = todayUtc()
  const tasks = all(`SELECT * FROM office_tasks WHERE ${w} AND (status != 'done' OR done_at > datetime('now', '-30 days')) ORDER BY status = 'done', due_date IS NULL, due_date, priority = 'high' DESC, created_at DESC`, ...p).map((t) => taskOut(t, today))
  const inbox = all(`SELECT * FROM office_inbox WHERE ${w} AND status != 'archived' ORDER BY status = 'done', received_at DESC LIMIT 200`, ...p).map(inboxOut)
  const templates = all(`SELECT * FROM office_templates WHERE ${w} ORDER BY name`, ...p)
  res.json({
    workspace: { type: sc.type, name: sc.orgName || null, role: sc.role },
    me: req.user.id,
    isManager: sc.isManager,
    assignees: assignees(sc),
    tasks, inbox,
    templates: [...BUILTIN_TEMPLATES.map((t) => ({ ...t, id: `builtin:${t.key}`, builtin: true, placeholders: placeholders(`${t.subject} ${t.body}`) })), ...templates.map((t) => ({ ...t, placeholders: placeholders(`${t.subject} ${t.body}`) }))],
    senderName: sc.type === 'org' ? sc.orgName : req.user.name,
    taskStatus: TASK_STATUS, priority: PRIORITY, kinds: KIND, categories: CATEGORIES, inboxStatus: INBOX_STATUS,
    aiAvailable: aiAvailable(),
    contractsAvailable: sc.type === 'private' || (appEnabled(sc.orgId, 'contracts') && ORG_WRITE_ROLES.includes(sc.role)),
  })
}))

// ---------- Aufgaben & Wiedervorlagen ----------

function readTask(sc, b, cur = {}) {
  const v = {
    title: b.title !== undefined ? str(b.title, { required: true, max: 200, field: 'Titel' }) : cur.title,
    notes: b.notes !== undefined ? str(b.notes, { max: 5000 }) : cur.notes ?? null,
    status: oneOf(b.status, Object.keys(TASK_STATUS), { field: 'Status', fallback: cur.status ?? 'open' }),
    priority: oneOf(b.priority, Object.keys(PRIORITY), { field: 'Priorität', fallback: cur.priority ?? 'normal' }),
    kind: oneOf(b.kind, Object.keys(KIND), { field: 'Art', fallback: cur.kind ?? 'task' }),
    due_date: b.dueDate !== undefined ? date(b.dueDate, 'Fälligkeit') : cur.due_date ?? null,
    assignee_id: b.assigneeId !== undefined ? (b.assigneeId ? assertAssignee(sc, Number(b.assigneeId)) : null) : cur.assignee_id ?? null,
  }
  if (b.assigneeId && v.assignee_id == null) throw badRequest('Diese Person gehört nicht zum Arbeitsbereich.')
  if (v.kind === 'followup' && !v.due_date) throw badRequest('Eine Wiedervorlage braucht ein Datum.')
  return v
}

r.post('/apps/office/tasks', h(async (req, res) => {
  const sc = scope(req)
  sc.requireWrite()
  const v = readTask(sc, req.body)
  if (sc.type === 'private' && v.assignee_id == null) v.assignee_id = sc.userId
  const id = Number(run('INSERT INTO office_tasks (created_by, owner_private, org_id, assignee_id, title, notes, status, priority, kind, due_date, inbox_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    sc.userId, sc.type === 'private' ? sc.userId : null, sc.orgId, v.assignee_id, v.title, v.notes, v.status, v.priority, v.kind, v.due_date,
    req.body.inboxId ? own('office_inbox', sc, req.body.inboxId).id : null).lastInsertRowid)
  const t = one('SELECT * FROM office_tasks WHERE id = ?', id)
  notifyAssignment(t, sc.userId)
  res.status(201).json(taskOut(t))
}))

r.patch('/apps/office/tasks/:id', h(async (req, res) => {
  const sc = scope(req)
  const cur = own('office_tasks', sc, req.params.id)
  // Everyone in the team may take an unassigned task; other changes need creator, assignee or manager.
  const takeOver = sc.type === 'org' && !cur.assignee_id && Object.keys(req.body).length === 1 && Number(req.body.assigneeId) === sc.userId
  if (!takeOver && !canEdit(sc, cur)) throw forbidden('Diese Aufgabe können nur die zuständige Person, wer sie angelegt hat, oder Manager ändern.')
  const v = readTask(sc, req.body, cur)
  const doneAt = v.status === 'done' ? cur.done_at || new Date().toISOString().replace('T', ' ').slice(0, 19) : null
  run("UPDATE office_tasks SET title = ?, notes = ?, status = ?, priority = ?, kind = ?, due_date = ?, assignee_id = ?, done_at = ?, updated_at = datetime('now') WHERE id = ?",
    v.title, v.notes, v.status, v.priority, v.kind, v.due_date, v.assignee_id, doneAt, cur.id)
  const t = one('SELECT * FROM office_tasks WHERE id = ?', cur.id)
  if (t.assignee_id !== cur.assignee_id) notifyAssignment(t, sc.userId)
  res.json(taskOut(t))
}))

r.delete('/apps/office/tasks/:id', h(async (req, res) => {
  const sc = scope(req)
  const cur = own('office_tasks', sc, req.params.id)
  if (sc.type === 'org' && !sc.isManager && cur.created_by !== sc.userId) throw forbidden('Löschen dürfen nur Manager oder wer die Aufgabe angelegt hat.')
  run('DELETE FROM office_tasks WHERE id = ?', cur.id)
  if (cur.org_id) audit(req, 'org.deleted_record', { orgId: cur.org_id, target: `Aufgabe: ${cur.title}` })
  res.json({ ok: true })
}))

// ---------- Posteingang ----------

r.post('/apps/office/inbox', upload.single('file'), h(async (req, res) => {
  const sc = scope(req)
  sc.requireWrite()
  let docId = null
  let title = str(req.body.title, { max: 200 })
  if (req.file) {
    const text = req.file.mimetype === 'text/plain' ? fs.readFileSync(req.file.path, 'utf8').slice(0, 300000) : null
    docId = Number(run('INSERT INTO documents (user_id, org_id, filename, mime, size, stored_name, text_content) VALUES (?, ?, ?, ?, ?, ?, ?)',
      sc.userId, sc.orgId, req.file.originalname.slice(0, 200), req.file.mimetype, req.file.size, req.file.filename, text).lastInsertRowid)
    title ||= req.file.originalname.replace(/\.[^.]+$/, '').slice(0, 200)
  }
  if (!title) throw badRequest('Bitte lade eine Datei hoch oder gib einen Titel an.')
  const id = Number(run('INSERT INTO office_inbox (user_id, owner_private, org_id, document_id, title, sender, category, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    sc.userId, sc.type === 'private' ? sc.userId : null, sc.orgId, docId, title, str(req.body.sender, { max: 200 }),
    oneOf(req.body.category, Object.keys(CATEGORIES), { field: 'Kategorie', fallback: 'sonstiges' }), str(req.body.summary, { max: 3000 })).lastInsertRowid)
  res.status(201).json(inboxOut(one('SELECT * FROM office_inbox WHERE id = ?', id)))
}))

r.get('/apps/office/inbox/:id', h(async (req, res) => {
  const sc = scope(req)
  const i = own('office_inbox', sc, req.params.id)
  res.json({
    ...inboxOut(i),
    document: i.document_id ? one('SELECT id, filename, mime, size FROM documents WHERE id = ?', i.document_id) : null,
    tasks: all('SELECT * FROM office_tasks WHERE inbox_id = ? ORDER BY id', i.id).map((t) => taskOut(t)),
    canEdit: canEdit(sc, i, 'user_id'),
  })
}))

r.get('/apps/office/inbox/:id/file', h(async (req, res) => {
  const sc = scope(req)
  const i = own('office_inbox', sc, req.params.id)
  const d = i.document_id && one('SELECT * FROM documents WHERE id = ?', i.document_id)
  if (!d) throw notFound('Zu diesem Eingang gibt es keine Datei.')
  res.setHeader('Content-Type', d.mime)
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(d.filename)}`)
  res.sendFile(path.join(UPLOAD_DIR, d.stored_name))
}))

r.post('/apps/office/inbox/:id/classify', h(async (req, res) => {
  const sc = scope(req)
  const i = own('office_inbox', sc, req.params.id)
  if (!canEdit(sc, i, 'user_id')) throw forbidden()
  const d = i.document_id && one('SELECT * FROM documents WHERE id = ?', i.document_id)
  if (!d) throw badRequest('Zu diesem Eingang gibt es kein Dokument zum Auslesen.')
  consumeDaily(sc.userId, 'ai_messages')
  const out = await classifyDocument({ filename: d.filename, mime: d.mime, text: d.text_content, buffer: d.text_content ? null : fs.readFileSync(path.join(UPLOAD_DIR, d.stored_name)) })
  run('UPDATE office_inbox SET extraction = ? WHERE id = ?', JSON.stringify(out), i.id)
  res.json({ extraction: out })
}))

r.patch('/apps/office/inbox/:id', h(async (req, res) => {
  const sc = scope(req)
  const i = own('office_inbox', sc, req.params.id)
  const b = req.body
  const takeOver = sc.type === 'org' && !i.assignee_id && Object.keys(b).length === 1 && Number(b.assigneeId) === sc.userId
  if (!takeOver && !canEdit(sc, i, 'user_id')) throw forbidden('Diesen Eingang können nur die zuständige Person, wer ihn erfasst hat, oder Manager ändern.')
  const assignee = b.assigneeId !== undefined ? (b.assigneeId ? assertAssignee(sc, Number(b.assigneeId)) : null) : i.assignee_id
  if (b.assigneeId && assignee == null) throw badRequest('Diese Person gehört nicht zum Arbeitsbereich.')
  let status = oneOf(b.status, Object.keys(INBOX_STATUS), { field: 'Status', fallback: i.status })
  if (b.assigneeId && status === 'new') status = 'assigned'
  const amount = b.amount === undefined ? i.amount : b.amount === '' || b.amount === null ? null : Number(String(b.amount).replace(',', '.'))
  if (amount != null && !Number.isFinite(amount)) throw badRequest('Betrag ist ungültig.')
  run('UPDATE office_inbox SET title = ?, sender = ?, category = ?, summary = ?, reference = ?, deadline = ?, amount = ?, status = ?, assignee_id = ? WHERE id = ?',
    b.title !== undefined ? str(b.title, { required: true, max: 200, field: 'Titel' }) : i.title,
    b.sender !== undefined ? str(b.sender, { max: 200 }) : i.sender,
    oneOf(b.category, Object.keys(CATEGORIES), { field: 'Kategorie', fallback: i.category }),
    b.summary !== undefined ? str(b.summary, { max: 3000 }) : i.summary,
    b.reference !== undefined ? str(b.reference, { max: 120 }) : i.reference,
    b.deadline !== undefined ? date(b.deadline, 'Frist') : i.deadline,
    amount, status, assignee, i.id)
  const updated = one('SELECT * FROM office_inbox WHERE id = ?', i.id)
  if (assignee && assignee !== i.assignee_id && assignee !== sc.userId) {
    notify(assignee, 'office', `${req.user.name} hat dir ein Dokument im Posteingang zugewiesen: „${updated.title}“${updated.deadline ? ` (Frist ${updated.deadline.split('-').reverse().join('.')})` : ''}.`,
      { link: `/apps/office?tab=inbox&item=${i.id}${i.org_id ? `&ws=org:${i.org_id}` : ''}`, dedupeKey: `office-inbox-assign:${i.id}:${assignee}` })
  }
  res.json(inboxOut(updated))
}))

/** Turn the (suggested) tasks of a document into real tasks. */
r.post('/apps/office/inbox/:id/tasks', h(async (req, res) => {
  const sc = scope(req)
  const i = own('office_inbox', sc, req.params.id)
  if (!canEdit(sc, i, 'user_id')) throw forbidden()
  const list = Array.isArray(req.body.tasks) ? req.body.tasks.slice(0, 10) : []
  if (!list.length) throw badRequest('Keine Aufgaben ausgewählt.')
  const assignee = req.body.assigneeId ? assertAssignee(sc, Number(req.body.assigneeId)) : sc.type === 'private' ? sc.userId : i.assignee_id
  const ids = tx(() => list.map((t) => Number(run('INSERT INTO office_tasks (created_by, owner_private, org_id, assignee_id, title, due_date, inbox_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    sc.userId, sc.type === 'private' ? sc.userId : null, sc.orgId, assignee, str(t.title, { required: true, max: 200, field: 'Titel' }), date(t.due, 'Fälligkeit') ?? null, i.id).lastInsertRowid)))
  for (const id of ids) notifyAssignment(one('SELECT * FROM office_tasks WHERE id = ?', id), sc.userId)
  if (i.status === 'new') run("UPDATE office_inbox SET status = 'assigned' WHERE id = ?", i.id)
  res.status(201).json({ created: ids.length })
}))

/** Connection Büro → Fristen-Manager: a contract document becomes a contract with deadline tracking. */
r.post('/apps/office/inbox/:id/to-contract', h(async (req, res) => {
  const sc = scope(req)
  const i = own('office_inbox', sc, req.params.id)
  const contracts = appScope(req, 'contracts')
  contracts.requireWrite()
  if (i.contract_id && one('SELECT 1 FROM contracts WHERE id = ?', i.contract_id)) throw badRequest('Dieses Dokument wurde bereits als Vertrag übernommen.')
  const id = Number(run('INSERT INTO contracts (user_id, org_id, title, counterparty, document_id) VALUES (?, ?, ?, ?, ?)', sc.userId, sc.orgId, i.title, i.sender, i.document_id).lastInsertRowid)
  run("UPDATE office_inbox SET contract_id = ?, category = 'vertrag', status = CASE WHEN status = 'new' THEN 'done' ELSE status END WHERE id = ?", id, i.id)
  res.status(201).json({ contractId: id })
}))

r.delete('/apps/office/inbox/:id', h(async (req, res) => {
  const sc = scope(req)
  const i = own('office_inbox', sc, req.params.id)
  if (sc.type === 'org' && !sc.isManager && i.user_id !== sc.userId) throw forbidden('Löschen dürfen nur Manager oder wer den Eingang erfasst hat.')
  run('DELETE FROM office_inbox WHERE id = ?', i.id)
  if (i.org_id) audit(req, 'org.deleted_record', { orgId: i.org_id, target: `Posteingang: ${i.title}` })
  res.json({ ok: true })
}))

// ---------- Vorlagen & Briefe ----------

r.post('/apps/office/templates', h(async (req, res) => {
  const sc = scope(req)
  sc.requireWrite()
  const id = Number(run('INSERT INTO office_templates (user_id, owner_private, org_id, name, subject, body) VALUES (?, ?, ?, ?, ?, ?)', sc.userId, sc.type === 'private' ? sc.userId : null, sc.orgId,
    str(req.body.name, { required: true, max: 120, field: 'Name' }), str(req.body.subject, { max: 300 }) || '', str(req.body.body, { required: true, max: 20000, field: 'Text' })).lastInsertRowid)
  res.status(201).json(one('SELECT * FROM office_templates WHERE id = ?', id))
}))

r.patch('/apps/office/templates/:id', h(async (req, res) => {
  const sc = scope(req)
  const t = own('office_templates', sc, req.params.id)
  if (!canEdit(sc, t, 'user_id')) throw forbidden()
  run('UPDATE office_templates SET name = ?, subject = ?, body = ? WHERE id = ?', str(req.body.name, { max: 120 }) ?? t.name, req.body.subject !== undefined ? str(req.body.subject, { max: 300 }) || '' : t.subject, str(req.body.body, { max: 20000 }) ?? t.body, t.id)
  res.json(one('SELECT * FROM office_templates WHERE id = ?', t.id))
}))

r.delete('/apps/office/templates/:id', h(async (req, res) => {
  const sc = scope(req)
  const t = own('office_templates', sc, req.params.id)
  if (!canEdit(sc, t, 'user_id')) throw forbidden()
  run('DELETE FROM office_templates WHERE id = ?', t.id)
  res.json({ ok: true })
}))

r.post('/apps/office/letters/draft', h(async (req, res) => {
  const sc = scope(req)
  const instruction = str(req.body.instruction, { required: true, max: 3000, field: 'Auftrag' })
  consumeDaily(sc.userId, 'ai_messages')
  res.json({ body: await draftLetter({ instruction, recipient: str(req.body.recipient, { max: 1000 }), subject: str(req.body.subject, { max: 300 }), sender: sc.type === 'org' ? sc.orgName : req.user.name, current: str(req.body.current, { max: 20000 }) }) })
}))

export default r
