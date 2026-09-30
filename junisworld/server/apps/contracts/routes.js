import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import multer from 'multer'
import { one, all, run, UPLOAD_DIR } from '../../db.js'
import { h, str, int, oneOf, badRequest, notFound } from '../../lib/http.js'
import { aiAvailable, extractContract } from '../../lib/ai.js'
import { consumeDaily } from '../../lib/usage.js'
import { CATEGORIES, contractOut, icsFor } from './service.js'

const r = Router()
const uid = (req) => req.user.id
const DATE = /^\d{4}-\d{2}-\d{2}$/

const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_q, _f, cb) => cb(null, crypto.randomBytes(16).toString('hex')) }),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_q, f, cb) => (/^(application\/pdf|image\/(png|jpeg|gif|webp)|text\/plain)$/.test(f.mimetype) ? cb(null, true)
    : cb(Object.assign(new Error('Bitte lade eine PDF-, Bild- oder Textdatei hoch.'), { status: 415 }))),
})

function readFields(b, cur = {}) {
  const date = (v, field) => {
    if (v === undefined) return cur[field] ?? null
    if (!v) return null
    if (!DATE.test(v)) throw badRequest('Datum im Format JJJJ-MM-TT angeben.')
    return v
  }
  const num = (v, curV) => (v === undefined ? curV ?? null : v === '' || v === null ? null : Number(v))
  return {
    title: str(b.title, { max: 200, field: 'Titel' }) ?? cur.title,
    counterparty: b.counterparty !== undefined ? str(b.counterparty, { max: 200 }) : cur.counterparty ?? null,
    category: oneOf(b.category, Object.keys(CATEGORIES), { fallback: cur.category ?? 'sonstiges' }),
    start_date: date(b.startDate, 'start_date'),
    term_end: date(b.termEnd, 'term_end'),
    notice_value: b.noticeValue !== undefined ? int(b.noticeValue, { min: 0, max: 3650 }) : cur.notice_value ?? null,
    notice_unit: oneOf(b.noticeUnit, ['days', 'weeks', 'months'], { fallback: cur.notice_unit ?? 'months' }),
    auto_renew: b.autoRenew !== undefined ? (b.autoRenew ? 1 : 0) : cur.auto_renew ?? 1,
    renewal_months: int(b.renewalMonths, { min: 0, max: 120, fallback: cur.renewal_months ?? 12 }),
    cost_amount: num(b.costAmount, cur.cost_amount),
    cost_interval: oneOf(b.costInterval, ['monthly', 'quarterly', 'yearly', 'once'], { fallback: cur.cost_interval ?? 'monthly' }),
    owner: b.owner !== undefined ? str(b.owner, { max: 120 }) : cur.owner ?? null,
    notes: b.notes !== undefined ? str(b.notes, { max: 5000 }) : cur.notes ?? null,
    status: oneOf(b.status, ['active', 'cancelled', 'ended'], { fallback: cur.status ?? 'active' }),
    reminder_days: Array.isArray(b.reminderDays) ? JSON.stringify([...new Set(b.reminderDays.map(Number).filter((x) => x > 0 && x <= 365))].sort((a, c) => c - a)) : cur.reminder_days ?? '[90,30,7]',
  }
}

r.get('/apps/contracts', h(async (req, res) => {
  const contracts = all('SELECT * FROM contracts WHERE user_id = ? ORDER BY created_at DESC', uid(req)).map(contractOut)
  const active = contracts.filter((c) => c.status === 'active')
  res.json({
    contracts: contracts.sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9)),
    summary: {
      active: active.length,
      urgent: active.filter((c) => c.urgency === 'urgent').length,
      soon: active.filter((c) => c.urgency === 'soon').length,
      incomplete: active.filter((c) => c.urgency === 'incomplete').length,
      annualCost: active.reduce((a, c) => a + (c.annualCost || 0), 0),
    },
    categories: CATEGORIES,
    aiAvailable: aiAvailable(),
    slackConfigured: !!one('SELECT slack_webhook FROM contract_settings WHERE user_id = ? AND slack_webhook IS NOT NULL', uid(req)),
  })
}))

r.post('/apps/contracts', h(async (req, res) => {
  const f = readFields(req.body)
  if (!f.title) throw badRequest('Bitte gib einen Titel an.')
  const cols = Object.keys(f)
  const id = Number(run(`INSERT INTO contracts (user_id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`, uid(req), ...cols.map((k) => f[k])).lastInsertRowid)
  res.status(201).json({ id })
}))

/** Upload a contract document; with Junis AI the terms are extracted as a suggestion. */
r.post('/apps/contracts/upload', upload.single('file'), h(async (req, res) => {
  const userId = uid(req)
  if (!req.file) throw badRequest('Bitte wähle eine Datei.')
  const text = req.file.mimetype === 'text/plain' ? fs.readFileSync(req.file.path, 'utf8').slice(0, 300000) : null
  const docId = Number(run('INSERT INTO documents (user_id, filename, mime, size, stored_name, text_content) VALUES (?, ?, ?, ?, ?, ?)',
    userId, req.file.originalname.slice(0, 200), req.file.mimetype, req.file.size, req.file.filename, text).lastInsertRowid)
  const title = req.file.originalname.replace(/\.[^.]+$/, '').slice(0, 200)
  const id = Number(run('INSERT INTO contracts (user_id, title, document_id) VALUES (?, ?, ?)', userId, title, docId).lastInsertRowid)
  res.status(201).json({ id })
}))

function ownContract(req) {
  const c = one('SELECT * FROM contracts WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!c) throw notFound('Dieser Vertrag existiert nicht.')
  return c
}

r.get('/apps/contracts/:id', h(async (req, res) => {
  const c = ownContract(req)
  const doc = c.document_id ? one('SELECT id, filename, mime, size FROM documents WHERE id = ?', c.document_id) : null
  res.json({ ...contractOut(c), document: doc, categories: CATEGORIES, aiAvailable: aiAvailable() })
}))

r.post('/apps/contracts/:id/extract', h(async (req, res) => {
  const c = ownContract(req)
  const doc = c.document_id ? one('SELECT * FROM documents WHERE id = ?', c.document_id) : null
  if (!doc) throw badRequest('Zu diesem Vertrag ist kein Dokument hinterlegt.')
  consumeDaily(uid(req), 'ai_messages')
  const buffer = doc.text_content ? null : fs.readFileSync(path.join(UPLOAD_DIR, doc.stored_name))
  const out = await extractContract({ filename: doc.filename, mime: doc.mime, buffer, text: doc.text_content })
  run("UPDATE contracts SET extraction = ?, updated_at = datetime('now') WHERE id = ?", JSON.stringify(out), c.id)
  res.json({ extraction: out })
}))

r.patch('/apps/contracts/:id', h(async (req, res) => {
  const c = ownContract(req)
  const f = readFields(req.body, c)
  const cols = Object.keys(f)
  run(`UPDATE contracts SET ${cols.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`, ...cols.map((k) => f[k]), c.id)
  res.json({ ok: true })
}))

r.delete('/apps/contracts/:id', h(async (req, res) => {
  const c = ownContract(req)
  run('DELETE FROM contracts WHERE id = ?', c.id)
  res.json({ ok: true })
}))

r.put('/apps/contracts-settings', h(async (req, res) => {
  const hook = str(req.body.slackWebhook, { max: 500 })
  if (hook && !hook.startsWith('https://hooks.slack.com/')) throw badRequest('Bitte eine Slack-Incoming-Webhook-URL (https://hooks.slack.com/…) eingeben.')
  run('INSERT INTO contract_settings (user_id, slack_webhook) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET slack_webhook = excluded.slack_webhook', uid(req), hook)
  res.json({ ok: true })
}))

r.post('/apps/contracts-settings/test', h(async (req, res) => {
  const s = one('SELECT slack_webhook FROM contract_settings WHERE user_id = ?', uid(req))
  if (!s?.slack_webhook) throw badRequest('Es ist keine Slack-Webhook-URL gespeichert.')
  const ok = await fetch(s.slack_webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Testnachricht vom JunisWorld Fristen-Manager.' }), signal: AbortSignal.timeout(10000) }).then((x) => x.ok).catch(() => false)
  if (!ok) throw badRequest('Slack hat die Nachricht nicht angenommen. Prüfe die Webhook-URL.')
  res.json({ ok: true })
}))

r.get('/apps/contracts-calendar.ics', h(async (req, res) => {
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="kuendigungsfristen.ics"')
  res.send(icsFor(uid(req)))
}))

export default r
