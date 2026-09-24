import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { one, all, run, tx, parseJSON, UPLOAD_DIR } from '../db.js'
import { h, str, int, oneOf, badRequest, notFound, ApiError } from '../lib/http.js'
import { entitlements, planFor, requireFeature, verifyPassword, destroySession } from '../lib/auth.js'
import { PLANS, FEATURE_LABELS, CREDIT_COSTS } from '../lib/plans.js'
import { usageToday, creditBalance } from '../lib/usage.js'
import { getStripe, stripeConfigured, priceId, appUrl } from '../lib/billing.js'
import * as E from '../lib/engine.js'
import { CAREER_PATHS, getCareerPath, MISSIONS, GOAL_TEMPLATES, SKILLS } from '../lib/catalog.js'
import { createGoal } from '../lib/goals.js'
import { publicUser } from './auth.js'

const r = Router()
const uid = (req) => req.user.id

// ---------------- Settings ----------------

r.get('/settings', h(async (req, res) => {
  const p = one('SELECT * FROM profiles WHERE user_id = ?', uid(req))
  res.json({
    user: publicUser(req.user),
    profile: {
      ...p,
      interests: parseJSON(p.interests, []),
      notifications: parseJSON(p.notifications, {}),
      accessibility: parseJSON(p.accessibility, {}),
      share_with_org: !!p.share_with_org,
    },
  })
}))

r.patch('/settings', h(async (req, res) => {
  const userId = uid(req)
  const b = req.body
  const p = one('SELECT * FROM profiles WHERE user_id = ?', userId)
  tx(() => {
    if (b.name !== undefined || b.accountType !== undefined || b.isCreator !== undefined) {
      run('UPDATE users SET name = ?, account_type = ?, is_creator = ? WHERE id = ?',
        str(b.name, { max: 80, field: 'Name' }) ?? req.user.name,
        oneOf(b.accountType, ['individual', 'student', 'professional'], { fallback: req.user.account_type }),
        b.isCreator !== undefined ? (b.isCreator ? 1 : 0) : req.user.is_creator, userId)
    }
    const bool = (o, keys) => Object.fromEntries(keys.map((k) => [k, !!o?.[k]]))
    run(
      `UPDATE profiles SET age = ?, situation = ?, interests = ?, weekly_minutes = ?, learning_style = ?, career_goal = ?,
        explanation_level = ?, language = ?, intensity = ?, difficulty_pref = ?, notifications = ?, accessibility = ?, share_with_org = ?
       WHERE user_id = ?`,
      b.age !== undefined ? int(b.age, { min: 6, max: 120 }) : p.age,
      b.situation !== undefined ? str(b.situation, { max: 300 }) : p.situation,
      Array.isArray(b.interests) ? JSON.stringify(b.interests.map((x) => String(x).slice(0, 60)).slice(0, 20)) : p.interests,
      b.weeklyMinutes !== undefined ? int(b.weeklyMinutes, { min: 15, max: 3000, fallback: p.weekly_minutes }) : p.weekly_minutes,
      oneOf(b.learningStyle, ['reading', 'examples', 'practice', 'visual', 'mixed'], { fallback: p.learning_style }),
      b.careerGoal !== undefined ? str(b.careerGoal, { max: 200 }) : p.career_goal,
      oneOf(b.explanationLevel, ['simple', 'normal', 'expert'], { fallback: p.explanation_level }),
      oneOf(b.language, ['de', 'en'], { fallback: p.language }),
      oneOf(b.intensity, ['light', 'normal', 'intensive'], { fallback: p.intensity }),
      oneOf(b.difficultyPref, ['adaptive', 'easier', 'harder'], { fallback: p.difficulty_pref }),
      b.notifications ? JSON.stringify(bool(b.notifications, ['reviews', 'projects', 'skills', 'weekly'])) : p.notifications,
      b.accessibility ? JSON.stringify(bool(b.accessibility, ['reduceMotion', 'largeText', 'highContrast'])) : p.accessibility,
      b.shareWithOrg !== undefined ? (b.shareWithOrg ? 1 : 0) : p.share_with_org,
      userId,
    )
  })
  res.json({ ok: true, user: publicUser(one('SELECT * FROM users WHERE id = ?', userId)) })
}))

// ---------------- Notifications ----------------

r.get('/notifications', h(async (req, res) => {
  const items = all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', uid(req))
  res.json({ items, unread: items.filter((n) => !n.read_at).length })
}))

r.post('/notifications/read', h(async (req, res) => {
  if (req.body.id) run("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ?", Number(req.body.id), uid(req))
  else run("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL", uid(req))
  res.json({ ok: true })
}))

// ---------------- Global search ----------------

r.get('/search', h(async (req, res) => {
  const userId = uid(req)
  const q = str(req.query.q, { max: 200 })
  if (!q || q.length < 2) return res.json({ results: [] })
  const like = `%${q.toLowerCase()}%`
  const has = (s) => String(s || '').toLowerCase().includes(q.toLowerCase())
  const results = []
  for (const s of E.skillCatalog(userId).filter((s) => has(s.name) || has(s.category)).slice(0, 8)) results.push({ type: 'Skill', title: s.name, subtitle: s.category, href: `/skills/${s.id}` })
  for (const g of all('SELECT id, title FROM goals WHERE user_id = ? AND (lower(title) LIKE ? OR lower(description) LIKE ?) LIMIT 5', userId, like, like)) results.push({ type: 'Ziel', title: g.title, href: `/goals/${g.id}` })
  for (const p of all('SELECT id, title FROM projects WHERE user_id = ? AND (lower(title) LIKE ? OR lower(description) LIKE ?) LIMIT 5', userId, like, like)) results.push({ type: 'Projekt', title: p.title, href: `/projects/${p.id}` })
  for (const l of all('SELECT id, title FROM lessons WHERE user_id = ? AND (lower(title) LIKE ? OR lower(content) LIKE ?) LIMIT 5', userId, like, like)) results.push({ type: 'Lektion', title: l.title, href: `/learn/lessons/${l.id}` })
  for (const k of all('SELECT id, title, type FROM knowledge_items WHERE user_id = ? AND (lower(title) LIKE ? OR lower(content) LIKE ? OR lower(tags) LIKE ?) LIMIT 5', userId, like, like, like)) results.push({ type: 'Notiz', title: k.title, href: `/knowledge/${k.id}` })
  for (const d of all('SELECT id, filename FROM documents WHERE user_id = ? AND (lower(filename) LIKE ? OR lower(summary) LIKE ?) LIMIT 5', userId, like, like)) results.push({ type: 'Dokument', title: d.filename, href: `/knowledge/documents/${d.id}` })
  for (const c of CAREER_PATHS.filter((c) => has(c.title) || has(c.field))) results.push({ type: 'Karriereweg', title: c.title, href: `/career/${c.id}` })
  for (const m of MISSIONS.filter((m) => has(m.title))) results.push({ type: 'Mission', title: m.title, href: `/missions?m=${m.id}` })
  res.json({ results: results.slice(0, 30) })
}))

// ---------------- Junis Twin ----------------

r.get('/twin', h(async (req, res) => {
  const userId = uid(req)
  const skills = E.userSkills(userId)
  const measured = skills.filter((s) => s.attempts > 0 || s.evidenceCount > 0)
  const sessions = all('SELECT score, duration_ms, kind FROM practice_sessions WHERE user_id = ? AND completed_at IS NOT NULL', userId)
  const counts = Object.fromEntries(all('SELECT type, COUNT(*) AS n FROM activity WHERE user_id = ? GROUP BY type', userId).map((r2) => [r2.type, r2.n]))
  res.json({
    strengths: measured.filter((s) => s.level >= 50).sort((a, b) => b.level - a.level).slice(0, 6),
    developing: measured.filter((s) => s.level < 50).sort((a, b) => b.level - a.level).slice(0, 6),
    needsAttention: skills.filter((s) => s.flag === 'reexplain' || (s.errorRate ?? 0) >= 50 || s.stale).slice(0, 6),
    selfOnly: skills.filter((s) => s.status === 'self').length,
    verified: skills.filter((s) => s.status === 'verified').length,
    trackedSkills: skills.length,
    frequentErrors: all("SELECT content, created_at FROM memories WHERE user_id = ? AND kind = 'Häufige Fehler' ORDER BY created_at DESC LIMIT 5", userId),
    history: {
      lessons: counts.lesson_completed || 0,
      practice: (counts.practice_completed || 0) + (counts.review_completed || 0),
      projects: counts.project_completed || 0,
      missions: counts.mission_completed || 0,
      avgScore: sessions.length ? Math.round((sessions.reduce((a, s) => a + (s.score || 0), 0) / sessions.length) * 100) : null,
    },
    goals: E.activeGoals(userId).map((g) => ({ id: g.id, title: g.title, progress: E.goalAnalysis(userId, g.id).progress })),
    dataPoints: sessions.length + all('SELECT COUNT(*) AS n FROM skill_evidence WHERE user_id = ?', userId)[0].n,
  })
}))

// ---------------- Career ----------------

function careerStepStatus(userId, step) {
  if (step.type === 'project') {
    const done = all(
      `SELECT DISTINCT p.id FROM projects p JOIN project_skills ps ON ps.project_id = p.id
       WHERE p.user_id = ? AND p.status = 'completed' AND ps.skill_id IN (${step.skills.map(() => '?').join(',')})`,
      userId, ...step.skills,
    ).length
    return { done: done >= step.count, detail: `${Math.min(done, step.count)} von ${step.count} Projekten abgeschlossen`, progress: Math.round(Math.min(1, done / step.count) * 100) }
  }
  if (step.type === 'role') {
    return { done: false, detail: 'Rolle — erreichbar über die vorherigen Schritte. JunisWorld garantiert keine Anstellung.', progress: null, skills: step.skills.map((s) => E.describeSkill(userId, s)).filter(Boolean) }
  }
  const skills = step.skills.map((s) => E.describeSkill(userId, s)).filter(Boolean)
  const avg = skills.length ? Math.round(skills.reduce((a, s) => a + Math.min(100, (s.level / 60) * 100), 0) / skills.length) : 0
  return { done: skills.every((s) => s.level >= 60), progress: avg, skills, detail: skills.map((s) => `${s.name}: ${s.level} %`).join(' · ') }
}

r.get('/career', h(async (req, res) => {
  const userId = uid(req)
  const enabled = entitlements(userId).flags.career
  const adopted = all('SELECT * FROM career_paths WHERE user_id = ? ORDER BY created_at DESC', userId)
  res.json({
    enabled,
    careerGoal: one('SELECT career_goal FROM profiles WHERE user_id = ?', userId)?.career_goal ?? null,
    paths: CAREER_PATHS.map((c) => ({ id: c.id, title: c.title, field: c.field, summary: c.summary, stepCount: c.steps.length, adopted: adopted.some((a) => a.template_id === c.id) })),
    opportunities: enabled ? all('SELECT * FROM opportunities WHERE user_id = ? ORDER BY COALESCE(deadline, created_at)', userId) : [],
  })
}))

r.get('/career/:id', h(async (req, res) => {
  const userId = uid(req)
  requireFeature(userId, 'career', FEATURE_LABELS.career)
  const c = getCareerPath(req.params.id)
  if (!c) throw notFound('Diesen Karriereweg gibt es nicht.')
  let reachedCurrent = false
  const steps = c.steps.map((s, i) => {
    const st = careerStepStatus(userId, s)
    const current = !st.done && !reachedCurrent
    if (current) reachedCurrent = true
    return { index: i, ...s, ...st, current }
  })
  const adopted = one('SELECT * FROM career_paths WHERE user_id = ? AND template_id = ?', userId, c.id)
  res.json({ ...c, steps, adopted: !!adopted, goalId: adopted?.goal_id ?? null, relatedTemplate: GOAL_TEMPLATES.find((t) => t.id === c.id)?.id ?? null })
}))

r.post('/career/:id/adopt', h(async (req, res) => {
  const userId = uid(req)
  requireFeature(userId, 'career', FEATURE_LABELS.career)
  const c = getCareerPath(req.params.id)
  if (!c) throw notFound()
  if (one('SELECT 1 FROM career_paths WHERE user_id = ? AND template_id = ?', userId, c.id)) throw badRequest('Diesen Karriereweg verfolgst du bereits.')
  // Create a goal covering all skills of the path.
  const skillIds = [...new Set(c.steps.flatMap((s) => s.skills))].filter((s) => SKILLS.some((x) => x.id === s))
  const goal = await createGoal(userId, {
    title: `Karriereweg: ${c.title}`,
    description: c.summary,
    targetState: `Die Fähigkeiten für den Karriereweg ${c.title} aufgebaut und mit Projekten nachgewiesen.`,
    priority: 'medium',
    skills: skillIds.map((skillId) => ({ skillId, target: 60 })),
  })
  run('INSERT INTO career_paths (user_id, template_id, goal_id) VALUES (?, ?, ?)', userId, c.id, goal.goalId)
  run("UPDATE profiles SET career_goal = COALESCE(career_goal, ?) WHERE user_id = ?", c.title, userId)
  res.status(201).json({ goalId: goal.goalId })
}))

r.delete('/career/:id/adopt', h(async (req, res) => {
  run('DELETE FROM career_paths WHERE user_id = ? AND template_id = ?', uid(req), req.params.id)
  res.json({ ok: true })
}))

const OPP_TYPES = ['internship', 'competition', 'program', 'project', 'training', 'job', 'research']
const OPP_STATUS = ['interested', 'preparing', 'applied', 'accepted', 'rejected', 'closed']

r.post('/opportunities', h(async (req, res) => {
  requireFeature(uid(req), 'career', FEATURE_LABELS.career)
  const b = req.body
  const r2 = run('INSERT INTO opportunities (user_id, title, type, organization, url, deadline, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    uid(req), str(b.title, { required: true, max: 200, field: 'Titel' }), oneOf(b.type, OPP_TYPES, { fallback: 'program' }),
    str(b.organization, { max: 200 }), str(b.url, { max: 500 }), str(b.deadline, { max: 10 }), oneOf(b.status, OPP_STATUS, { fallback: 'interested' }), str(b.notes, { max: 3000 }))
  res.status(201).json({ id: Number(r2.lastInsertRowid) })
}))

r.patch('/opportunities/:id', h(async (req, res) => {
  const o = one('SELECT * FROM opportunities WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!o) throw notFound()
  const b = req.body
  run('UPDATE opportunities SET status = ?, notes = ? WHERE id = ?', oneOf(b.status, OPP_STATUS, { fallback: o.status }), b.notes !== undefined ? str(b.notes, { max: 3000 }) : o.notes, o.id)
  res.json({ ok: true })
}))

r.delete('/opportunities/:id', h(async (req, res) => {
  run('DELETE FROM opportunities WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  res.json({ ok: true })
}))

// ---------------- Billing ----------------

r.get('/billing', h(async (req, res) => {
  const userId = uid(req)
  const sub = one('SELECT * FROM subscriptions WHERE user_id = ?', userId)
  const effective = planFor(userId)
  const orgPlan = effective !== sub.plan ? effective : null
  res.json({
    subscription: {
      plan: sub.plan,
      status: sub.status,
      billingCycle: sub.billing_cycle,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      managedByStripe: !!sub.stripe_subscription_id,
    },
    effectivePlan: effective,
    viaOrganization: orgPlan,
    plans: Object.values(PLANS).map((p) => ({ ...p, available: p.monthly === 0 || (stripeConfigured() && !!priceId(p.id, 'monthly')) })),
    usage: usageToday(userId),
    credits: creditBalance(userId),
    creditCosts: CREDIT_COSTS,
    stripeConfigured: stripeConfigured(),
  })
}))

function billingUnavailable() {
  return new ApiError(503, 'billing_unavailable', 'Die Zahlungsabwicklung ist auf diesem Server noch nicht eingerichtet. Es wurden keine Kosten verursacht.')
}

async function stripeCustomer(stripe, user) {
  const sub = one('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?', user.id)
  if (sub?.stripe_customer_id) return sub.stripe_customer_id
  const c = await stripe.customers.create({ email: user.email, name: user.name, metadata: { user_id: String(user.id) } })
  run('UPDATE subscriptions SET stripe_customer_id = ? WHERE user_id = ?', c.id, user.id)
  return c.id
}

r.post('/billing/checkout', h(async (req, res) => {
  const stripe = getStripe()
  if (!stripe) throw billingUnavailable()
  const plan = oneOf(req.body.plan, ['plus', 'pro'], { field: 'Tarif' })
  const cycle = oneOf(req.body.cycle, ['monthly', 'yearly'], { fallback: 'monthly' })
  const price = priceId(plan, cycle)
  if (!price) throw billingUnavailable()
  const sub = one('SELECT * FROM subscriptions WHERE user_id = ?', uid(req))
  if (sub.stripe_subscription_id) {
    // Existing subscription: plan changes happen in the Stripe customer portal (with proration shown there).
    const portal = await stripe.billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: `${appUrl()}/billing` })
    return res.json({ url: portal.url })
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: await stripeCustomer(stripe, req.user),
    line_items: [{ price, quantity: 1 }],
    client_reference_id: String(uid(req)),
    subscription_data: { metadata: { user_id: String(uid(req)) } },
    success_url: `${appUrl()}/billing?checkout=success`,
    cancel_url: `${appUrl()}/billing?checkout=cancelled`,
  })
  res.json({ url: session.url })
}))

r.post('/billing/portal', h(async (req, res) => {
  const stripe = getStripe()
  if (!stripe) throw billingUnavailable()
  const sub = one('SELECT * FROM subscriptions WHERE user_id = ?', uid(req))
  if (!sub.stripe_customer_id) throw badRequest('Für dein Konto gibt es noch keine Zahlungsdaten.')
  const portal = await stripe.billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: `${appUrl()}/billing` })
  res.json({ url: portal.url })
}))

/** Cancel at period end (paid plans keep working until then). */
r.post('/billing/cancel', h(async (req, res) => {
  const sub = one('SELECT * FROM subscriptions WHERE user_id = ?', uid(req))
  if (sub.plan === 'free') throw badRequest('Du nutzt bereits den kostenlosen Tarif.')
  if (sub.stripe_subscription_id) {
    const stripe = getStripe()
    if (!stripe) throw billingUnavailable()
    await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true })
  }
  if (sub.current_period_end) run('UPDATE subscriptions SET cancel_at_period_end = 1 WHERE user_id = ?', uid(req))
  else run("UPDATE subscriptions SET plan = 'free', cancel_at_period_end = 0 WHERE user_id = ?", uid(req))
  res.json({ ok: true })
}))

r.post('/billing/resume', h(async (req, res) => {
  const sub = one('SELECT * FROM subscriptions WHERE user_id = ?', uid(req))
  if (sub.stripe_subscription_id) {
    const stripe = getStripe()
    if (!stripe) throw billingUnavailable()
    await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: false })
  }
  run('UPDATE subscriptions SET cancel_at_period_end = 0 WHERE user_id = ?', uid(req))
  res.json({ ok: true })
}))

// ---------------- Data export & deletion ----------------

const USER_TABLES = ['profiles', 'user_skills', 'skill_history', 'skill_evidence', 'goals', 'lessons', 'practice_sessions', 'user_missions', 'projects',
  'documents', 'knowledge_items', 'memories', 'conversations', 'notifications', 'activity', 'subscriptions', 'career_paths', 'opportunities',
  'research_reports', 'custom_skills', 'creator_items', 'enrollments', 'credit_ledger']

r.get('/account/export', h(async (req, res) => {
  const userId = uid(req)
  const data = { exportedAt: new Date().toISOString(), user: publicUser(req.user) }
  for (const t of USER_TABLES) data[t] = all(`SELECT * FROM ${t} WHERE user_id = ?`, userId)
  data.documents = data.documents.map(({ stored_name: _s, ...d }) => d)
  const goalIds = data.goals.map((g) => g.id)
  data.goal_skills = goalIds.length ? all(`SELECT * FROM goal_skills WHERE goal_id IN (${goalIds.map(() => '?').join(',')})`, ...goalIds) : []
  data.milestones = goalIds.length ? all(`SELECT * FROM milestones WHERE goal_id IN (${goalIds.map(() => '?').join(',')})`, ...goalIds) : []
  const projectIds = data.projects.map((p) => p.id)
  const inP = projectIds.map(() => '?').join(',')
  data.project_tasks = projectIds.length ? all(`SELECT * FROM project_tasks WHERE project_id IN (${inP})`, ...projectIds) : []
  data.project_feedback = projectIds.length ? all(`SELECT * FROM project_feedback WHERE project_id IN (${inP})`, ...projectIds) : []
  const convIds = data.conversations.map((c) => c.id)
  data.messages = convIds.length ? all(`SELECT * FROM messages WHERE conversation_id IN (${convIds.map(() => '?').join(',')})`, ...convIds) : []
  res.setHeader('Content-Disposition', `attachment; filename="junisworld-export-${new Date().toISOString().slice(0, 10)}.json"`)
  res.json(data)
}))

r.delete('/account', h(async (req, res) => {
  const userId = uid(req)
  if (!verifyPassword(String(req.body.password || ''), req.user.password_hash)) throw badRequest('Das Passwort ist nicht korrekt.')
  const ownedOrg = one("SELECT o.name FROM org_members m JOIN organizations o ON o.id = m.org_id WHERE m.user_id = ? AND m.role = 'owner'", userId)
  if (ownedOrg) throw badRequest(`Du bist Eigentümer der Organisation „${ownedOrg.name}“. Übertrage die Eigentümerschaft oder lösche die Organisation zuerst.`)
  const sub = one('SELECT * FROM subscriptions WHERE user_id = ?', userId)
  if (sub?.stripe_subscription_id) {
    const stripe = getStripe()
    if (!stripe) throw billingUnavailable()
    await stripe.subscriptions.cancel(sub.stripe_subscription_id)
  }
  for (const d of all('SELECT stored_name FROM documents WHERE user_id = ?', userId)) fs.rmSync(path.join(UPLOAD_DIR, d.stored_name), { force: true })
  destroySession(req, res)
  run('DELETE FROM users WHERE id = ?', userId)
  res.json({ ok: true })
}))

export default r
