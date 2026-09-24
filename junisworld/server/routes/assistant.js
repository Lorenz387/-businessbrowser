import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import multer from 'multer'
import { one, all, run, UPLOAD_DIR, parseJSON } from '../db.js'
import { h, str, int, oneOf, badRequest, notFound } from '../lib/http.js'
import { entitlements, requireFeature } from '../lib/auth.js'
import { chat, analyzeDocument, research, aiAvailable } from '../lib/ai.js'
import { consumeDaily, spendCredits, refundCredits, creditBalance } from '../lib/usage.js'
import { CREDIT_COSTS, FEATURE_LABELS } from '../lib/plans.js'
import { logActivity } from '../lib/engine.js'

const r = Router()
const uid = (req) => req.user.id

// ---------------- Conversations / Junis AI ----------------

/** Keyword retrieval over the user's knowledge library and analysed documents. */
function searchKnowledge(userId, text, limit = 4) {
  const words = [...new Set(String(text).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || [])].slice(0, 8)
  if (!words.length) return []
  const scored = new Map()
  for (const w of words) {
    const like = `%${w}%`
    for (const k of all('SELECT id, title, content FROM knowledge_items WHERE user_id = ? AND (lower(title) LIKE ? OR lower(content) LIKE ?) LIMIT 20', userId, like, like)) {
      const key = `k${k.id}`
      scored.set(key, { title: k.title, content: k.content, score: (scored.get(key)?.score || 0) + 1 })
    }
    for (const d of all("SELECT id, filename, COALESCE(summary, text_content, '') AS content FROM documents WHERE user_id = ? AND (lower(filename) LIKE ? OR lower(summary) LIKE ? OR lower(text_content) LIKE ?) LIMIT 20", userId, like, like, like)) {
      const key = `d${d.id}`
      scored.set(key, { title: `Dokument: ${d.filename}`, content: d.content, score: (scored.get(key)?.score || 0) + 1 })
    }
  }
  return [...scored.values()].sort((a, b) => b.score - a.score).slice(0, limit)
}

r.get('/conversations', h(async (req, res) => {
  res.json({
    conversations: all('SELECT id, title, context_type, context_id, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100', uid(req)),
    aiAvailable: aiAvailable(),
  })
}))

r.get('/conversations/:id', h(async (req, res) => {
  const c = one('SELECT * FROM conversations WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!c) throw notFound('Dieses Gespräch existiert nicht.')
  res.json({ ...c, messages: all('SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id', c.id) })
}))

r.delete('/conversations/:id', h(async (req, res) => {
  run('DELETE FROM conversations WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  res.json({ ok: true })
}))

/**
 * Send a message to Junis. Creates a conversation if none is given.
 * pageContext: short description of what the user is looking at (project, lesson, skill…).
 */
r.post('/chat', h(async (req, res) => {
  const userId = uid(req)
  const message = str(req.body.message, { required: true, max: 12000, field: 'Nachricht' })
  const contextType = oneOf(req.body.contextType, ['general', 'project', 'lesson', 'skill', 'goal', 'mission', 'career', 'knowledge'], { fallback: 'general' })
  const contextId = req.body.contextId != null ? String(req.body.contextId).slice(0, 80) : null
  const pageContext = buildPageContext(userId, contextType, contextId)
  let conv = req.body.conversationId ? one('SELECT * FROM conversations WHERE id = ? AND user_id = ?', Number(req.body.conversationId), userId) : null
  if (req.body.conversationId && !conv) throw notFound('Dieses Gespräch existiert nicht.')
  consumeDaily(userId, 'ai_messages')
  if (!conv) {
    const title = message.length > 60 ? `${message.slice(0, 57)}…` : message
    const c = run('INSERT INTO conversations (user_id, title, context_type, context_id) VALUES (?, ?, ?, ?)', userId, title, contextType, contextId)
    conv = one('SELECT * FROM conversations WHERE id = ?', Number(c.lastInsertRowid))
  }
  const history = all('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 30', conv.id).reverse()
  history.push({ role: 'user', content: message })
  const knowledge = searchKnowledge(userId, message)
  const reply = await chat(userId, history, { pageContext, knowledge })
  run("INSERT INTO messages (conversation_id, role, content) VALUES (?, 'user', ?)", conv.id, message)
  run("INSERT INTO messages (conversation_id, role, content) VALUES (?, 'assistant', ?)", conv.id, reply)
  run("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?", conv.id)
  res.json({ conversationId: conv.id, reply, usedKnowledge: knowledge.map((k) => k.title) })
}))

function buildPageContext(userId, type, id) {
  if (!id) return null
  if (type === 'project') {
    const p = one('SELECT * FROM projects WHERE id = ? AND user_id = ?', Number(id), userId)
    if (!p) return null
    const tasks = all('SELECT title, status FROM project_tasks WHERE project_id = ? ORDER BY position', p.id)
    return `Projekt „${p.title}“. Ziel: ${p.objective || '-'}. Beschreibung: ${p.description || '-'}. Aufgaben: ${tasks.map((t) => `${t.status === 'done' ? '✓' : '○'} ${t.title}`).join('; ')}`
  }
  if (type === 'lesson') {
    const l = one('SELECT * FROM lessons WHERE id = ? AND user_id = ?', Number(id), userId)
    if (!l) return null
    const c = parseJSON(l.content, {})
    return `Lektion „${l.title}“. Inhalt:\n${(c.sections || []).map((s) => `## ${s.heading}\n${s.body}`).join('\n').slice(0, 8000)}`
  }
  if (type === 'skill') return `Skill-Seite: ${id}. Der Nutzer möchte diesen Skill verbessern.`
  if (type === 'goal') {
    const g = one('SELECT * FROM goals WHERE id = ? AND user_id = ?', Number(id), userId)
    return g ? `Ziel „${g.title}“. Zielzustand: ${g.target_state || '-'}.` : null
  }
  if (type === 'mission') return `Mission: ${id}.`
  if (type === 'career') return `Karrierepfad: ${id}.`
  return null
}

// ---------------- Memory ----------------

r.get('/memory', h(async (req, res) => {
  const userId = uid(req)
  res.json({
    memories: all('SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC', userId),
    active: entitlements(userId).flags.memory,
  })
}))

r.post('/memory', h(async (req, res) => {
  const kind = str(req.body.kind, { max: 60 }) || 'Notiz'
  const content = str(req.body.content, { required: true, max: 1000, field: 'Inhalt' })
  run("INSERT INTO memories (user_id, kind, content, source) VALUES (?, ?, ?, 'user')", uid(req), kind, content)
  res.status(201).json({ ok: true })
}))

r.patch('/memory/:id', h(async (req, res) => {
  const m = one('SELECT * FROM memories WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!m) throw notFound()
  run('UPDATE memories SET content = ?, kind = ? WHERE id = ?', str(req.body.content, { required: true, max: 1000, field: 'Inhalt' }), str(req.body.kind, { max: 60 }) || m.kind, m.id)
  res.json({ ok: true })
}))

r.delete('/memory/:id', h(async (req, res) => {
  run('DELETE FROM memories WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  res.json({ ok: true })
}))

r.delete('/memory', h(async (req, res) => {
  run('DELETE FROM memories WHERE user_id = ?', uid(req))
  res.json({ ok: true })
}))

// ---------------- Knowledge ----------------

r.get('/knowledge', h(async (req, res) => {
  const userId = uid(req)
  const q = str(req.query.q, { max: 200 })
  const type = str(req.query.type, { max: 20 })
  let items = all('SELECT * FROM knowledge_items WHERE user_id = ? ORDER BY updated_at DESC', userId)
  if (type) items = items.filter((i) => i.type === type)
  if (q) items = items.filter((i) => `${i.title} ${i.content} ${i.tags}`.toLowerCase().includes(q.toLowerCase()))
  res.json({
    items,
    documents: all('SELECT id, filename, mime, size, project_id, created_at, summary IS NOT NULL AS analyzed FROM documents WHERE user_id = ? ORDER BY created_at DESC', userId),
    documentsEnabled: entitlements(userId).flags.documents,
  })
}))

const KNOWLEDGE_TYPES = ['note', 'summary', 'source', 'link']

r.post('/knowledge', h(async (req, res) => {
  const b = req.body
  const r2 = run('INSERT INTO knowledge_items (user_id, type, title, content, url, tags) VALUES (?, ?, ?, ?, ?, ?)',
    uid(req), oneOf(b.type, KNOWLEDGE_TYPES, { fallback: 'note' }), str(b.title, { required: true, max: 200, field: 'Titel' }),
    str(b.content, { max: 50000 }) || '', str(b.url, { max: 500 }), str(b.tags, { max: 300 }) || '')
  res.status(201).json({ id: Number(r2.lastInsertRowid) })
}))

r.get('/knowledge/:id', h(async (req, res) => {
  const k = one('SELECT * FROM knowledge_items WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!k) throw notFound('Dieser Eintrag existiert nicht.')
  res.json(k)
}))

r.patch('/knowledge/:id', h(async (req, res) => {
  const k = one('SELECT * FROM knowledge_items WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!k) throw notFound()
  const b = req.body
  run("UPDATE knowledge_items SET type = ?, title = ?, content = ?, url = ?, tags = ?, updated_at = datetime('now') WHERE id = ?",
    oneOf(b.type, KNOWLEDGE_TYPES, { fallback: k.type }), str(b.title, { max: 200 }) ?? k.title,
    b.content !== undefined ? str(b.content, { max: 50000 }) || '' : k.content,
    b.url !== undefined ? str(b.url, { max: 500 }) : k.url, b.tags !== undefined ? str(b.tags, { max: 300 }) || '' : k.tags, k.id)
  res.json({ ok: true })
}))

r.delete('/knowledge/:id', h(async (req, res) => {
  run('DELETE FROM knowledge_items WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  res.json({ ok: true })
}))

// ---------------- Documents ----------------

const MAX_UPLOAD = 20 * 1024 * 1024
const ALLOWED = /^(application\/pdf|image\/(png|jpeg|gif|webp)|text\/(plain|markdown|csv)|application\/json)$/
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, _file, cb) => cb(null, crypto.randomBytes(16).toString('hex')),
  }),
  limits: { fileSize: MAX_UPLOAD, files: 1 },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype === 'text/x-markdown' ? 'text/markdown' : file.mimetype
    if (ALLOWED.test(mime) || /\.(md|txt|csv|json)$/i.test(file.originalname)) cb(null, true)
    else cb(Object.assign(new Error('Dieser Dateityp wird nicht unterstützt. Erlaubt: PDF, PNG, JPG, GIF, WebP, TXT, MD, CSV, JSON.'), { status: 415, code: 'unsupported' }))
  },
})

const isText = (mime, name) => mime.startsWith('text/') || mime === 'application/json' || /\.(md|txt|csv|json)$/i.test(name)

r.post('/documents', upload.single('file'), h(async (req, res) => {
  const userId = uid(req)
  if (!req.file) throw badRequest('Bitte wähle eine Datei aus.')
  const projectId = int(req.body.projectId)
  if (projectId && !one('SELECT 1 FROM projects WHERE id = ? AND user_id = ?', projectId, userId)) {
    fs.rmSync(req.file.path, { force: true })
    throw badRequest('Unbekanntes Projekt.')
  }
  const mime = isText(req.file.mimetype, req.file.originalname) && !/^text\/|json/.test(req.file.mimetype) ? 'text/plain' : req.file.mimetype
  const text = isText(mime, req.file.originalname) ? fs.readFileSync(req.file.path, 'utf8').slice(0, 500000) : null
  const r2 = run('INSERT INTO documents (user_id, project_id, filename, mime, size, stored_name, text_content) VALUES (?, ?, ?, ?, ?, ?, ?)',
    userId, projectId, req.file.originalname.slice(0, 200), mime, req.file.size, req.file.filename, text)
  logActivity(userId, 'document_uploaded', req.file.originalname)
  res.status(201).json({ id: Number(r2.lastInsertRowid) })
}))

function ownDoc(req) {
  const d = one('SELECT * FROM documents WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!d) throw notFound('Dieses Dokument existiert nicht.')
  return d
}

r.get('/documents/:id', h(async (req, res) => {
  const d = ownDoc(req)
  res.json({ id: d.id, filename: d.filename, mime: d.mime, size: d.size, projectId: d.project_id, summary: d.summary, hasText: !!d.text_content, createdAt: d.created_at })
}))

r.get('/documents/:id/file', h(async (req, res) => {
  const d = ownDoc(req)
  res.setHeader('Content-Type', d.mime)
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(d.filename)}`)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.sendFile(path.join(UPLOAD_DIR, d.stored_name))
}))

r.post('/documents/:id/analyze', h(async (req, res) => {
  const userId = uid(req)
  requireFeature(userId, 'documents', FEATURE_LABELS.documents)
  const d = ownDoc(req)
  const large = d.size > 2 * 1024 * 1024 || (d.text_content?.length ?? 0) > 150000
  if (large) spendCredits(userId, CREDIT_COSTS.document_large, 'document_large')
  else consumeDaily(userId, 'ai_messages')
  try {
    const buffer = d.text_content ? null : fs.readFileSync(path.join(UPLOAD_DIR, d.stored_name))
    const summary = await analyzeDocument({ filename: d.filename, mime: d.mime, buffer, text: d.text_content, question: str(req.body.question, { max: 2000 }) })
    if (!req.body.question) run('UPDATE documents SET summary = ? WHERE id = ?', summary, d.id)
    res.json({ summary, creditsUsed: large ? CREDIT_COSTS.document_large : 0 })
  } catch (e) {
    if (large) refundCredits(userId, CREDIT_COSTS.document_large, 'document_large')
    throw e
  }
}))

r.post('/documents/:id/to-knowledge', h(async (req, res) => {
  const d = ownDoc(req)
  if (!d.summary) throw badRequest('Analysiere das Dokument zuerst.')
  const r2 = run("INSERT INTO knowledge_items (user_id, type, title, content, tags) VALUES (?, 'summary', ?, ?, 'dokument')", uid(req), `Zusammenfassung: ${d.filename}`, d.summary)
  res.status(201).json({ id: Number(r2.lastInsertRowid) })
}))

r.delete('/documents/:id', h(async (req, res) => {
  const d = ownDoc(req)
  fs.rmSync(path.join(UPLOAD_DIR, d.stored_name), { force: true })
  run('DELETE FROM documents WHERE id = ?', d.id)
  res.json({ ok: true })
}))

// ---------------- Research ----------------

r.get('/research', h(async (req, res) => {
  const userId = uid(req)
  const plan = entitlements(userId)
  res.json({
    reports: all('SELECT id, question, depth, created_at FROM research_reports WHERE user_id = ? ORDER BY created_at DESC', userId),
    enabled: plan.flags.research,
    credits: creditBalance(userId),
    costs: { standard: CREDIT_COSTS.research_standard, deep: CREDIT_COSTS.research_deep },
    aiAvailable: aiAvailable(),
  })
}))

r.get('/research/:id', h(async (req, res) => {
  const rep = one('SELECT * FROM research_reports WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!rep) throw notFound('Dieser Bericht existiert nicht.')
  res.json({ ...rep, sources: parseJSON(rep.sources, []) })
}))

r.post('/research', h(async (req, res) => {
  const userId = uid(req)
  requireFeature(userId, 'research', FEATURE_LABELS.research)
  const question = str(req.body.question, { required: true, max: 2000, field: 'Forschungsfrage' })
  const depth = oneOf(req.body.depth, ['standard', 'deep'], { fallback: 'standard' })
  const cost = depth === 'deep' ? CREDIT_COSTS.research_deep : CREDIT_COSTS.research_standard
  spendCredits(userId, cost, `research_${depth}`)
  try {
    const out = await research(userId, { question, depth })
    const r2 = run('INSERT INTO research_reports (user_id, question, depth, report, sources) VALUES (?, ?, ?, ?, ?)', userId, question, depth, out.report, JSON.stringify(out.sources))
    logActivity(userId, 'research', question)
    res.status(201).json({ id: Number(r2.lastInsertRowid), creditsUsed: cost })
  } catch (e) {
    refundCredits(userId, cost, `research_${depth}`)
    throw e
  }
}))

r.post('/research/:id/to-knowledge', h(async (req, res) => {
  const rep = one('SELECT * FROM research_reports WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!rep) throw notFound()
  const sources = parseJSON(rep.sources, []).filter((s) => s.cited)
  const content = `${rep.report}\n\n## Quellen\n${sources.map((s) => `- [${s.title}](${s.url})`).join('\n')}`
  const r2 = run("INSERT INTO knowledge_items (user_id, type, title, content, tags) VALUES (?, 'summary', ?, ?, 'research')", uid(req), `Research: ${rep.question.slice(0, 150)}`, content)
  res.status(201).json({ id: Number(r2.lastInsertRowid) })
}))

r.delete('/research/:id', h(async (req, res) => {
  run('DELETE FROM research_reports WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  res.json({ ok: true })
}))

export default r
