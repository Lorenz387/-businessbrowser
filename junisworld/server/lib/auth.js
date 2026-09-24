import crypto from 'node:crypto'
import { one, run } from '../db.js'
import { ApiError } from './http.js'
import { PLANS } from './plans.js'

const COOKIE = 'jw_session'
const SESSION_DAYS = 30

export function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: 16384, r: 8, p: 1 })
  return crypto.timingSafeEqual(expected, actual)
}

export function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5)
  run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', token, userId, expires.toISOString())
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires,
    path: '/',
  })
}

export function destroySession(req, res) {
  const token = req.cookies?.[COOKIE]
  if (token) run('DELETE FROM sessions WHERE token = ?', token)
  res.clearCookie(COOKIE, { path: '/' })
}

/** Attaches req.user when a valid session cookie is present. */
export function loadUser(req, _res, next) {
  const token = req.cookies?.[COOKIE]
  if (token) {
    const row = one(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
      token,
      new Date().toISOString(),
    )
    if (row) req.user = row
  }
  next()
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(new ApiError(401, 'unauthenticated', 'Bitte melde dich an.'))
  next()
}

/** Effective plan: the user's own subscription, or the best plan of an organization they belong to. */
export function planFor(userId) {
  const sub = one('SELECT * FROM subscriptions WHERE user_id = ?', userId)
  let plan = sub && ['active', 'trialing'].includes(sub.status) ? sub.plan : 'free'
  const org = one(
    `SELECT o.plan FROM org_members m JOIN organizations o ON o.id = m.org_id
     WHERE m.user_id = ? ORDER BY CASE o.plan WHEN 'business' THEN 0 WHEN 'teams' THEN 1 ELSE 2 END LIMIT 1`,
    userId,
  )
  if (org && rank(org.plan) > rank(plan)) plan = org.plan
  return PLANS[plan] ? plan : 'free'
}

const rank = (p) => ['free', 'plus', 'family', 'pro', 'teams', 'business'].indexOf(p)

export function entitlements(userId) {
  return PLANS[planFor(userId)]
}

/** Throws a structured 402 when the feature is not part of the user's plan. */
export function requireFeature(userId, flag, label) {
  const plan = entitlements(userId)
  if (!plan.flags[flag]) {
    throw new ApiError(402, 'plan_required', `${label} ist in deinem Tarif (${plan.name}) nicht enthalten.`, { feature: flag })
  }
}

// Very small in-memory rate limiter for auth endpoints.
const attempts = new Map()
export function rateLimit(key, max = 10, windowMs = 15 * 60e3) {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + windowMs })
    return
  }
  entry.count += 1
  if (entry.count > max) {
    throw new ApiError(429, 'rate_limited', 'Zu viele Versuche. Bitte warte einige Minuten und versuche es erneut.')
  }
}
