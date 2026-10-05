import crypto from 'node:crypto'
import { db, one, run, addColumn } from '../db.js'
import { ApiError } from './http.js'
import { PLANS } from './plans.js'
import { sha256 } from './secrets.js'

// Security columns and tables (sessions store only a hash of the token).
addColumn('sessions', 'created_at', 'TEXT')
addColumn('sessions', 'last_seen_at', 'TEXT')
addColumn('sessions', 'user_agent', 'TEXT')
addColumn('sessions', 'ip', 'TEXT')
addColumn('users', 'totp_secret', 'TEXT')
addColumn('users', 'totp_pending', 'TEXT')
addColumn('users', 'totp_enabled', 'INTEGER NOT NULL DEFAULT 0')
addColumn('users', 'totp_last_step', 'INTEGER')
addColumn('organizations', 'require_2fa', 'INTEGER NOT NULL DEFAULT 0')
db.exec(`
CREATE TABLE IF NOT EXISTS recovery_codes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TEXT,
  PRIMARY KEY (user_id, code_hash)
);
CREATE TABLE IF NOT EXISTS login_challenges (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL
);
`)

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

export function createSession(res, userId, req = null) {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5)
  const now = new Date().toISOString()
  run('INSERT INTO sessions (token, user_id, expires_at, created_at, last_seen_at, user_agent, ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
    sha256(token), userId, expires.toISOString(), now, now, String(req?.headers?.['user-agent'] || '').slice(0, 300) || null, req?.ip ?? null)
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Secure cookies need HTTPS; local http://localhost testing must keep working.
    secure: process.env.NODE_ENV === 'production' && (process.env.APP_URL || '').startsWith('https://'),
    expires,
    path: '/',
  })
}

export function destroySession(req, res) {
  const token = req.cookies?.[COOKIE]
  if (token) run('DELETE FROM sessions WHERE token IN (?, ?)', sha256(token), token)
  res.clearCookie(COOKIE, { path: '/' })
}

/** Attaches req.user when a valid session cookie is present. */
export function loadUser(req, _res, next) {
  const token = req.cookies?.[COOKIE]
  if (token && /^[0-9a-f]{64}$/.test(token)) {
    const now = new Date()
    const hash = sha256(token)
    let row = one('SELECT u.*, s.token AS session_hash, s.last_seen_at AS session_seen FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?', hash, now.toISOString())
    if (!row) {
      // Sessions from before token hashing: upgrade in place.
      row = one('SELECT u.*, s.token AS session_hash, s.last_seen_at AS session_seen FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?', token, now.toISOString())
      if (row) { run('UPDATE sessions SET token = ? WHERE token = ?', hash, token); row.session_hash = hash }
    }
    if (row) {
      if (!row.session_seen || now - new Date(row.session_seen) > 5 * 60e3) run('UPDATE sessions SET last_seen_at = ? WHERE token = ?', now.toISOString(), row.session_hash)
      req.user = row
    }
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
