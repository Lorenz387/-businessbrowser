import { Router } from 'express'
import { one, all, run, tx, parseJSON } from '../db.js'
import { h, str, int, oneOf, badRequest, notFound, forbidden, ApiError } from '../lib/http.js'
import { PLANS } from '../lib/plans.js'
import { getStripe, priceId, appUrl } from '../lib/billing.js'
import * as E from '../lib/engine.js'
import { getCatalogSkill, CATEGORIES } from '../lib/catalog.js'
import { createGoal } from '../lib/goals.js'
import { structureCreatorItem } from '../lib/ai.js'

const r = Router()
const uid = (req) => req.user.id
const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', manager: 'Manager', member: 'Team Member' }

function membership(req, orgId = req.params.id) {
  const m = one(
    'SELECT m.*, o.name, o.kind, o.plan, o.seats FROM org_members m JOIN organizations o ON o.id = m.org_id WHERE m.org_id = ? AND m.user_id = ?',
    Number(orgId), uid(req),
  )
  if (!m) throw notFound('Diese Organisation existiert nicht oder du bist kein Mitglied.')
  return m
}
const can = (m, ...roles) => roles.includes(m.role)
function requireRole(m, ...roles) {
  if (!can(m, ...roles)) throw forbidden(`Diese Aktion ist nur für ${roles.map((x) => ROLE_LABELS[x]).join(', ')} erlaubt.`)
}

// ---------------- Organizations ----------------

r.get('/orgs', h(async (req, res) => {
  const orgs = all(
    'SELECT o.id, o.name, o.kind, o.plan, o.seats, m.role, (SELECT COUNT(*) FROM org_members x WHERE x.org_id = o.id) AS members FROM org_members m JOIN organizations o ON o.id = m.org_id WHERE m.user_id = ?',
    uid(req),
  )
  const invites = all(
    'SELECT i.id, i.role, o.name, o.kind FROM org_invites i JOIN organizations o ON o.id = i.org_id WHERE i.email = ? AND i.accepted_at IS NULL',
    req.user.email,
  )
  res.json({ orgs, invites, roleLabels: ROLE_LABELS })
}))

r.post('/orgs', h(async (req, res) => {
  const name = str(req.body.name, { required: true, max: 120, field: 'Name' })
  const kind = oneOf(req.body.kind, ['team', 'business', 'family'], { fallback: 'team' })
  const id = tx(() => {
    const o = run('INSERT INTO organizations (name, kind, seats, created_by) VALUES (?, ?, ?, ?)', name, kind, kind === 'family' ? PLANS.family.seats : 5, uid(req))
    const orgId = Number(o.lastInsertRowid)
    run("INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, 'owner')", orgId, uid(req))
    return orgId
  })
  res.status(201).json({ id })
}))

r.get('/orgs/:id', h(async (req, res) => {
  const m = membership(req)
  const orgId = m.org_id
  const isFamily = m.kind === 'family'
  const manage = can(m, 'owner', 'admin', 'manager')
  const members = all(
    `SELECT u.id, u.name, ${can(m, 'owner', 'admin') ? 'u.email,' : ''} om.role, om.team_id, om.joined_at, p.share_with_org
     FROM org_members om JOIN users u ON u.id = om.user_id JOIN profiles p ON p.user_id = u.id WHERE om.org_id = ? ORDER BY om.joined_at`,
    orgId,
  )
  const teams = all('SELECT * FROM teams WHERE org_id = ?', orgId)
  const programs = isFamily ? [] : all('SELECT * FROM org_programs WHERE org_id = ? ORDER BY created_at DESC', orgId).map((p) => ({
    ...p,
    skills: parseJSON(p.skill_ids, []).map((s) => ({ id: s, name: getCatalogSkill(s)?.name ?? s })),
  }))
  const out = {
    id: orgId, name: m.name, kind: m.kind, plan: m.plan, seats: m.seats, role: m.role, roleLabels: ROLE_LABELS,
    planActive: !!PLANS[m.plan],
    members: members.map((x) => ({ ...x, share_with_org: isFamily ? undefined : !!x.share_with_org })),
    teams, programs,
    knowledge: isFamily ? [] : all('SELECT k.id, k.title, k.content, k.created_at, u.name AS author FROM org_knowledge k LEFT JOIN users u ON u.id = k.created_by WHERE k.org_id = ? ORDER BY k.created_at DESC', orgId),
    invites: can(m, 'owner', 'admin') ? all('SELECT id, email, role, created_at FROM org_invites WHERE org_id = ? AND accepted_at IS NULL', orgId) : [],
  }
  // Skill analytics: only for managers, never for families, only from members who opted in.
  if (manage && !isFamily) {
    const teamFilter = int(req.query.team)
    const sharing = members.filter((x) => x.share_with_org && (!teamFilter || x.team_id === teamFilter))
    const byCategory = new Map()
    const bySkill = new Map()
    const perMember = []
    for (const mem of sharing) {
      const skills = E.userSkills(mem.id).filter((s) => s.attempts > 0 || s.evidenceCount > 0)
      perMember.push({ id: mem.id, name: mem.name, skills: skills.map((s) => ({ id: s.id, name: s.name, level: s.level, status: s.status })) })
      for (const s of skills) {
        if (!byCategory.has(s.category)) byCategory.set(s.category, [])
        byCategory.get(s.category).push(s.level)
        if (!bySkill.has(s.id)) bySkill.set(s.id, { id: s.id, name: s.name, levels: [], verified: 0 })
        const e = bySkill.get(s.id)
        e.levels.push(s.level)
        if (s.status === 'verified') e.verified++
      }
    }
    const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length)
    const programGaps = programs.map((p) => ({
      id: p.id, title: p.title,
      skills: p.skills.map((s) => {
        const e = bySkill.get(s.id)
        return { ...s, avg: e ? avg(e.levels) : 0, people: e?.levels.length ?? 0 }
      }),
    }))
    out.analytics = {
      sharingMembers: sharing.length,
      totalMembers: members.length,
      categories: [...byCategory.entries()].map(([category, levels]) => ({ category, avg: avg(levels), people: levels.length })).sort((a, b) => b.avg - a.avg),
      skills: [...bySkill.values()].map((e) => ({ id: e.id, name: e.name, avg: avg(e.levels), people: e.levels.length, verified: e.verified })).sort((a, b) => b.people - a.people || b.avg - a.avg),
      members: perMember,
      programGaps,
    }
  }
  res.json(out)
}))

r.patch('/orgs/:id', h(async (req, res) => {
  const m = membership(req)
  requireRole(m, 'owner', 'admin')
  run('UPDATE organizations SET name = ? WHERE id = ?', str(req.body.name, { required: true, max: 120, field: 'Name' }), m.org_id)
  res.json({ ok: true })
}))

r.delete('/orgs/:id', h(async (req, res) => {
  const m = membership(req)
  requireRole(m, 'owner')
  if (PLANS[m.plan]) throw badRequest('Kündige zuerst das Abonnement der Organisation.')
  run('DELETE FROM organizations WHERE id = ?', m.org_id)
  res.json({ ok: true })
}))

r.post('/orgs/:id/invites', h(async (req, res) => {
  const m = membership(req)
  requireRole(m, 'owner', 'admin')
  const email = str(req.body.email, { required: true, max: 200, field: 'E-Mail' }).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Bitte gib eine gültige E-Mail-Adresse ein.')
  const role = oneOf(req.body.role, ['admin', 'manager', 'member'], { fallback: 'member' })
  if (m.kind === 'family' && role !== 'member') throw badRequest('In Familien gibt es nur Mitglieder.')
  const count = one('SELECT COUNT(*) AS n FROM org_members WHERE org_id = ?', m.org_id).n + one('SELECT COUNT(*) AS n FROM org_invites WHERE org_id = ? AND accepted_at IS NULL', m.org_id).n
  if (count >= m.seats) throw new ApiError(402, 'seats_full', `Alle ${m.seats} Plätze sind belegt. Erhöhe die Anzahl der Plätze im Abonnement.`)
  const user = one('SELECT id FROM users WHERE email = ?', email)
  if (user && one('SELECT 1 FROM org_members WHERE org_id = ? AND user_id = ?', m.org_id, user.id)) throw badRequest('Diese Person ist bereits Mitglied.')
  run('INSERT INTO org_invites (org_id, email, role, invited_by) VALUES (?, ?, ?, ?) ON CONFLICT(org_id, email) DO UPDATE SET role = excluded.role, accepted_at = NULL', m.org_id, email, role, uid(req))
  if (user) E.notify(user.id, 'org', `Du wurdest zu „${m.name}“ eingeladen.`, { link: '/business', dedupeKey: `invite:${m.org_id}:${user.id}` })
  res.status(201).json({ ok: true, registered: !!user })
}))

r.delete('/orgs/:id/invites/:inviteId', h(async (req, res) => {
  const m = membership(req)
  requireRole(m, 'owner', 'admin')
  run('DELETE FROM org_invites WHERE id = ? AND org_id = ?', Number(req.params.inviteId), m.org_id)
  res.json({ ok: true })
}))

r.post('/invites/:id/accept', h(async (req, res) => {
  const inv = one('SELECT * FROM org_invites WHERE id = ? AND email = ? AND accepted_at IS NULL', Number(req.params.id), req.user.email)
  if (!inv) throw notFound('Diese Einladung existiert nicht mehr.')
  tx(() => {
    run('INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES (?, ?, ?)', inv.org_id, uid(req), inv.role)
    run("UPDATE org_invites SET accepted_at = datetime('now') WHERE id = ?", inv.id)
  })
  res.json({ ok: true, orgId: inv.org_id })
}))

r.post('/invites/:id/decline', h(async (req, res) => {
  run('DELETE FROM org_invites WHERE id = ? AND email = ?', Number(req.params.id), req.user.email)
  res.json({ ok: true })
}))

r.patch('/orgs/:id/members/:userId', h(async (req, res) => {
  const m = membership(req)
  requireRole(m, 'owner', 'admin')
  const target = one('SELECT * FROM org_members WHERE org_id = ? AND user_id = ?', m.org_id, Number(req.params.userId))
  if (!target) throw notFound()
  if (target.role === 'owner') throw forbidden('Die Rolle des Owners kann nicht geändert werden.')
  const role = oneOf(req.body.role, ['admin', 'manager', 'member'], { fallback: target.role })
  if (role === 'admin' && m.role !== 'owner') throw forbidden('Nur der Owner kann Admins ernennen.')
  const teamId = req.body.teamId !== undefined ? int(req.body.teamId) : target.team_id
  if (teamId && !one('SELECT 1 FROM teams WHERE id = ? AND org_id = ?', teamId, m.org_id)) throw badRequest('Unbekanntes Team.')
  run('UPDATE org_members SET role = ?, team_id = ? WHERE org_id = ? AND user_id = ?', role, teamId, m.org_id, target.user_id)
  res.json({ ok: true })
}))

r.delete('/orgs/:id/members/:userId', h(async (req, res) => {
  const m = membership(req)
  const targetId = Number(req.params.userId)
  const target = one('SELECT * FROM org_members WHERE org_id = ? AND user_id = ?', m.org_id, targetId)
  if (!target) throw notFound()
  if (target.role === 'owner') throw forbidden('Der Owner kann die Organisation nicht verlassen.')
  if (targetId !== uid(req)) requireRole(m, 'owner', 'admin')
  run('DELETE FROM org_members WHERE org_id = ? AND user_id = ?', m.org_id, targetId)
  res.json({ ok: true })
}))

r.post('/orgs/:id/teams', h(async (req, res) => {
  const m = membership(req)
  requireRole(m, 'owner', 'admin')
  if (m.kind === 'family') throw badRequest('Familien haben keine Teams.')
  run('INSERT INTO teams (org_id, name) VALUES (?, ?)', m.org_id, str(req.body.name, { required: true, max: 80, field: 'Teamname' }))
  res.status(201).json({ ok: true })
}))

r.delete('/orgs/:id/teams/:teamId', h(async (req, res) => {
  const m = membership(req)
  requireRole(m, 'owner', 'admin')
  run('DELETE FROM teams WHERE id = ? AND org_id = ?', Number(req.params.teamId), m.org_id)
  res.json({ ok: true })
}))

r.post('/orgs/:id/programs', h(async (req, res) => {
  const m = membership(req)
  requireRole(m, 'owner', 'admin', 'manager')
  if (m.kind === 'family') throw badRequest('Lernprogramme gibt es nur für Teams und Unternehmen.')
  const skills = (Array.isArray(req.body.skillIds) ? req.body.skillIds : []).filter((s) => getCatalogSkill(s))
  if (!skills.length) throw badRequest('Wähle mindestens einen Skill für das Programm.')
  const teamId = int(req.body.teamId)
  if (teamId && !one('SELECT 1 FROM teams WHERE id = ? AND org_id = ?', teamId, m.org_id)) throw badRequest('Unbekanntes Team.')
  run('INSERT INTO org_programs (org_id, title, description, skill_ids, team_id, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    m.org_id, str(req.body.title, { required: true, max: 160, field: 'Titel' }), str(req.body.description, { max: 3000 }), JSON.stringify(skills), teamId, uid(req))
  res.status(201).json({ ok: true })
}))

r.delete('/orgs/:id/programs/:programId', h(async (req, res) => {
  const m = membership(req)
  requireRole(m, 'owner', 'admin', 'manager')
  run('DELETE FROM org_programs WHERE id = ? AND org_id = ?', Number(req.params.programId), m.org_id)
  res.json({ ok: true })
}))

/** A member joins a program: it becomes a personal goal in their own account. */
r.post('/orgs/:id/programs/:programId/join', h(async (req, res) => {
  const m = membership(req)
  const p = one('SELECT * FROM org_programs WHERE id = ? AND org_id = ?', Number(req.params.programId), m.org_id)
  if (!p) throw notFound()
  const g = await createGoal(uid(req), {
    title: `${p.title} (${m.name})`,
    description: p.description,
    priority: 'medium',
    skills: parseJSON(p.skill_ids, []).map((skillId) => ({ skillId, target: 60 })),
  })
  res.status(201).json({ goalId: g.goalId })
}))

r.post('/orgs/:id/knowledge', h(async (req, res) => {
  const m = membership(req)
  requireRole(m, 'owner', 'admin', 'manager')
  if (m.kind === 'family') throw badRequest('Organisationswissen gibt es nur für Teams und Unternehmen.')
  run('INSERT INTO org_knowledge (org_id, title, content, created_by) VALUES (?, ?, ?, ?)', m.org_id,
    str(req.body.title, { required: true, max: 200, field: 'Titel' }), str(req.body.content, { required: true, max: 50000, field: 'Inhalt' }), uid(req))
  res.status(201).json({ ok: true })
}))

r.delete('/orgs/:id/knowledge/:kid', h(async (req, res) => {
  const m = membership(req)
  requireRole(m, 'owner', 'admin', 'manager')
  run('DELETE FROM org_knowledge WHERE id = ? AND org_id = ?', Number(req.params.kid), m.org_id)
  res.json({ ok: true })
}))

r.post('/orgs/:id/checkout', h(async (req, res) => {
  const m = membership(req)
  requireRole(m, 'owner')
  const stripe = getStripe()
  const plan = m.kind === 'family' ? 'family' : oneOf(req.body.plan, ['teams', 'business'], { fallback: m.kind === 'business' ? 'business' : 'teams' })
  const cycle = oneOf(req.body.cycle, ['monthly', 'yearly'], { fallback: 'monthly' })
  const seats = plan === 'family' ? 1 : int(req.body.seats, { min: plan === 'business' ? 10 : 2, max: 5000, fallback: 5 })
  const price = priceId(plan, cycle)
  if (!stripe || !price) throw new ApiError(503, 'billing_unavailable', 'Die Zahlungsabwicklung ist auf diesem Server noch nicht eingerichtet. Es wurden keine Kosten verursacht.')
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: req.user.email,
    line_items: [{ price, quantity: seats }],
    subscription_data: { metadata: { org_id: String(m.org_id) } },
    success_url: `${appUrl()}/business/${m.org_id}?checkout=success`,
    cancel_url: `${appUrl()}/business/${m.org_id}?checkout=cancelled`,
  })
  res.json({ url: session.url })
}))

// ---------------- Creator ----------------

function requireCreator(req) {
  if (!req.user.is_creator) throw forbidden('Aktiviere zuerst den Creator-Modus in den Einstellungen.')
}
const ITEM_TYPES = ['path', 'course', 'mission', 'skill_pack', 'project', 'test']
const cleanModules = (mods) => (Array.isArray(mods) ? mods : []).slice(0, 50).map((x) => ({
  title: String(x.title || '').slice(0, 200),
  type: ['lesson', 'task', 'project', 'test'].includes(x.type) ? x.type : 'lesson',
  body: String(x.body || '').slice(0, 20000),
})).filter((x) => x.title)

r.get('/creator/items', h(async (req, res) => {
  requireCreator(req)
  res.json({
    items: all('SELECT *, (SELECT COUNT(*) FROM enrollments e WHERE e.item_id = creator_items.id) AS enrollments FROM creator_items WHERE user_id = ? ORDER BY created_at DESC', uid(req))
      .map((i) => ({ ...i, skill_ids: parseJSON(i.skill_ids, []), modules: parseJSON(i.modules, []) })),
  })
}))

r.post('/creator/items', h(async (req, res) => {
  requireCreator(req)
  const r2 = run('INSERT INTO creator_items (user_id, type, title, summary) VALUES (?, ?, ?, ?)', uid(req),
    oneOf(req.body.type, ITEM_TYPES, { fallback: 'path' }), str(req.body.title, { required: true, max: 160, field: 'Titel' }), str(req.body.summary, { max: 3000 }))
  res.status(201).json({ id: Number(r2.lastInsertRowid) })
}))

function ownItem(req) {
  requireCreator(req)
  const i = one('SELECT * FROM creator_items WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!i) throw notFound('Dieser Inhalt existiert nicht.')
  return i
}

r.get('/creator/items/:id', h(async (req, res) => {
  const i = ownItem(req)
  res.json({ ...i, skill_ids: parseJSON(i.skill_ids, []), modules: parseJSON(i.modules, []) })
}))

r.patch('/creator/items/:id', h(async (req, res) => {
  const i = ownItem(req)
  const b = req.body
  run('UPDATE creator_items SET type = ?, title = ?, summary = ?, skill_ids = ?, modules = ? WHERE id = ?',
    oneOf(b.type, ITEM_TYPES, { fallback: i.type }), str(b.title, { max: 160 }) ?? i.title, b.summary !== undefined ? str(b.summary, { max: 3000 }) : i.summary,
    Array.isArray(b.skillIds) ? JSON.stringify(b.skillIds.filter((s) => getCatalogSkill(s))) : i.skill_ids,
    Array.isArray(b.modules) ? JSON.stringify(cleanModules(b.modules)) : i.modules, i.id)
  res.json({ ok: true })
}))

r.post('/creator/items/:id/structure', h(async (req, res) => {
  const i = ownItem(req)
  const out = await structureCreatorItem({ type: i.type, title: i.title, summary: i.summary, notes: str(req.body.notes, { max: 5000 }) })
  res.json({ ...out, skills: out.skills.filter((s) => getCatalogSkill(s)) })
}))

r.post('/creator/items/:id/publish', h(async (req, res) => {
  const i = ownItem(req)
  const publish = req.body.publish !== false
  if (publish) {
    if (!parseJSON(i.modules, []).length) throw badRequest('Füge mindestens ein Modul hinzu, bevor du veröffentlichst.')
    if (!i.summary) throw badRequest('Füge eine Beschreibung hinzu, bevor du veröffentlichst.')
    if (!req.body.confirmOwnContent) throw badRequest('Bitte bestätige, dass du die Rechte an den Inhalten besitzt und sie fachlich geprüft hast.')
  }
  run("UPDATE creator_items SET status = ?, published_at = CASE WHEN ? THEN datetime('now') ELSE published_at END WHERE id = ?", publish ? 'published' : 'draft', publish ? 1 : 0, i.id)
  res.json({ ok: true })
}))

r.delete('/creator/items/:id', h(async (req, res) => {
  const i = ownItem(req)
  run('DELETE FROM creator_items WHERE id = ?', i.id)
  res.json({ ok: true })
}))

// ---------------- Marketplace ----------------

r.get('/marketplace', h(async (req, res) => {
  const q = str(req.query.q, { max: 100 })
  let items = all(
    `SELECT c.id, c.type, c.title, c.summary, c.skill_ids, c.modules, c.published_at, u.name AS creator,
       (SELECT COUNT(*) FROM enrollments e WHERE e.item_id = c.id) AS enrollments,
       EXISTS(SELECT 1 FROM enrollments e WHERE e.item_id = c.id AND e.user_id = ?) AS enrolled
     FROM creator_items c JOIN users u ON u.id = c.user_id WHERE c.status = 'published' ORDER BY c.published_at DESC`,
    uid(req),
  ).map((i) => ({ ...i, skills: parseJSON(i.skill_ids, []).map((s) => getCatalogSkill(s)?.name ?? s), moduleCount: parseJSON(i.modules, []).length, modules: undefined, skill_ids: undefined }))
  if (q) items = items.filter((i) => `${i.title} ${i.summary} ${i.skills.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  res.json({ items, categories: CATEGORIES })
}))

r.get('/marketplace/:id', h(async (req, res) => {
  const i = one("SELECT c.*, u.name AS creator FROM creator_items c JOIN users u ON u.id = c.user_id WHERE c.id = ? AND (c.status = 'published' OR c.user_id = ?)", Number(req.params.id), uid(req))
  if (!i) throw notFound('Dieses Angebot existiert nicht oder wurde zurückgezogen.')
  const enr = one('SELECT * FROM enrollments WHERE user_id = ? AND item_id = ?', uid(req), i.id)
  res.json({
    ...i,
    skills: parseJSON(i.skill_ids, []).map((s) => ({ id: s, name: getCatalogSkill(s)?.name ?? s })),
    modules: parseJSON(i.modules, []),
    enrolled: !!enr,
    progress: parseJSON(enr?.progress, []),
  })
}))

r.post('/marketplace/:id/enroll', h(async (req, res) => {
  const i = one("SELECT * FROM creator_items WHERE id = ? AND status = 'published'", Number(req.params.id))
  if (!i) throw notFound()
  run('INSERT OR IGNORE INTO enrollments (user_id, item_id) VALUES (?, ?)', uid(req), i.id)
  for (const s of parseJSON(i.skill_ids, [])) if (getCatalogSkill(s)) E.ensureUserSkill(uid(req), s)
  E.logActivity(uid(req), 'enrolled', i.title, { refId: i.id })
  res.json({ ok: true })
}))

r.post('/marketplace/:id/progress', h(async (req, res) => {
  const enr = one('SELECT * FROM enrollments WHERE user_id = ? AND item_id = ?', uid(req), Number(req.params.id))
  if (!enr) throw badRequest('Starte das Angebot zuerst.')
  const idx = int(req.body.index, { min: 0, max: 100 })
  const set = new Set(parseJSON(enr.progress, []))
  if (req.body.done === false) set.delete(idx)
  else set.add(idx)
  run('UPDATE enrollments SET progress = ? WHERE user_id = ? AND item_id = ?', JSON.stringify([...set].sort((a, b) => a - b)), uid(req), enr.item_id)
  res.json({ ok: true })
}))

r.delete('/marketplace/:id/enroll', h(async (req, res) => {
  run('DELETE FROM enrollments WHERE user_id = ? AND item_id = ?', uid(req), Number(req.params.id))
  res.json({ ok: true })
}))

export default r
