import { Router } from 'express'
import { one, all, run, tx } from '../db.js'
import { h, str, int, oneOf, badRequest, ApiError } from '../lib/http.js'
import crypto from 'node:crypto'
import QRCode from 'qrcode'
import { hashPassword, verifyPassword, createSession, destroySession, requireAuth, rateLimit, planFor } from '../lib/auth.js'
import { seal, unseal, sha256 } from '../lib/secrets.js'
import { newSecret, verifyCode, otpauthUri } from '../lib/totp.js'
import { audit, userAudit } from '../lib/audit.js'
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
    twoFactor: !!u.totp_enabled,
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
  createSession(res, userId, req)
  audit(req, 'auth.login', { userId, meta: { via: 'register' } })
  res.status(201).json({ user: publicUser(one('SELECT * FROM users WHERE id = ?', userId)) })
}))

r.post('/login', h(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  rateLimit(`login:${req.ip}:${email}`, 8)
  const u = one('SELECT * FROM users WHERE email = ?', email)
  if (!u || !verifyPassword(String(req.body.password || ''), u.password_hash)) {
    if (u) audit(req, 'auth.login_failed', { userId: u.id })
    throw new ApiError(401, 'invalid_credentials', 'E-Mail oder Passwort ist nicht korrekt.')
  }
  if (u.totp_enabled) {
    // Second step: password was right, now the authenticator code is needed.
    const challenge = crypto.randomBytes(32).toString('hex')
    run("DELETE FROM login_challenges WHERE user_id = ? OR expires_at < datetime('now')", u.id)
    run('INSERT INTO login_challenges (token_hash, user_id, expires_at) VALUES (?, ?, ?)', sha256(challenge), u.id, new Date(Date.now() + 5 * 60e3).toISOString().replace('T', ' ').slice(0, 19))
    return res.json({ twoFactorRequired: true, challenge })
  }
  createSession(res, u.id, req)
  audit(req, 'auth.login', { userId: u.id })
  res.json({ user: publicUser(u) })
}))

/** Checks an authenticator code (with replay protection) or a one-time recovery code. */
function checkSecondFactor(req, u, { code, recoveryCode }) {
  if (code) {
    const step = verifyCode(unseal(u.totp_secret), code)
    if (step == null || (u.totp_last_step != null && step <= u.totp_last_step)) return false
    run('UPDATE users SET totp_last_step = ? WHERE id = ?', step, u.id)
    return true
  }
  if (recoveryCode) {
    const hash = sha256(String(recoveryCode).trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))
    const hit = one('SELECT 1 FROM recovery_codes WHERE user_id = ? AND code_hash = ? AND used_at IS NULL', u.id, hash)
    if (!hit) return false
    run("UPDATE recovery_codes SET used_at = datetime('now') WHERE user_id = ? AND code_hash = ?", u.id, hash)
    audit(req, 'auth.recovery_code_used', { userId: u.id })
    return true
  }
  return false
}

r.post('/login/2fa', h(async (req, res) => {
  rateLimit(`2fa:${req.ip}`, 10)
  const ch = one("SELECT * FROM login_challenges WHERE token_hash = ? AND expires_at > datetime('now')", sha256(String(req.body.challenge || '')))
  if (!ch) throw new ApiError(401, 'challenge_expired', 'Die Anmeldung ist abgelaufen. Bitte melde dich erneut an.')
  if (ch.attempts >= 5) {
    run('DELETE FROM login_challenges WHERE token_hash = ?', ch.token_hash)
    throw new ApiError(429, 'rate_limited', 'Zu viele falsche Codes. Bitte melde dich erneut an.')
  }
  const u = one('SELECT * FROM users WHERE id = ?', ch.user_id)
  if (!checkSecondFactor(req, u, req.body)) {
    run('UPDATE login_challenges SET attempts = attempts + 1 WHERE token_hash = ?', ch.token_hash)
    audit(req, 'auth.login_failed', { userId: u.id, meta: { step: '2fa' } })
    throw new ApiError(401, 'invalid_code', 'Der Code ist nicht korrekt oder wurde bereits verwendet.')
  }
  run('DELETE FROM login_challenges WHERE token_hash = ?', ch.token_hash)
  createSession(res, u.id, req)
  audit(req, 'auth.login', { userId: u.id, meta: { twoFactor: true } })
  res.json({ user: publicUser(u) })
}))

r.post('/logout', (req, res) => {
  if (req.user) audit(req, 'auth.logout')
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
  createSession(res, req.user.id, req)
  audit(req, 'auth.password_changed')
  res.json({ ok: true })
}))

// ---------- Zwei-Faktor-Anmeldung ----------

const newRecoveryCodes = (userId) => {
  const codes = Array.from({ length: 10 }, () => crypto.randomBytes(5).toString('hex').toUpperCase().replace(/(.{5})/, '$1-'))
  run('DELETE FROM recovery_codes WHERE user_id = ?', userId)
  for (const c of codes) run('INSERT INTO recovery_codes (user_id, code_hash) VALUES (?, ?)', userId, sha256(c.replace('-', '')))
  return codes
}

r.get('/2fa', requireAuth, (req, res) => {
  res.json({
    enabled: !!req.user.totp_enabled,
    recoveryCodesLeft: one('SELECT COUNT(*) AS n FROM recovery_codes WHERE user_id = ? AND used_at IS NULL', req.user.id).n,
  })
})

r.post('/2fa/setup', requireAuth, h(async (req, res) => {
  if (req.user.totp_enabled) throw badRequest('Die Zwei-Faktor-Anmeldung ist bereits aktiv.')
  const secret = newSecret()
  run('UPDATE users SET totp_pending = ? WHERE id = ?', seal(secret), req.user.id)
  const uri = otpauthUri(secret, req.user.email)
  res.json({ secret, uri, qrSvg: await QRCode.toString(uri, { type: 'svg', margin: 1, width: 200 }) })
}))

r.post('/2fa/enable', requireAuth, h(async (req, res) => {
  rateLimit(`2fa-enable:${req.user.id}`, 10)
  const pending = req.user.totp_pending && unseal(req.user.totp_pending)
  if (!pending) throw badRequest('Bitte starte die Einrichtung zuerst.')
  const step = verifyCode(pending, req.body.code)
  if (step == null) throw badRequest('Der Code ist nicht korrekt. Prüfe die Uhrzeit auf deinem Gerät und versuche es erneut.')
  const codes = tx(() => {
    run('UPDATE users SET totp_secret = ?, totp_pending = NULL, totp_enabled = 1, totp_last_step = ? WHERE id = ?', seal(pending), step, req.user.id)
    return newRecoveryCodes(req.user.id)
  })
  audit(req, 'auth.2fa_enabled')
  res.json({ ok: true, recoveryCodes: codes })
}))

r.post('/2fa/disable', requireAuth, h(async (req, res) => {
  rateLimit(`2fa-disable:${req.user.id}`, 10)
  if (!req.user.totp_enabled) throw badRequest('Die Zwei-Faktor-Anmeldung ist nicht aktiv.')
  if (!verifyPassword(String(req.body.password || ''), req.user.password_hash)) throw badRequest('Das Passwort ist nicht korrekt.')
  if (!checkSecondFactor(req, req.user, req.body)) throw badRequest('Der Code ist nicht korrekt.')
  const required = one("SELECT o.name FROM org_members m JOIN organizations o ON o.id = m.org_id WHERE m.user_id = ? AND o.require_2fa = 1 LIMIT 1", req.user.id)
  if (required) throw badRequest(`Die Organisation „${required.name}“ verlangt die Zwei-Faktor-Anmeldung.`)
  tx(() => {
    run('UPDATE users SET totp_secret = NULL, totp_pending = NULL, totp_enabled = 0, totp_last_step = NULL WHERE id = ?', req.user.id)
    run('DELETE FROM recovery_codes WHERE user_id = ?', req.user.id)
  })
  audit(req, 'auth.2fa_disabled')
  res.json({ ok: true })
}))

r.post('/2fa/recovery-codes', requireAuth, h(async (req, res) => {
  if (!req.user.totp_enabled) throw badRequest('Die Zwei-Faktor-Anmeldung ist nicht aktiv.')
  if (!checkSecondFactor(req, req.user, { code: req.body.code })) throw badRequest('Der Code ist nicht korrekt.')
  res.json({ recoveryCodes: newRecoveryCodes(req.user.id) })
}))

// ---------- Sitzungen & Sicherheitsprotokoll ----------

r.get('/sessions', requireAuth, (req, res) => {
  res.json(all("SELECT token, created_at, last_seen_at, user_agent, ip FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY last_seen_at DESC", req.user.id, new Date().toISOString())
    .map((x) => ({ id: x.token.slice(0, 16), createdAt: x.created_at, lastSeenAt: x.last_seen_at, userAgent: x.user_agent, ip: x.ip, current: x.token === req.user.session_hash })))
})

r.delete('/sessions/:id', requireAuth, h(async (req, res) => {
  if (!/^[0-9a-f]{16}$/.test(req.params.id)) throw badRequest('Ungültige Sitzung.')
  const n = run('DELETE FROM sessions WHERE user_id = ? AND substr(token, 1, 16) = ? AND token != ?', req.user.id, req.params.id, req.user.session_hash).changes
  if (n) audit(req, 'auth.session_revoked')
  res.json({ ok: true, revoked: Number(n) })
}))

r.delete('/sessions', requireAuth, h(async (req, res) => {
  const n = run('DELETE FROM sessions WHERE user_id = ? AND token != ?', req.user.id, req.user.session_hash).changes
  if (n) audit(req, 'auth.session_revoked', { meta: { count: Number(n) } })
  res.json({ ok: true, revoked: Number(n) })
}))

r.get('/security-log', requireAuth, (req, res) => res.json(userAudit(req.user.id)))

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
