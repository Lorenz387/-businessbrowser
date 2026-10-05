import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'junis-sec-'))
process.env.JUNIS_DATA_DIR = dir
const { createApp } = await import('../app.js')
const { one, run } = await import('../db.js')
const { codeAt, currentStep } = await import('../lib/totp.js')

let server, base
before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }) })

function client() {
  let cookie = ''
  return async (method, url, body, headers = {}) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', cookie, 'user-agent': 'TestAgent/1.0', ...headers }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]
    return { status: res.status, data: await res.json().catch(() => ({})), cookie }
  }
}

test('sessions are stored hashed and can be revoked', async () => {
  const a = client()
  const r = await a('POST', '/api/auth/register', { email: 'sec@example.org', name: 'Sec', password: 'sehr-sicheres-passwort', acceptTerms: true })
  const token = r.cookie.split('=')[1]
  assert.equal(one('SELECT COUNT(*) AS n FROM sessions WHERE token = ?', token).n, 0, 'raw token is never stored')
  const b = client()
  await b('POST', '/api/auth/login', { email: 'sec@example.org', password: 'sehr-sicheres-passwort' })
  let s = await a('GET', '/api/auth/sessions')
  assert.equal(s.data.length, 2)
  assert.equal(s.data.filter((x) => x.current).length, 1)
  assert.equal(s.data[0].userAgent, 'TestAgent/1.0')
  await a('DELETE', '/api/auth/sessions')
  assert.equal((await b('GET', '/api/dashboard')).status, 401, 'other session revoked')
  assert.equal((await a('GET', '/api/dashboard')).status, 200, 'current session kept')
  const log = await a('GET', '/api/auth/security-log')
  assert.ok(log.data.some((x) => x.action === 'auth.session_revoked'))
})

test('two-factor login with TOTP, replay protection and recovery codes', async () => {
  const a = client()
  await a('POST', '/api/auth/register', { email: 'tfa@example.org', name: 'TFA', password: 'sehr-sicheres-passwort', acceptTerms: true })
  const setup = await a('POST', '/api/auth/2fa/setup')
  assert.match(setup.data.uri, /^otpauth:\/\/totp\//)
  assert.match(setup.data.qrSvg, /<svg/)
  const secret = setup.data.secret
  assert.equal((await a('POST', '/api/auth/2fa/enable', { code: '000000' })).status, 400)
  const en = await a('POST', '/api/auth/2fa/enable', { code: codeAt(secret, currentStep()) })
  assert.equal(en.data.recoveryCodes.length, 10)
  const userRow = one("SELECT totp_secret FROM users WHERE email = 'tfa@example.org'")
  assert.match(userRow.totp_secret, /^enc:v1:/, 'secret encrypted at rest')

  // Password alone is not enough.
  const b = client()
  let r = await b('POST', '/api/auth/login', { email: 'tfa@example.org', password: 'sehr-sicheres-passwort' })
  assert.equal(r.data.twoFactorRequired, true)
  assert.equal(r.data.user, undefined)
  assert.equal((await b('GET', '/api/dashboard')).status, 401)
  // The code that was just used to enable 2FA cannot be replayed.
  const used = one("SELECT totp_last_step FROM users WHERE email = 'tfa@example.org'").totp_last_step
  r = await b('POST', '/api/auth/login/2fa', { challenge: r.data.challenge, code: codeAt(secret, used) })
  assert.equal(r.status, 401)
  // Recovery code works exactly once.
  r = await b('POST', '/api/auth/login', { email: 'tfa@example.org', password: 'sehr-sicheres-passwort' })
  const ok = await b('POST', '/api/auth/login/2fa', { challenge: r.data.challenge, recoveryCode: en.data.recoveryCodes[0].toLowerCase() })
  assert.equal(ok.status, 200)
  assert.equal(ok.data.user.twoFactor, true)
  const c = client()
  r = await c('POST', '/api/auth/login', { email: 'tfa@example.org', password: 'sehr-sicheres-passwort' })
  assert.equal((await c('POST', '/api/auth/login/2fa', { challenge: r.data.challenge, recoveryCode: en.data.recoveryCodes[0] })).status, 401)
  // A fresh time step works.
  run("UPDATE users SET totp_last_step = totp_last_step - 5 WHERE email = 'tfa@example.org'")
  r = await c('POST', '/api/auth/login', { email: 'tfa@example.org', password: 'sehr-sicheres-passwort' })
  assert.equal((await c('POST', '/api/auth/login/2fa', { challenge: r.data.challenge, code: codeAt(secret, currentStep()) })).status, 200)
  // Too many wrong codes invalidate the challenge.
  const d = client()
  r = await d('POST', '/api/auth/login', { email: 'tfa@example.org', password: 'sehr-sicheres-passwort' })
  for (let i = 0; i < 5; i++) await d('POST', '/api/auth/login/2fa', { challenge: r.data.challenge, code: '123456' })
  assert.equal((await d('POST', '/api/auth/login/2fa', { challenge: r.data.challenge, code: '123456' })).status, 429)

  const log = await a('GET', '/api/auth/security-log')
  assert.ok(log.data.some((x) => x.action === 'auth.2fa_enabled'))
  assert.ok(log.data.some((x) => x.action === 'auth.recovery_code_used'))
})

test('stored provider keys are encrypted', async () => {
  const a = client()
  await a('POST', '/api/auth/register', { email: 'keys@example.org', name: 'Keys', password: 'sehr-sicheres-passwort', acceptTerms: true })
  await a('PUT', '/api/agent/providers/openai', { apiKey: 'sk-test-geheim' })
  const row = one("SELECT api_key FROM agent_providers WHERE provider = 'openai'")
  assert.match(row.api_key, /^enc:v1:/)
  assert.ok(!row.api_key.includes('geheim'))
})
