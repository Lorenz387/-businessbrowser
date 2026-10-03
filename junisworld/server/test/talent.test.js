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

  // Core integration: summary for Home/Career with market-based skill gaps.
  r = await firma('POST', '/api/apps/talent/company/projects', { company: 'KI-Labor GmbH', title: 'Pharmakologie-Review', domains: ['Medizin'], skills: [{ name: 'Pharmakologie', importance: 'must' }] })
  r = await anna('GET', '/api/apps/talent/summary')
  assert.equal(r.data.stage, 'ready')
  assert.deepEqual(r.data.skillGaps.map((g) => [g.name, g.must]), [['Pharmakologie', 1]])
  r = await firma('GET', '/api/apps/talent/summary')
  assert.equal(r.data.stage, 'profile')
  assert.equal(r.data.company.accepted, 1)
  assert.equal(r.data.company.projects, 2)
  r = await firma('GET', '/api/search?q=pharma')
  assert.ok(r.data.results.some((x) => x.type === 'Ausschreibung' && x.href.startsWith('/talent/projects/')))

  // Other companies cannot see the candidates.
  r = await ben('GET', `/api/apps/talent/projects/${pid}`)
  assert.equal(r.status, 403)

  // Explore mode: Ben can signal interest himself.
  r = await ben('GET', '/api/apps/talent/explore')
  assert.equal(r.data.projects.length, 2)
  assert.ok(r.data.projects.find((x) => x.id === pid).match.score < 55)
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

test('industry pack: knowledge checks and work samples become matching evidence', async () => {
  const { PACKS } = await import('../apps/talent/knowledge/index.js')
  const pack = PACKS.office
  const tina = client()
  const firma = client()
  await tina('POST', '/api/auth/register', { email: 'tina@example.org', name: 'Tina', password: 'sehr-sicheres-passwort', acceptTerms: true })
  await firma('POST', '/api/auth/register', { email: 'buero-hr@example.org', name: 'HR', password: 'sehr-sicheres-passwort', acceptTerms: true })
  const tinaId = one('SELECT id FROM users WHERE email = ?', 'tina@example.org').id
  await tina('PUT', '/api/apps/talent/profile', { headline: 'Büroassistenz', domains: ['Büro & Verwaltung'], skills: [{ name: 'Excel', years: 4 }], inPool: true })
  run("INSERT INTO talent_interviews (user_id, status, evaluation, completed_at) VALUES (?, 'completed', ?, datetime('now'))", tinaId, evaluation(70, []))

  let r = await tina('GET', '/api/apps/talent/knowledge')
  assert.equal(r.data.packs.find((p) => p.id === 'office').recommended, true)
  r = await tina('GET', '/api/apps/talent/knowledge/office')
  assert.ok(r.data.facts.length >= 5 && r.data.roles.length >= 5 && r.data.tasks.length >= 5)
  assert.equal(r.data.tasks[0].sample, undefined, 'sample solutions stay hidden')
  r = await tina('GET', '/api/apps/talent/knowledge/office/quiz/mahnwesen')
  assert.equal(r.data.questions[0].answer, undefined, 'answers stay hidden')

  // Failed attempt blocks a retry for 24 hours.
  const right = pack.quizzes.mahnwesen.map((q) => q.answer)
  const wrong = right.map((a) => (a + 1) % 4)
  r = await tina('POST', '/api/apps/talent/knowledge/office/quiz/mahnwesen', { answers: wrong })
  assert.equal(r.data.passed, false)
  assert.equal(r.data.results[0].explain.length > 0, true)
  r = await tina('POST', '/api/apps/talent/knowledge/office/quiz/mahnwesen', { answers: right })
  assert.equal(r.status, 400)
  run("UPDATE talent_assessments SET created_at = datetime('now', '-2 days') WHERE user_id = ?", tinaId)
  r = await tina('POST', '/api/apps/talent/knowledge/office/quiz/mahnwesen', { answers: right })
  assert.equal(r.data.passed, true)
  assert.equal(r.data.score, 100)

  // Without AI a work sample is stored ungraded and the sample solution is shown for self-review.
  r = await tina('POST', '/api/apps/talent/knowledge/office/tasks/rechnung', { answer: 'Es fehlen Rechnungsnummer, Steuernummer und Leistungsdatum; die Umsatzsteuer ist falsch berechnet.' })
  assert.equal(r.data.graded, false)
  assert.match(r.data.sample, /465,50/)

  // A company asking for "Mahnwesen" (alias) sees the passed knowledge check as evidence.
  r = await firma('POST', '/api/apps/talent/company/projects', { company: 'Kanzlei Ost', title: 'Assistenz Forderungsmanagement', domains: ['Büro'], skills: [{ name: 'Mahnwesen', importance: 'must' }, { name: 'Tabellenkalkulation', importance: 'nice' }] })
  r = await firma('GET', `/api/apps/talent/projects/${r.data.id}`)
  const card = r.data.candidates[0]
  assert.equal(card.detail.skills[0].source, 'quiz')
  assert.equal(card.detail.skills[1].source, 'cv', 'Excel matches Tabellenkalkulation via alias')
  assert.equal(card.knowledgeChecks[0].skill, 'Debitorenmanagement & Mahnwesen')
})
