import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'junis-talent-'))
process.env.JUNIS_DATA_DIR = dir
const { createApp } = await import('../app.js')
const { run, one } = await import('../db.js')

let server, base
before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }) })

function client() {
  let cookie = ''
  return async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', cookie }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]
    return { status: res.status, data: await res.json() }
  }
}
const evaluation = (overall, skills) => JSON.stringify({ overall, dimensions: [{ name: 'Fachwissen', score: overall, evidence: 'x' }], strengths: ['a'], weaknesses: ['b'], recommendations: ['c'], skills, summary: 's' })

test('pool matching is explainable, anonymous and consent-based', async () => {
  const anna = client()
  const ben = client()
  const firma = client()
  await anna('POST', '/api/auth/register', { email: 'anna@example.org', name: 'Anna Ärztin', password: 'sehr-sicheres-passwort', acceptTerms: true })
  await ben('POST', '/api/auth/register', { email: 'ben@example.org', name: 'Ben Bauer', password: 'sehr-sicheres-passwort', acceptTerms: true })
  await firma('POST', '/api/auth/register', { email: 'hr@example.org', name: 'HR', password: 'sehr-sicheres-passwort', acceptTerms: true })
  const annaId = one('SELECT id FROM users WHERE email = ?', 'anna@example.org').id
  const benId = one('SELECT id FROM users WHERE email = ?', 'ben@example.org').id

  let r = await anna('PUT', '/api/apps/talent/profile', { headline: 'Ärztin, Innere Medizin', domains: ['Medizin'], skills: [{ name: 'Innere Medizin', years: 8 }, { name: 'Python', years: 2 }], hourlyRate: 90, availability: 'available', inPool: true })
  assert.equal(r.status, 200)
  await ben('PUT', '/api/apps/talent/profile', { headline: 'Maurer', domains: ['Bau'], skills: [{ name: 'Mauerwerk', years: 10 }], inPool: true })
  // Interviews (normally AI-run) are inserted directly here.
  run("INSERT INTO talent_interviews (user_id, status, evaluation, completed_at) VALUES (?, 'completed', ?, datetime('now'))", annaId, evaluation(82, [{ name: 'Innere Medizin', level: 'Experte' }]))
  run("INSERT INTO talent_interviews (user_id, status, evaluation, completed_at) VALUES (?, 'completed', ?, datetime('now'))", benId, evaluation(75, [{ name: 'Mauerwerk', level: 'Experte' }]))

  r = await firma('POST', '/api/apps/talent/company/projects', { company: 'KI-Labor GmbH', title: 'Medizinische KI-Antworten prüfen', type: 'expert_ai_training', domains: ['Medizin'], skills: [{ name: 'Innere Medizin', importance: 'must' }, { name: 'Python', importance: 'nice' }], rateMax: 100 })
  assert.equal(r.status, 201)
  assert.equal(r.data.matches, 1, 'only the matching talent is matched')
  const pid = r.data.id

  r = await firma('GET', `/api/apps/talent/projects/${pid}`)
  const card = r.data.candidates[0]
  assert.ok(card.score >= 80, `score ${card.score}`)
  assert.equal(card.name, undefined, 'identity hidden before consent')
  assert.equal(card.email, undefined)
  assert.match(card.alias, /^Talent #/)
  assert.equal(card.detail.skills[0].source, 'interview')

  r = await anna('GET', '/api/apps/talent/me')
  assert.equal(r.data.offers.length, 1)
  assert.equal(r.data.offers[0].status, 'matched')
  r = await ben('GET', '/api/apps/talent/me')
  assert.equal(r.data.offers.length, 0)

  // Company cannot shortlist or hire before the talent accepts.
  r = await firma('PATCH', `/api/apps/talent/applications/${card.applicationId}`, { status: 'shortlisted' })
  assert.equal(r.status, 400)
  r = await firma('PATCH', `/api/apps/talent/applications/${card.applicationId}`, { status: 'invited', message: 'Hallo!' })
  assert.equal(r.status, 200)
  r = await anna('POST', `/api/apps/talent/applications/${card.applicationId}/respond`, { decision: 'accept' })
  assert.equal(r.status, 200)
  r = await firma('GET', `/api/apps/talent/projects/${pid}`)
  assert.equal(r.data.candidates[0].name, 'Anna Ärztin', 'identity revealed after acceptance')

  // Other companies cannot see the candidates.
  r = await ben('GET', `/api/apps/talent/projects/${pid}`)
  assert.equal(r.status, 403)

  // Explore mode: Ben can signal interest himself.
  r = await ben('GET', '/api/apps/talent/explore')
  assert.equal(r.data.projects.length, 1)
  assert.ok(r.data.projects[0].match.score < 55)
  r = await ben('POST', `/api/apps/talent/projects/${pid}/interest`, { motivation: 'Ich lerne gerade Medizin-Grundlagen.' })
  assert.equal(r.status, 200)
  r = await firma('GET', `/api/apps/talent/projects/${pid}`)
  assert.equal(r.data.candidates.length, 2)

  // Data sovereignty: deleting the profile removes interviews and applications.
  r = await anna('DELETE', '/api/apps/talent/profile')
  assert.equal(one('SELECT COUNT(*) AS n FROM talent_interviews WHERE user_id = ?', annaId).n, 0)
  assert.equal(one('SELECT COUNT(*) AS n FROM talent_applications WHERE talent_id = ?', annaId).n, 0)
})

test('interview requires a profile and AI', async () => {
  const c = client()
  await c('POST', '/api/auth/register', { email: 'x@example.org', name: 'X', password: 'sehr-sicheres-passwort', acceptTerms: true })
  let r = await c('POST', '/api/apps/talent/interview')
  assert.equal(r.status, 400)
  await c('PUT', '/api/apps/talent/profile', { headline: 'Juristin', skills: [{ name: 'Vertragsrecht', years: 5 }] })
  r = await c('POST', '/api/apps/talent/interview')
  assert.equal(r.status, 503)
})
