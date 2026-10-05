// Verbindung der Apps: Cockpit, Suche und Junis-Kontext respektieren Arbeitsbereich und Rolle.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'junis-connect-'))
process.env.JUNIS_DATA_DIR = dir
delete process.env.ANTHROPIC_API_KEY
delete process.env.ANTHROPIC_AUTH_TOKEN
process.env.GEMINI_API_KEY = 'test-key'

// Fake Gemini server: records the system prompt Junis receives.
const prompts = []
const fake = http.createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    prompts.push(JSON.parse(body).systemInstruction?.parts?.[0]?.text || '')
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: 'Antwort' }] }, finishReason: 'STOP' }] }))
  })
})

let server, base, run
before(async () => {
  fake.listen(0, '127.0.0.1')
  await new Promise((r) => fake.once('listening', r))
  process.env.GEMINI_BASE_URL = `http://127.0.0.1:${fake.address().port}`
  const { createApp } = await import('../app.js')
  ;({ run } = await import('../db.js'))
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => { server.close(); fake.close(); fs.rmSync(dir, { recursive: true, force: true }) })

function client() {
  let cookie = ''
  let ws = 'private'
  const call = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', cookie, 'x-junis-workspace': ws }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]
    return { status: res.status, data: await res.json().catch(() => ({})) }
  }
  call.use = (w) => { ws = w }
  return call
}
const reg = (c, email, name) => c('POST', '/api/auth/register', { email, name, password: 'sehr-sicheres-passwort', acceptTerms: true })
const inDays = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

test('cockpit, search and Junis context follow workspace and role', async () => {
  const boss = client()
  const emp = client()
  await reg(boss, 'boss@c.de', 'Boss')
  await reg(emp, 'emp@c.de', 'Emp')
  const orgId = (await boss('POST', '/api/orgs', { name: 'Connect AG', kind: 'business' })).data.id
  await boss('POST', `/api/orgs/${orgId}/invites`, { email: 'emp@c.de', role: 'member' })
  await emp('POST', `/api/invites/${(await emp('GET', '/api/orgs')).data.invites[0].id}/accept`)
  const WS = `org:${orgId}`

  // Private data of the boss, company data of the company.
  await boss('POST', '/api/apps/contracts', { title: 'Privates Fitnessstudio', termEnd: inDays(40), noticeValue: 1, noticeUnit: 'months', autoRenew: true })
  boss.use(WS)
  await boss('POST', '/api/apps/contracts', { title: 'Büromiete Hauptstraße', counterparty: 'Immo GmbH', termEnd: inDays(20), noticeValue: 1, noticeUnit: 'days', costAmount: 1200, costInterval: 'monthly' })
  const rid = (await boss('POST', '/api/apps/gastro', { name: 'Betriebskantine' })).data.id
  const R = `/api/apps/gastro/r/${rid}`
  await boss('POST', `${R}/inventory`, { name: 'Kaffeebohnen', unit: 'kg', stock: 1, reorderLevel: 5, unitCost: 18 })
  const pos = await boss('POST', `${R}/pos`, { provider: 'test' })
  await fetch(base + pos.data.webhookPath, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ externalId: 'X1', timestamp: `${new Date().toISOString().slice(0, 10)}T12:00:00`, gross: 99.5 }) })
  await boss('POST', `/api/orgs/${orgId}/knowledge`, { title: 'Urlaubsregel', content: 'Urlaub bitte vier Wochen vorher im Teamkalender eintragen.' })

  // Cockpit in the company: tasks from contracts and GastroFlow, revenue visible to the owner.
  let r = await boss('GET', '/api/cockpit')
  assert.equal(r.data.workspace.name, 'Connect AG')
  assert.ok(r.data.tasks.some((t) => t.title.includes('Büromiete') && t.urgency === 'high'))
  assert.ok(r.data.tasks.some((t) => t.title.includes('nachbestellen')))
  assert.ok(!r.data.tasks.some((t) => t.title.includes('Fitnessstudio')), 'private contract not in company cockpit')
  const gastroSection = r.data.sections.find((s) => s.app === 'gastro')
  assert.ok(gastroSection.stats.some((s) => s.label === 'Umsatz heute'))

  // Private cockpit shows only private data.
  boss.use('private')
  r = await boss('GET', '/api/cockpit')
  assert.ok(r.data.tasks.every((t) => !t.title.includes('Büromiete')))
  assert.equal(r.data.sections.find((s) => s.app === 'contracts').stats[0].value, 1)
  boss.use(WS)

  // Member: sees contracts (read), but not the restaurant (no GastroFlow role) and no revenue.
  emp.use(WS)
  r = await emp('GET', '/api/cockpit')
  assert.ok(r.data.tasks.some((t) => t.title.includes('Büromiete')))
  assert.equal(r.data.sections.find((s) => s.app === 'gastro').stats[0].value, 0)
  assert.ok(!r.data.sections.find((s) => s.app === 'gastro').stats.some((s) => s.label === 'Umsatz heute'))

  // Search is scoped the same way.
  assert.ok((await boss('GET', '/api/search?q=kantine')).data.results.some((x) => x.type === 'Restaurant'))
  assert.ok(!(await emp('GET', '/api/search?q=kantine')).data.results.some((x) => x.type === 'Restaurant'))
  assert.ok((await emp('GET', '/api/search?q=urlaub')).data.results.some((x) => x.type === 'Firmenwissen'))
  emp.use('private')
  assert.ok(!(await emp('GET', '/api/search?q=miete')).data.results.some((x) => x.type === 'Vertrag'))
  emp.use(WS)

  // Junis in company mode gets exactly the data the person may see.
  r = await boss('POST', '/api/chat', { message: 'Welche Fristen und Urlaubsregeln gibt es?' })
  assert.equal(r.data.usedApps, true)
  let sys = prompts.at(-1)
  assert.match(sys, /Connect AG/)
  assert.match(sys, /Büromiete Hauptstraße/)
  assert.match(sys, /Umsatz heute 99,50/)
  assert.match(sys, /Urlaub bitte vier Wochen vorher/)
  assert.doesNotMatch(sys, /Fitnessstudio/, 'private data stays out of company mode')
  const bossConv = r.data.conversationId

  await emp('POST', '/api/chat', { message: 'Was steht an?' })
  sys = prompts.at(-1)
  assert.match(sys, /Büromiete/)
  assert.doesNotMatch(sys, /Betriebskantine/, 'no restaurant data without a GastroFlow role')
  assert.doesNotMatch(sys, /Umsatz/)

  // Conversations stay in their workspace.
  boss.use('private')
  assert.ok(!(await boss('GET', '/api/conversations')).data.conversations.some((c) => c.id === bossConv))
  assert.equal((await boss('GET', `/api/conversations/${bossConv}`)).status, 404)
  r = await boss('POST', '/api/chat', { message: 'Und privat?' })
  sys = prompts.at(-1)
  assert.match(sys, /Fitnessstudio/)
  assert.doesNotMatch(sys, /Büromiete|Connect AG/)
  boss.use(WS)
  assert.ok((await boss('GET', '/api/conversations')).data.conversations.some((c) => c.id === bossConv))
})

test('Talent → company: hired talent is invited into the company', async () => {
  const boss = client()
  const tal = client()
  await reg(boss, 'boss2@c.de', 'Boss2')
  await reg(tal, 'tal@c.de', 'Talentina')
  const orgId = (await boss('POST', '/api/orgs', { name: 'Hire GmbH', kind: 'business' })).data.id
  boss.use(`org:${orgId}`)
  const talId = (await tal('GET', '/api/auth/me')).data.user.id
  await tal('PUT', '/api/apps/talent/profile', { headline: 'Buchhaltung', domains: ['Büro'], skills: [{ name: 'Excel', years: 3 }], inPool: true })
  run("INSERT INTO talent_interviews (user_id, status, evaluation, completed_at) VALUES (?, 'completed', ?, datetime('now'))", talId, JSON.stringify({ overall: 80, dimensions: [], strengths: [], weaknesses: [], recommendations: [], skills: [{ name: 'Excel', level: 'Experte' }], summary: '' }))
  const pid = (await boss('POST', '/api/apps/talent/company/projects', { company: 'Hire GmbH', title: 'Buchhaltung Teilzeit', skills: [{ name: 'Excel', importance: 'must' }] })).data.id
  let p = await boss('GET', `/api/apps/talent/projects/${pid}`)
  const app = p.data.candidates[0]
  assert.equal(p.data.canInviteToOrg, true)
  assert.equal((await boss('POST', `/api/apps/talent/applications/${app.applicationId}/invite-to-org`)).status, 400, 'only after the talent accepted')
  await boss('PATCH', `/api/apps/talent/applications/${app.applicationId}`, { status: 'invited' })
  await tal('POST', `/api/apps/talent/applications/${app.applicationId}/respond`, { decision: 'accept' })
  p = await boss('GET', `/api/apps/talent/projects/${pid}`)
  assert.equal(p.data.candidates[0].inOrg, false)
  assert.equal((await boss('POST', `/api/apps/talent/applications/${app.applicationId}/invite-to-org`)).status, 200)
  const inv = (await tal('GET', '/api/orgs')).data.invites
  assert.equal(inv[0].name, 'Hire GmbH')
  await tal('POST', `/api/invites/${inv[0].id}/accept`)
  p = await boss('GET', `/api/apps/talent/projects/${pid}`)
  assert.equal(p.data.candidates[0].inOrg, true)
})
