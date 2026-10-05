import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'junis-test-'))
process.env.JUNIS_DATA_DIR = dir
delete process.env.ANTHROPIC_API_KEY
delete process.env.ANTHROPIC_AUTH_TOKEN
delete process.env.STRIPE_SECRET_KEY

const { createApp } = await import('../app.js')
const { run, one } = await import('../db.js')

let server
let base
before(async () => {
  server = createApp().listen(0)
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => {
  server.close()
  fs.rmSync(dir, { recursive: true, force: true })
})

function client() {
  let cookie = ''
  return async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'content-type': 'application/json', cookie },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]
    const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text()
    return { status: res.status, data }
  }
}

test('full user journey', async () => {
  const api = client()
  assert.equal((await api('GET', '/api/dashboard')).status, 401)

  let r = await api('POST', '/api/auth/register', { email: 'lena@example.org', name: 'Lena', password: 'kurz', acceptTerms: true })
  assert.equal(r.status, 400)
  r = await api('POST', '/api/auth/register', { email: 'lena@example.org', name: 'Lena', password: 'sehr-sicheres-passwort', acceptTerms: true })
  assert.equal(r.status, 201)
  assert.equal(r.data.user.onboarded, false)
  assert.equal(r.data.user.plan, 'free')

  r = await api('POST', '/api/auth/onboarding', {
    name: 'Lena', accountType: 'student', interests: ['Daten'], weeklyMinutes: 180, learningStyle: 'practice',
    skills: [{ skillId: 'excel', selfLevel: 70 }], goal: { templateId: 'data-analyst' },
  })
  assert.equal(r.status, 200, JSON.stringify(r.data))
  const goalId = r.data.goalId

  // First user moment: goal, skill graph and next step exist immediately.
  r = await api('GET', '/api/dashboard')
  assert.equal(r.status, 200)
  assert.equal(r.data.goals.length, 1)
  assert.equal(r.data.goals[0].progress, 0, 'self-assessment must not count as progress')
  assert.ok(r.data.daily.task, 'next step must exist')
  assert.ok(r.data.daily.task.why.includes('Data Analyst'))

  r = await api('GET', '/api/skills')
  assert.ok(r.data.skills.length >= 7)
  const excel = r.data.skills.find((s) => s.id === 'excel')
  assert.equal(excel.status, 'self')
  assert.equal(excel.level, 0)

  // Free plan: gap analysis limited to 3 skills.
  r = await api('GET', `/api/goals/${goalId}`)
  assert.equal(r.data.skills.length, 3)
  assert.ok(r.data.hiddenSkillCount > 0)

  // AI features return a clear setup error without an API key.
  r = await api('POST', '/api/lessons', { skillId: 'sql' })
  assert.equal(r.status, 503)
  assert.equal(r.data.error, 'ai_unavailable')

  // Simulate a generated practice session and grade it (MC + numeric + order).
  const userId = one('SELECT id FROM users WHERE email = ?', 'lena@example.org').id
  run("UPDATE subscriptions SET plan = 'plus' WHERE user_id = ?", userId)
  const questions = [
    { id: 1, type: 'mc', prompt: 'a', options: ['x', 'y'], correctIndex: 1, acceptedAnswers: [], numericAnswer: 0, tolerance: 0, items: [], explanation: '', concept: 'SELECT', code: '' },
    { id: 2, type: 'numeric', prompt: 'b', options: [], correctIndex: -1, acceptedAnswers: [], numericAnswer: 42, tolerance: 0.5, items: [], explanation: '', concept: 'COUNT', code: '' },
    { id: 3, type: 'order', prompt: 'c', options: [], correctIndex: -1, acceptedAnswers: [], numericAnswer: 0, tolerance: 0, items: ['FROM', 'WHERE', 'SELECT'], explanation: '', concept: 'Ausführung', code: '' },
    { id: 4, type: 'open', prompt: 'd', options: [], correctIndex: -1, acceptedAnswers: ['join'], numericAnswer: 0, tolerance: 0, items: [], explanation: '', concept: 'JOIN', code: '' },
  ]
  const sid = Number(run("INSERT INTO practice_sessions (user_id, skill_id, kind, difficulty, questions) VALUES (?, 'sql', 'quiz', 3, ?)", userId, JSON.stringify(questions)).lastInsertRowid)
  r = await api('GET', `/api/practice/${sid}`)
  assert.equal(r.data.questions[0].correctIndex, undefined, 'solutions must not leak')
  r = await api('POST', `/api/practice/${sid}/submit`, { answers: { 1: 1, 2: '42,2', 3: ['FROM', 'WHERE', 'SELECT'], 4: 'JOIN' } })
  assert.equal(r.status, 200, JSON.stringify(r.data))
  assert.equal(r.data.correct, 4, JSON.stringify(r.data.results))
  assert.equal(r.data.adaptation.decision === 'harder' || r.data.adaptation.decision === 'compress', true)
  assert.equal(r.data.adaptation.difficultyAfter, 4)
  assert.ok(r.data.skill.level > 0)
  assert.equal(r.data.skill.status, 'evidenced')

  // Project with SQL → applied proof → verification.
  r = await api('POST', '/api/projects', { title: 'Umsatzanalyse', objective: 'SQL anwenden', skills: ['sql'], tasks: ['Daten laden', 'Abfragen schreiben'] })
  assert.equal(r.status, 201)
  const pid = r.data.id
  r = await api('GET', `/api/projects/${pid}`)
  assert.equal(r.data.tasks.length, 2)
  r = await api('PATCH', `/api/tasks/${r.data.tasks[0].id}`, { status: 'done' })
  r = await api('GET', `/api/projects/${pid}`)
  assert.equal(r.data.progress, 50)
  r = await api('POST', `/api/projects/${pid}/complete`, { result: 'Bericht mit fünf Abfragen' })
  assert.equal(r.status, 200)
  r = await api('GET', '/api/skills/sql')
  assert.equal(r.data.skill.status, 'evidenced', 'verification badge is a Pro feature')
  assert.equal(r.data.skill.verificationLocked, true)
  run("UPDATE subscriptions SET plan = 'pro' WHERE user_id = ?", userId)
  r = await api('GET', '/api/skills/sql')
  assert.equal(r.data.skill.status, 'verified')
  assert.ok(r.data.evidence.length >= 2)

  // Portfolio is a Pro feature.
  r = await api('GET', '/api/portfolio')
  run("UPDATE subscriptions SET plan = 'plus' WHERE user_id = ?", userId)
  r = await api('GET', '/api/portfolio')
  assert.equal(r.status, 402)
  run("UPDATE subscriptions SET plan = 'pro' WHERE user_id = ?", userId)
  r = await api('GET', '/api/portfolio')
  assert.equal(r.status, 200)
  assert.equal(r.data.projects.length, 1)
  assert.ok(r.data.skills.some((s) => s.id === 'sql'))

  // Missions
  r = await api('POST', '/api/missions/weather-app/start')
  assert.equal(r.status, 201)
  const umid = r.data.id
  r = await api('POST', `/api/user-missions/${umid}/complete`, { result: 'x' })
  assert.equal(r.status, 400)
  for (let i = 0; i < 6; i++) await api('POST', `/api/user-missions/${umid}/steps/${i}`, { done: true })
  r = await api('POST', `/api/user-missions/${umid}/complete`, { result: 'App läuft' })
  assert.equal(r.status, 200)

  // Weekly review & notifications
  r = await api('GET', '/api/weekly')
  assert.ok(r.data.learned.length >= 1)
  assert.ok(r.data.skillGains.some((s) => s.skillId === 'sql'))
  r = await api('GET', '/api/notifications')
  assert.ok(r.data.items.some((n) => n.title.includes('Wetter-App')))

  // Search & memory
  r = await api('GET', '/api/search?q=umsatz')
  assert.ok(r.data.results.some((x) => x.type === 'Projekt'))
  r = await api('GET', '/api/memory')
  assert.ok(r.data.memories.some((m) => m.kind === 'Ziel'))

  // Billing without Stripe: clear error, no cost.
  r = await api('POST', '/api/billing/checkout', { plan: 'plus' })
  assert.equal(r.status, 503)
  assert.equal(r.data.error, 'billing_unavailable')

  // Export and delete
  r = await api('GET', '/api/account/export')
  assert.equal(r.status, 200)
  assert.equal(r.data.goals.length, 1)
  assert.ok(r.data.project_tasks.length > 0)
  r = await api('DELETE', '/api/account', { password: 'falsch' })
  assert.equal(r.status, 400)
  r = await api('DELETE', '/api/account', { password: 'sehr-sicheres-passwort' })
  assert.equal(r.status, 200)
  assert.equal(one('SELECT COUNT(*) AS n FROM goals').n, 0)
})

test('organizations respect privacy and roles', async () => {
  const owner = client()
  const member = client()
  await owner('POST', '/api/auth/register', { email: 'chef@example.org', name: 'Chef', password: 'sehr-sicheres-passwort', acceptTerms: true })
  await member('POST', '/api/auth/register', { email: 'mia@example.org', name: 'Mia', password: 'sehr-sicheres-passwort', acceptTerms: true })
  let r = await owner('POST', '/api/orgs', { name: 'Acme', kind: 'team' })
  const orgId = r.data.id
  r = await owner('POST', `/api/orgs/${orgId}/invites`, { email: 'mia@example.org', role: 'member' })
  assert.equal(r.status, 201)
  r = await member('GET', '/api/orgs')
  assert.equal(r.data.invites.length, 1)
  await member('POST', `/api/invites/${r.data.invites[0].id}/accept`)
  // Member cannot invite
  r = await member('POST', `/api/orgs/${orgId}/invites`, { email: 'x@example.org' })
  assert.equal(r.status, 403)
  // Mia has a measured skill but hasn't opted in → not visible
  const miaId = one('SELECT id FROM users WHERE email = ?', 'mia@example.org').id
  run("INSERT INTO user_skills (user_id, skill_id, knowledge, practice, attempts, correct) VALUES (?, 'sql', 60, 40, 5, 4)", miaId)
  r = await owner('GET', `/api/orgs/${orgId}`)
  assert.equal(r.data.analytics.sharingMembers, 0)
  await member('PATCH', '/api/settings', { shareWithOrg: true })
  r = await owner('GET', `/api/orgs/${orgId}`)
  assert.equal(r.data.analytics.sharingMembers, 1)
  assert.equal(r.data.analytics.skills[0].id, 'sql')
  // Members don't see analytics
  r = await member('GET', `/api/orgs/${orgId}`)
  assert.equal(r.data.analytics, undefined)
  // Org plan unlocks features only once active
  r = await member('GET', '/api/auth/me')
  assert.equal(r.data.user.plan, 'free')
  run("UPDATE organizations SET plan = 'teams' WHERE id = ?", orgId)
  r = await member('GET', '/api/auth/me')
  assert.equal(r.data.user.plan, 'teams')
})
