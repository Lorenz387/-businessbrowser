import { Router } from 'express'
import { one, run, tx } from '../db.js'
import { h, str, int, oneOf, badRequest, ApiError } from '../lib/http.js'
import { hashPassword, verifyPassword, createSession, destroySession, requireAuth, rateLimit, planFor } from '../lib/auth.js'
import { createGoal, ensureCustomSkill } from '../lib/goals.js'
import { ensureUserSkill, logActivity } from '../lib/engine.js'
import { getCatalogSkill, getCareerPath } from '../lib/catalog.js'
import { aiAvailable } from '../lib/ai.js'

const r = Router()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ACCOUNT_TYPES = ['individual', 'student', 'professional']

export function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    accountType: u.account_type,
    isCreator: !!u.is_creator,
    onboarded: !!u.onboarded,
    plan: planFor(u.id),
    createdAt: u.created_at,
  }
}

r.post('/register', h(async (req, res) => {
  rateLimit(`register:${req.ip}`, 10)
  const email = str(req.body.email, { required: true, max: 200, field: 'E-Mail' }).toLowerCase()
  const name = str(req.body.name, { required: true, max: 80, field: 'Name' })
  const password = req.body.password
  if (!EMAIL_RE.test(email)) throw badRequest('Bitte gib eine gültige E-Mail-Adresse ein.')
  if (typeof password !== 'string' || password.length < 10) throw badRequest('Das Passwort muss mindestens 10 Zeichen lang sein.')
  if (!req.body.acceptTerms) throw badRequest('Bitte akzeptiere die AGB und nimm die Datenschutzerklärung zur Kenntnis.')
  if (one('SELECT 1 FROM users WHERE email = ?', email)) throw new ApiError(409, 'exists', 'Für diese E-Mail-Adresse gibt es bereits ein Konto.')
  const userId = tx(() => {
    const u = run('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', email, hashPassword(password), name)
    const id = Number(u.lastInsertRowid)
    run('INSERT INTO profiles (user_id) VALUES (?)', id)
    run("INSERT INTO subscriptions (user_id, plan, status) VALUES (?, 'free', 'active')", id)
    return id
  })
  createSession(res, userId)
  res.status(201).json({ user: publicUser(one('SELECT * FROM users WHERE id = ?', userId)) })
}))

r.post('/login', h(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  rateLimit(`login:${req.ip}:${email}`, 8)
  const u = one('SELECT * FROM users WHERE email = ?', email)
  if (!u || !verifyPassword(String(req.body.password || ''), u.password_hash)) {
    throw new ApiError(401, 'invalid_credentials', 'E-Mail oder Passwort ist nicht korrekt.')
  }
  createSession(res, u.id)
  res.json({ user: publicUser(u) })
}))

r.post('/logout', (req, res) => {
  destroySession(req, res)
  res.json({ ok: true })
})

r.get('/me', (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null, aiAvailable: aiAvailable() })
})

r.post('/password', requireAuth, h(async (req, res) => {
  const { current, next } = req.body
  if (!verifyPassword(String(current || ''), req.user.password_hash)) throw badRequest('Das aktuelle Passwort ist nicht korrekt.')
  if (typeof next !== 'string' || next.length < 10) throw badRequest('Das neue Passwort muss mindestens 10 Zeichen lang sein.')
  run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(next), req.user.id)
  run('DELETE FROM sessions WHERE user_id = ?', req.user.id)
  createSession(res, req.user.id)
  res.json({ ok: true })
}))

/**
 * Onboarding: stores the profile, self-assessed skills and creates the first goal,
 * so the dashboard immediately has a goal, skill graph and next step.
 */
r.post('/onboarding', requireAuth, h(async (req, res) => {
  const b = req.body
  const userId = req.user.id
  const name = str(b.name, { max: 80, field: 'Name' }) || req.user.name
  const accountType = oneOf(b.accountType, ACCOUNT_TYPES, { field: 'Situation', fallback: 'individual' })
  const interests = Array.isArray(b.interests) ? b.interests.map((x) => String(x).slice(0, 60)).slice(0, 20) : []
  const weekly = int(b.weeklyMinutes, { min: 15, max: 3000, fallback: 120 })
  const style = oneOf(b.learningStyle, ['reading', 'examples', 'practice', 'visual', 'mixed'], { fallback: 'mixed' })
  if (!b.goal || (!b.goal.templateId && !b.goal.title)) throw badRequest('Bitte wähle oder formuliere ein erstes Ziel.')

  tx(() => {
    run('UPDATE users SET name = ?, account_type = ? WHERE id = ?', name, accountType, userId)
    run(
      `UPDATE profiles SET age = ?, situation = ?, interests = ?, weekly_minutes = ?, learning_style = ?, career_goal = ? WHERE user_id = ?`,
      int(b.age, { min: 6, max: 120 }), str(b.situation, { max: 300 }), JSON.stringify(interests), weekly, style,
      str(b.careerGoal, { max: 200 }), userId,
    )
    for (const s of Array.isArray(b.skills) ? b.skills.slice(0, 40) : []) {
      const skillId = getCatalogSkill(s.skillId) ? s.skillId : s.name ? ensureCustomSkill(userId, String(s.name).slice(0, 80)) : null
      if (!skillId) continue
      ensureUserSkill(userId, skillId)
      run('UPDATE user_skills SET self_level = ? WHERE user_id = ? AND skill_id = ?', int(s.selfLevel, { min: 0, max: 100, fallback: 0 }), userId, skillId)
    }
    for (const id of Array.isArray(b.desiredSkills) ? b.desiredSkills.slice(0, 20) : []) {
      if (getCatalogSkill(id)) ensureUserSkill(userId, id)
    }
    const mem = (kind, content) => content && run("INSERT INTO memories (user_id, kind, content, source) VALUES (?, ?, ?, 'onboarding')", userId, kind, content)
    mem('Interessen', interests.join(', '))
    mem('Lernweise', { reading: 'Lernt am liebsten durch Lesen', examples: 'Lernt am liebsten durch Beispiele', practice: 'Lernt am liebsten durch Üben', visual: 'Lernt am liebsten visuell', mixed: 'Gemischte Lernweise' }[style])
    mem('Situation', str(b.situation, { max: 300 }))
    mem('Karriereziel', str(b.careerGoal, { max: 200 }))
    mem('Lernzeit', `${weekly} Minuten pro Woche`)
  })

  const goal = await createGoal(userId, {
    templateId: b.goal.templateId || null,
    title: str(b.goal.title, { max: 160 }),
    description: str(b.goal.description, { max: 2000 }),
    timeframeWeeks: int(b.goal.timeframeWeeks, { min: 1, max: 520 }),
    priority: 'high',
    skills: !b.goal.templateId && Array.isArray(b.desiredSkills) && !aiAvailable()
      ? b.desiredSkills.filter((id) => getCatalogSkill(id)).map((skillId) => ({ skillId, target: 60 }))
      : undefined,
    fromOnboarding: true,
  })
  if (b.careerPathId && getCareerPath(b.careerPathId)) {
    run('INSERT INTO career_paths (user_id, template_id, goal_id) VALUES (?, ?, ?)', userId, b.careerPathId, goal.goalId)
  }
  run('UPDATE users SET onboarded = 1 WHERE id = ?', userId)
  logActivity(userId, 'onboarding', 'Onboarding abgeschlossen')
  res.json({ ok: true, goalId: goal.goalId, skillSource: goal.skillSource, user: publicUser(one('SELECT * FROM users WHERE id = ?', userId)) })
}))

export default r
