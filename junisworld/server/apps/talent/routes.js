import { Router } from 'express'
import fs from 'node:fs'
import crypto from 'node:crypto'
import multer from 'multer'
import { one, all, run, tx, parseJSON, UPLOAD_DIR } from '../../db.js'
import { h, str, int, oneOf, badRequest, notFound, forbidden } from '../../lib/http.js'
import { aiAvailable } from '../../lib/ai.js'
import { consumeDaily } from '../../lib/usage.js'
import { notify } from '../../lib/engine.js'
import { parseCv, planInterview, interviewFollowUp, evaluateInterview, structureProject } from './ai.js'
import {
  TYPES, SENIORITY, profileOut, projectOut, latestInterview, matchScore, matchProject, matchTalent, demandByDomain, talentCard,
} from './service.js'

const r = Router()
const uid = (req) => req.user.id
const MAX_FOLLOWUPS = 3

const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_q, _f, cb) => cb(null, crypto.randomBytes(16).toString('hex')) }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_q, f, cb) => (/^(application\/pdf|text\/plain)$/.test(f.mimetype) ? cb(null, true) : cb(Object.assign(new Error('Bitte den Lebenslauf als PDF oder Textdatei hochladen.'), { status: 415 }))),
})

const list = (v, max = 40, len = 120) => (Array.isArray(v) ? v.map((x) => String(x).trim().slice(0, len)).filter(Boolean).slice(0, max) : undefined)
const getProfile = (userId) => profileOut(one('SELECT * FROM talent_profiles WHERE user_id = ?', userId))
const interviewOut = (i) => i && ({ ...i, turns: parseJSON(i.turns, []), plan: undefined, total: parseJSON(i.plan, []).length, evaluation: parseJSON(i.evaluation, null) })

// =============== Talent side ===============

r.get('/apps/talent/me', h(async (req, res) => {
  const userId = uid(req)
  const profile = getProfile(userId)
  const current = one("SELECT * FROM talent_interviews WHERE user_id = ? AND status = 'in_progress' ORDER BY id DESC LIMIT 1", userId)
  const offers = all(`SELECT a.*, p.title, p.company, p.type, p.rate_min, p.rate_max, p.status AS project_status FROM talent_applications a JOIN talent_projects p ON p.id = a.project_id
    WHERE a.talent_id = ? ORDER BY a.updated_at DESC`, userId).map((a) => ({ ...a, detail: parseJSON(a.detail, null), typeLabel: TYPES[a.type] }))
  res.json({
    profile,
    interview: interviewOut(current) || interviewOut(latestInterview(userId)),
    offers,
    demand: demandByDomain(),
    aiAvailable: aiAvailable(),
    types: TYPES,
  })
}))

r.put('/apps/talent/profile', h(async (req, res) => {
  const b = req.body
  const cur = getProfile(uid(req)) || {}
  const skills = Array.isArray(b.skills) ? b.skills.slice(0, 60).map((s) => ({ name: String(s.name || '').trim().slice(0, 80), years: Math.max(0, Math.min(60, Number(s.years) || 0)) })).filter((s) => s.name) : cur.skills ?? []
  const clean = (arr, keys) => (Array.isArray(arr) ? arr.slice(0, 30).map((x) => Object.fromEntries(keys.map((k) => [k, String(x?.[k] ?? '').slice(0, 1000)]))) : null)
  const row = {
    headline: b.headline !== undefined ? str(b.headline, { max: 200 }) : cur.headline ?? null,
    summary: b.summary !== undefined ? str(b.summary, { max: 3000 }) : cur.summary ?? null,
    location: b.location !== undefined ? str(b.location, { max: 120 }) : cur.location ?? null,
    domains: JSON.stringify(list(b.domains, 15, 60) ?? cur.domains ?? []),
    skills: JSON.stringify(skills),
    experience: JSON.stringify(clean(b.experience, ['title', 'org', 'from', 'to', 'summary']) ?? cur.experience ?? []),
    education: JSON.stringify(clean(b.education, ['degree', 'institution', 'year']) ?? cur.education ?? []),
    languages: JSON.stringify(list(b.languages, 15, 40) ?? cur.languages ?? []),
    hourly_rate: b.hourlyRate !== undefined ? (b.hourlyRate === '' || b.hourlyRate === null ? null : Math.max(0, Number(b.hourlyRate))) : cur.hourly_rate ?? null,
    hours_per_week: b.hoursPerWeek !== undefined ? int(b.hoursPerWeek, { min: 1, max: 80 }) : cur.hours_per_week ?? null,
    availability: oneOf(b.availability, ['available', 'limited', 'unavailable'], { fallback: cur.availability ?? 'available' }),
    interests: JSON.stringify(list(b.interests, 15, 80) ?? cur.interests ?? []),
    in_pool: b.inPool !== undefined ? (b.inPool ? 1 : 0) : cur.in_pool ? 1 : 0,
    share_junis_skills: b.shareJunisSkills !== undefined ? (b.shareJunisSkills ? 1 : 0) : cur.share_junis_skills === false ? 0 : 1,
  }
  const cols = Object.keys(row)
  run(`INSERT INTO talent_profiles (user_id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})
       ON CONFLICT(user_id) DO UPDATE SET ${cols.map((c) => `${c} = excluded.${c}`).join(', ')}, updated_at = datetime('now')`, uid(req), ...cols.map((c) => row[c]))
  const created = matchTalent(uid(req))
  res.json({ ok: true, newMatches: created })
}))

r.post('/apps/talent/cv', upload.single('file'), h(async (req, res) => {
  const userId = uid(req)
  if (!req.file) throw badRequest('Bitte wähle eine Datei.')
  const text = req.file.mimetype === 'text/plain' ? fs.readFileSync(req.file.path, 'utf8').slice(0, 200000) : null
  const docId = Number(run('INSERT INTO documents (user_id, filename, mime, size, stored_name, text_content) VALUES (?, ?, ?, ?, ?, ?)', userId, req.file.originalname.slice(0, 200), req.file.mimetype, req.file.size, req.file.filename, text).lastInsertRowid)
  run("INSERT INTO talent_profiles (user_id, cv_document_id) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET cv_document_id = excluded.cv_document_id, updated_at = datetime('now')", userId, docId)
  if (!aiAvailable()) return res.json({ extracted: null, message: 'Lebenslauf gespeichert. Automatisches Auslesen braucht Junis AI — bitte Profil manuell ausfüllen.' })
  consumeDaily(userId, 'ai_messages')
  const extracted = await parseCv({ mime: req.file.mimetype, buffer: text ? null : fs.readFileSync(req.file.path), text })
  res.json({ extracted })
}))

r.delete('/apps/talent/profile', h(async (req, res) => {
  const userId = uid(req)
  tx(() => {
    run('DELETE FROM talent_applications WHERE talent_id = ?', userId)
    run('DELETE FROM talent_interviews WHERE user_id = ?', userId)
    run('DELETE FROM talent_profiles WHERE user_id = ?', userId)
  })
  res.json({ ok: true })
}))

// ---- Interview ----

r.post('/apps/talent/interview', h(async (req, res) => {
  const userId = uid(req)
  const profile = getProfile(userId)
  if (!profile?.headline || !profile.skills.length) throw badRequest('Bitte fülle zuerst dein Profil aus (mindestens Kurzbeschreibung und Skills).')
  const open = one("SELECT id FROM talent_interviews WHERE user_id = ? AND status = 'in_progress'", userId)
  if (open) return res.json({ id: open.id })
  const last = latestInterview(userId)
  if (last && Date.now() - new Date(`${last.completed_at.replace(' ', 'T')}Z`).getTime() < 7 * 864e5) throw badRequest('Ein neues Interview ist frühestens 7 Tage nach dem letzten möglich.')
  consumeDaily(userId, 'ai_messages')
  const plan = await planInterview(profile)
  const id = Number(run('INSERT INTO talent_interviews (user_id, plan, turns) VALUES (?, ?, ?)', userId, JSON.stringify(plan), JSON.stringify([{ q: plan[0].question, focus: plan[0].focus, a: null }])).lastInsertRowid)
  res.status(201).json({ id })
}))

function ownInterview(req) {
  const i = one('SELECT * FROM talent_interviews WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!i) throw notFound('Dieses Interview existiert nicht.')
  return i
}

r.get('/apps/talent/interview/:id', h(async (req, res) => res.json(interviewOut(ownInterview(req)))))

r.post('/apps/talent/interview/:id/answer', h(async (req, res) => {
  const userId = uid(req)
  const iv = ownInterview(req)
  if (iv.status !== 'in_progress') throw badRequest('Dieses Interview ist bereits abgeschlossen.')
  const answer = str(req.body.answer, { required: true, max: 8000, field: 'Antwort' })
  const plan = parseJSON(iv.plan, [])
  const turns = parseJSON(iv.turns, [])
  const cur = turns[turns.length - 1]
  cur.a = answer
  let followups = iv.followups
  let nextIndex = iv.next_index
  // Ask at most one follow-up per planned question, and at most MAX_FOLLOWUPS overall.
  if (!cur.followUp && followups < MAX_FOLLOWUPS && ['experience', 'domain', 'problem_solving'].includes(cur.focus)) {
    const f = await interviewFollowUp(cur.q, answer)
    if (f) {
      turns.push({ q: f, focus: cur.focus, a: null, followUp: true })
      followups++
    }
  }
  if (turns[turns.length - 1].a !== null) {
    nextIndex++
    if (nextIndex < plan.length) turns.push({ q: plan[nextIndex].question, focus: plan[nextIndex].focus, a: null })
  }
  const done = turns[turns.length - 1].a !== null
  run('UPDATE talent_interviews SET turns = ?, next_index = ?, followups = ? WHERE id = ?', JSON.stringify(turns), nextIndex, followups, iv.id)
  if (done) {
    const evaluation = await evaluateInterview(getProfile(userId), turns)
    run("UPDATE talent_interviews SET status = 'completed', evaluation = ?, completed_at = datetime('now') WHERE id = ?", JSON.stringify(evaluation), iv.id)
    matchTalent(userId)
  }
  res.json(interviewOut(one('SELECT * FROM talent_interviews WHERE id = ?', iv.id)))
}))

r.post('/apps/talent/interview/:id/abandon', h(async (req, res) => {
  const iv = ownInterview(req)
  if (iv.status === 'in_progress') run("UPDATE talent_interviews SET status = 'abandoned' WHERE id = ?", iv.id)
  res.json({ ok: true })
}))

// ---- Explore & offers ----

r.get('/apps/talent/explore', h(async (req, res) => {
  const userId = uid(req)
  const profile = getProfile(userId)
  const type = str(req.query.type, { max: 40 })
  const q = (str(req.query.q, { max: 100 }) || '').toLowerCase()
  let projects = all("SELECT * FROM talent_projects WHERE status = 'open' AND owner_id != ? ORDER BY created_at DESC", userId).map(projectOut)
  if (type) projects = projects.filter((p) => p.type === type)
  if (q) projects = projects.filter((p) => `${p.title} ${p.company} ${p.description} ${p.domains.join(' ')} ${p.skills.map((s) => s.name).join(' ')}`.toLowerCase().includes(q))
  const mine = new Map(all('SELECT project_id, status FROM talent_applications WHERE talent_id = ?', userId).map((a) => [a.project_id, a.status]))
  res.json({
    projects: projects.map((p) => ({ ...p, myStatus: mine.get(p.id) || null, match: profile ? matchScore(p, userId, profile) : null })),
    types: TYPES,
  })
}))

r.post('/apps/talent/projects/:id/interest', h(async (req, res) => {
  const userId = uid(req)
  const project = one("SELECT * FROM talent_projects WHERE id = ? AND status = 'open'", Number(req.params.id))
  if (!project) throw notFound('Dieses Projekt ist nicht mehr offen.')
  if (project.owner_id === userId) throw badRequest('Das ist dein eigenes Projekt.')
  const profile = getProfile(userId)
  if (!profile?.headline) throw badRequest('Lege zuerst dein Talent-Profil an.')
  const motivation = str(req.body.motivation, { max: 2000 })
  const m = matchScore(projectOut(project), userId, profile)
  run(`INSERT INTO talent_applications (project_id, talent_id, source, status, score, detail, motivation) VALUES (?, ?, 'interest', 'interested', ?, ?, ?)
       ON CONFLICT(project_id, talent_id) DO UPDATE SET status = CASE WHEN status IN ('matched', 'declined') THEN 'interested' ELSE status END, motivation = excluded.motivation, updated_at = datetime('now')`,
  project.id, userId, m.score, JSON.stringify(m.detail), motivation)
  notify(project.owner_id, 'talent', `Ein Talent hat Interesse an „${project.title}“ signalisiert.`, { link: `/apps/talent/projects/${project.id}`, dedupeKey: `talent-interest:${project.id}:${userId}` })
  res.json({ ok: true })
}))

r.post('/apps/talent/applications/:id/respond', h(async (req, res) => {
  const a = one('SELECT a.*, p.owner_id, p.title FROM talent_applications a JOIN talent_projects p ON p.id = a.project_id WHERE a.id = ? AND a.talent_id = ?', Number(req.params.id), uid(req))
  if (!a) throw notFound()
  const decision = oneOf(req.body.decision, ['accept', 'decline'], { field: 'Entscheidung' })
  if (a.status !== 'invited' && decision === 'accept') throw badRequest('Du kannst nur Einladungen annehmen.')
  run("UPDATE talent_applications SET status = ?, updated_at = datetime('now') WHERE id = ?", decision === 'accept' ? 'accepted' : 'declined', a.id)
  notify(a.owner_id, 'talent', decision === 'accept' ? `Einladung zu „${a.title}“ angenommen — Kontaktdaten sind jetzt sichtbar.` : `Ein Talent hat „${a.title}“ abgelehnt.`, { link: `/apps/talent/projects/${a.project_id}`, dedupeKey: `talent-respond:${a.id}:${decision}` })
  res.json({ ok: true })
}))

// =============== Company side ===============

r.get('/apps/talent/company', h(async (req, res) => {
  const projects = all('SELECT * FROM talent_projects WHERE owner_id = ? ORDER BY created_at DESC', uid(req)).map((p) => ({
    ...projectOut(p),
    counts: Object.fromEntries(all('SELECT status, COUNT(*) AS n FROM talent_applications WHERE project_id = ? GROUP BY status', p.id).map((x) => [x.status, x.n])),
  }))
  res.json({ projects, types: TYPES, seniority: SENIORITY, aiAvailable: aiAvailable(), poolSize: one('SELECT COUNT(*) AS n FROM talent_profiles WHERE in_pool = 1').n })
}))

r.post('/apps/talent/company/structure', h(async (req, res) => {
  const description = str(req.body.description, { required: true, max: 8000, field: 'Beschreibung' })
  consumeDaily(uid(req), 'ai_messages')
  res.json(await structureProject(description))
}))

function readProject(b, cur = {}) {
  const skills = Array.isArray(b.skills) ? b.skills.slice(0, 30).map((s) => ({ name: String(s.name || '').trim().slice(0, 80), importance: s.importance === 'nice' ? 'nice' : 'must' })).filter((s) => s.name) : null
  const num = (v, c) => (v === undefined ? c ?? null : v === '' || v === null ? null : Math.max(0, Number(v)))
  return {
    company: str(b.company, { max: 120, field: 'Unternehmen' }) ?? cur.company,
    title: str(b.title, { max: 160, field: 'Titel' }) ?? cur.title,
    description: b.description !== undefined ? str(b.description, { max: 8000 }) || '' : cur.description ?? '',
    type: oneOf(b.type, Object.keys(TYPES), { fallback: cur.type ?? 'freelance' }),
    domains: JSON.stringify(list(b.domains, 10, 60) ?? cur.domains ?? []),
    skills: JSON.stringify(skills ?? cur.skills ?? []),
    seniority: oneOf(b.seniority, Object.keys(SENIORITY), { fallback: cur.seniority ?? 'mid' }),
    languages: JSON.stringify(list(b.languages, 10, 40) ?? cur.languages ?? []),
    rate_min: num(b.rateMin, cur.rate_min),
    rate_max: num(b.rateMax, cur.rate_max),
    hours_per_week: b.hoursPerWeek !== undefined ? int(b.hoursPerWeek, { min: 1, max: 80 }) : cur.hours_per_week ?? null,
    remote: b.remote !== undefined ? (b.remote ? 1 : 0) : cur.remote ?? 1,
    status: oneOf(b.status, ['open', 'closed'], { fallback: cur.status ?? 'open' }),
  }
}

r.post('/apps/talent/company/projects', h(async (req, res) => {
  const p = readProject(req.body)
  if (!p.company || !p.title) throw badRequest('Unternehmen und Titel sind Pflichtfelder.')
  const cols = Object.keys(p)
  const id = Number(run(`INSERT INTO talent_projects (owner_id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`, uid(req), ...cols.map((c) => p[c])).lastInsertRowid)
  const matches = matchProject(one('SELECT * FROM talent_projects WHERE id = ?', id))
  res.status(201).json({ id, matches })
}))

function ownProject(req, id = req.params.id) {
  const p = one('SELECT * FROM talent_projects WHERE id = ?', Number(id))
  if (!p) throw notFound('Dieses Projekt existiert nicht.')
  if (p.owner_id !== uid(req)) throw forbidden('Nur das ausschreibende Unternehmen sieht die Kandidaten.')
  return p
}

const REVEALED = new Set(['accepted', 'shortlisted', 'hired'])
const STATUS_ORDER = { interested: 0, invited: 1, accepted: 2, shortlisted: 3, hired: 4, matched: 5, declined: 6, rejected: 7 }

r.get('/apps/talent/projects/:id', h(async (req, res) => {
  const p = ownProject(req)
  const cards = all('SELECT * FROM talent_applications WHERE project_id = ?', p.id)
    .map((a) => talentCard(a, REVEALED.has(a.status)))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  res.json({ ...projectOut(p), candidates: cards, types: TYPES, seniority: SENIORITY })
}))

r.patch('/apps/talent/projects/:id', h(async (req, res) => {
  const cur = projectOut(ownProject(req))
  const p = readProject(req.body, { ...cur, domains: cur.domains, skills: cur.skills, languages: cur.languages })
  const cols = Object.keys(p)
  run(`UPDATE talent_projects SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, ...cols.map((c) => p[c]), cur.id)
  const row = one('SELECT * FROM talent_projects WHERE id = ?', cur.id)
  // Refresh scores of existing candidates and find new ones.
  for (const a of all('SELECT * FROM talent_applications WHERE project_id = ?', cur.id)) {
    const prof = profileOut(one('SELECT * FROM talent_profiles WHERE user_id = ?', a.talent_id))
    if (prof) {
      const m = matchScore(projectOut(row), a.talent_id, prof)
      run('UPDATE talent_applications SET score = ?, detail = ? WHERE id = ?', m.score, JSON.stringify(m.detail), a.id)
    }
  }
  res.json({ ok: true, matches: matchProject(row) })
}))

r.delete('/apps/talent/projects/:id', h(async (req, res) => {
  const p = ownProject(req)
  run('DELETE FROM talent_projects WHERE id = ?', p.id)
  res.json({ ok: true })
}))

r.patch('/apps/talent/applications/:id', h(async (req, res) => {
  const a = one('SELECT a.*, p.owner_id, p.title, p.company FROM talent_applications a JOIN talent_projects p ON p.id = a.project_id WHERE a.id = ?', Number(req.params.id))
  if (!a || a.owner_id !== uid(req)) throw notFound()
  const status = oneOf(req.body.status, ['invited', 'shortlisted', 'rejected', 'hired', 'matched'], { fallback: a.status })
  if (status === 'hired' && !REVEALED.has(a.status) && a.status !== 'shortlisted') throw badRequest('Eine Zusage ist erst möglich, nachdem das Talent die Einladung angenommen hat.')
  if (status === 'shortlisted' && !REVEALED.has(a.status)) throw badRequest('Lade das Talent zuerst ein; nach Annahme kannst du es auf die Shortlist setzen.')
  run("UPDATE talent_applications SET status = ?, company_note = ?, updated_at = datetime('now') WHERE id = ?", status, req.body.note !== undefined ? str(req.body.note, { max: 2000 }) : a.company_note, a.id)
  const msg = {
    invited: `${a.company} lädt dich zu „${a.title}“ ein.${req.body.message ? ` Nachricht: ${String(req.body.message).slice(0, 300)}` : ''}`,
    hired: `Zusage: ${a.company} möchte mit dir an „${a.title}“ arbeiten.`,
    rejected: `${a.company} hat sich bei „${a.title}“ für andere Profile entschieden. Dein Profil bleibt im Pool für weitere Projekte.`,
  }[status]
  if (msg && status !== a.status && (status !== 'rejected' || ['interested', 'invited', 'accepted', 'shortlisted'].includes(a.status))) {
    notify(a.talent_id, 'talent', msg, { link: '/apps/talent?tab=offers', dedupeKey: `talent-status:${a.id}:${status}` })
  }
  res.json({ ok: true })
}))

export default r
