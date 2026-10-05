// Büro-Assistent: Arbeitsbereiche, Rechte im Team, Posteingang → Aufgaben/Vertrag, Erinnerungen, Cockpit, KI-Einordnung.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'junis-office-'))
process.env.JUNIS_DATA_DIR = dir
delete process.env.ANTHROPIC_API_KEY
delete process.env.ANTHROPIC_AUTH_TOKEN
process.env.GEMINI_API_KEY = 'test-key'

const inDays = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

// Fake Gemini server: answers the classification with a fixed extraction.
const requests = []
const fake = http.createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    requests.push(JSON.parse(body))
    const out = { title: 'Rechnung Bürobedarf Müller GmbH', sender: 'Müller GmbH', category: 'rechnung', summary: 'Rechnung über Büromaterial.', reference: 'RE-2026-117', deadline: inDays(10), amount: 238.5, tasks: [{ title: 'Rechnung prüfen und bezahlen', due: inDays(8) }, { title: 'Beleg ablegen', due: 'bald' }], isContract: false }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(out) }] }, finishReason: 'STOP' }] }))
  })
})

let server, base, sendTaskReminders
before(async () => {
  fake.listen(0, '127.0.0.1')
  await new Promise((r) => fake.once('listening', r))
  process.env.GEMINI_BASE_URL = `http://127.0.0.1:${fake.address().port}`
  const { createApp } = await import('../app.js')
  ;({ sendTaskReminders } = await import('../apps/office/service.js'))
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => { server.close(); fake.close(); fs.rmSync(dir, { recursive: true, force: true }) })

function client() {
  let cookie = ''
  let ws = 'private'
  const call = async (method, url, body) => {
    const form = body instanceof FormData
    const res = await fetch(base + url, { method, headers: { ...(form ? {} : { 'content-type': 'application/json' }), cookie, 'x-junis-workspace': ws }, body: method === 'GET' ? undefined : form ? body : JSON.stringify(body ?? {}) })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]
    return { status: res.status, data: await res.json().catch(() => ({})) }
  }
  call.use = (w) => { ws = w }
  return call
}
const reg = (c, email, name) => c('POST', '/api/auth/register', { email, name, password: 'sehr-sicheres-passwort', acceptTerms: true })

let boss, emp, other, orgId, WS, bossId, empId
test('setup: company with boss and employee', async () => {
  boss = client(); emp = client(); other = client()
  bossId = (await reg(boss, 'chef@buero.de', 'Chefin')).data.user.id
  empId = (await reg(emp, 'mia@buero.de', 'Mia')).data.user.id
  await reg(other, 'fremd@x.de', 'Fremd')
  orgId = (await boss('POST', '/api/orgs', { name: 'Büro GmbH', kind: 'business' })).data.id
  await boss('POST', `/api/orgs/${orgId}/invites`, { email: 'mia@buero.de', role: 'member' })
  await emp('POST', `/api/invites/${(await emp('GET', '/api/orgs')).data.invites[0].id}/accept`)
  WS = `org:${orgId}`
  assert.ok(bossId && empId)
})

test('private tasks stay private; company tasks are shared', async () => {
  let r = await boss('POST', '/api/apps/office/tasks', { title: 'Privat: Steuererklärung', dueDate: inDays(3) })
  assert.equal(r.status, 201)
  assert.equal(r.data.assignee_id, bossId, 'private tasks belong to the person')
  // Private: nobody else can be assigned.
  r = await boss('POST', '/api/apps/office/tasks', { title: 'x', assigneeId: empId })
  assert.equal(r.status, 400)
  // A follow-up needs a date.
  r = await boss('POST', '/api/apps/office/tasks', { title: 'WV', kind: 'followup' })
  assert.equal(r.status, 400)

  boss.use(WS); emp.use(WS)
  r = await boss('POST', '/api/apps/office/tasks', { title: 'Angebot Müller nachfassen', kind: 'followup', dueDate: inDays(2), assigneeId: empId })
  assert.equal(r.status, 201)
  const assigned = r.data
  r = await boss('POST', '/api/apps/office/tasks', { title: 'Druckerpapier bestellen' })
  const unassigned = r.data
  // Outsiders can't be assigned.
  r = await boss('POST', '/api/apps/office/tasks', { title: 'x', assigneeId: (await other('GET', '/api/auth/me')).data.user?.id ?? 99999 })
  assert.equal(r.status, 400)

  const home = (await emp('GET', '/api/apps/office')).data
  assert.equal(home.workspace.type, 'org')
  assert.deepEqual(home.tasks.map((t) => t.title).sort(), ['Angebot Müller nachfassen', 'Druckerpapier bestellen'])
  assert.equal(home.assignees.length, 2)
  assert.ok(!JSON.stringify(home).includes('Steuererklärung'))

  // The assignee was notified, with a link that switches to the company.
  const n = (await emp('GET', '/api/notifications')).data.items.find((x) => x.body?.includes?.('nachfassen') || x.message?.includes?.('nachfassen') || JSON.stringify(x).includes('nachfassen'))
  assert.ok(n, 'assignment notification')
  assert.ok(JSON.stringify(n).includes(`ws=org:${orgId}`))

  // Member rights: may complete own task, may take over unassigned, may not edit or delete others'.
  r = await emp('PATCH', `/api/apps/office/tasks/${assigned.id}`, { status: 'done' })
  assert.equal(r.status, 200)
  assert.ok(r.data.done_at)
  r = await emp('PATCH', `/api/apps/office/tasks/${unassigned.id}`, { title: 'umbenannt' })
  assert.equal(r.status, 403)
  r = await emp('PATCH', `/api/apps/office/tasks/${unassigned.id}`, { assigneeId: empId })
  assert.equal(r.status, 200)
  assert.equal(r.data.assignee_id, empId)
  r = await emp('DELETE', `/api/apps/office/tasks/${unassigned.id}`)
  assert.equal(r.status, 403)
  r = await boss('DELETE', `/api/apps/office/tasks/${unassigned.id}`)
  assert.equal(r.status, 200)

  // Other people can't see company records, not even by id.
  other.use(WS)
  assert.equal((await other('GET', '/api/apps/office')).status, 403)
  other.use('private')
  r = await other('PATCH', `/api/apps/office/tasks/${assigned.id}`, { status: 'open' })
  assert.equal(r.status, 404)
})

test('inbox: upload, AI classification, tasks from the document, assignment', async () => {
  const fd = new FormData()
  fd.append('file', new Blob(['Rechnung Nr. RE-2026-117\nMüller GmbH\nBetrag: 238,50 EUR\nZahlbar innerhalb von 10 Tagen.'], { type: 'text/plain' }), 'rechnung.txt')
  let r = await emp('POST', '/api/apps/office/inbox', fd)
  assert.equal(r.status, 201)
  const id = r.data.id
  assert.equal(r.data.title, 'rechnung')
  assert.equal(r.data.status, 'new')

  r = await emp('POST', `/api/apps/office/inbox/${id}/classify`)
  assert.equal(r.status, 200, JSON.stringify(r.data))
  assert.equal(r.data.extraction.category, 'rechnung')
  assert.equal(r.data.extraction.deadline, inDays(10))
  assert.equal(r.data.extraction.tasks[1].due, '', 'invalid dates are dropped')
  // The document text went to the AI, with the JSON schema.
  const last = requests.at(-1)
  assert.ok(JSON.stringify(last.contents).includes('RE-2026-117'))
  assert.ok(last.generationConfig?.responseJsonSchema || last.config?.responseJsonSchema || JSON.stringify(last).includes('isContract'))

  const e = r.data.extraction
  r = await emp('PATCH', `/api/apps/office/inbox/${id}`, { title: e.title, sender: e.sender, category: e.category, reference: e.reference, deadline: e.deadline, amount: e.amount, summary: e.summary })
  assert.equal(r.status, 200)
  assert.equal(r.data.amount, 238.5)
  assert.equal(r.data.categoryLabel, 'Rechnung')

  r = await emp('POST', `/api/apps/office/inbox/${id}/tasks`, { tasks: e.tasks, assigneeId: bossId })
  assert.equal(r.status, 201)
  assert.equal(r.data.created, 2)
  r = await boss('GET', `/api/apps/office/inbox/${id}`)
  assert.equal(r.data.status, 'assigned')
  assert.equal(r.data.tasks.length, 2)
  assert.ok(r.data.tasks.every((t) => t.assignee_id === bossId))

  // Search finds the document by reference number — only in the company.
  r = await boss('GET', '/api/search?q=RE-2026')
  assert.ok(r.data.results.some((x) => x.type === 'Posteingang'))
  boss.use('private')
  r = await boss('GET', '/api/search?q=RE-2026')
  assert.ok(!r.data.results.some((x) => x.type === 'Posteingang'))
  boss.use(WS)
})

test('inbox → contract (Fristen-Manager), members need contract write rights', async () => {
  let r = await boss('POST', '/api/apps/office/inbox', { title: 'Wartungsvertrag Kopierer', sender: 'Kopier AG' })
  const id = r.data.id
  r = await emp('POST', `/api/apps/office/inbox/${id}/to-contract`)
  assert.equal(r.status, 403)
  r = await boss('POST', `/api/apps/office/inbox/${id}/to-contract`)
  assert.equal(r.status, 201)
  const c = (await boss('GET', `/api/apps/contracts/${r.data.contractId}`)).data
  assert.equal(c.contract?.title ?? c.title, 'Wartungsvertrag Kopierer')
  r = await boss('POST', `/api/apps/office/inbox/${id}/to-contract`)
  assert.equal(r.status, 400, 'only once')
  r = await boss('GET', `/api/apps/office/inbox/${id}`)
  assert.equal(r.data.category, 'vertrag')
  assert.equal(r.data.status, 'done')
})

test('reminders, cockpit and templates', async () => {
  let r = await boss('POST', '/api/apps/office/tasks', { title: 'Überfällige Ablage', dueDate: inDays(-2), assigneeId: empId })
  assert.equal(r.status, 201)
  const sent = sendTaskReminders()
  assert.ok(sent >= 1)
  assert.equal(sendTaskReminders(), 0, 'reminders are sent once per due date')
  const notes = JSON.stringify((await emp('GET', '/api/notifications')).data.items)
  assert.ok(notes.includes('Überfällige Ablage'))

  const ck = (await emp('GET', '/api/cockpit')).data
  assert.ok(ck.tasks.some((t) => t.title.includes('Überfällige Ablage') && t.urgency === 'high'), JSON.stringify(ck.tasks))
  boss.use('private')
  const ckPrivate = (await boss('GET', '/api/cockpit')).data
  assert.ok(!JSON.stringify(ckPrivate).includes('Überfällige Ablage'))
  assert.ok(!JSON.stringify(ckPrivate).includes('Steuererklärung'), 'due in 3 days: outside the 2-day cockpit window')
  await boss('POST', '/api/apps/office/tasks', { title: 'Privat: Arzttermin bestätigen', dueDate: inDays(0) })
  assert.ok((await boss('GET', '/api/cockpit')).data.tasks.some((t) => t.title.includes('Arzttermin') && t.urgency === 'high'))
  boss.use(WS)

  const home = (await emp('GET', '/api/apps/office')).data
  assert.ok(home.templates.some((t) => t.id === 'builtin:zahlungserinnerung'))
  r = await emp('POST', '/api/apps/office/templates', { name: 'Hausvorlage', subject: 'Betreff {{x}}', body: 'Sehr geehrte Damen und Herren,\n\n{{text}}\n\nMit freundlichen Grüßen' })
  assert.equal(r.status, 201)
  const tid = r.data.id
  assert.ok((await boss('GET', '/api/apps/office')).data.templates.some((t) => t.id === tid), 'company templates are shared')
  boss.use('private')
  assert.ok(!(await boss('GET', '/api/apps/office')).data.templates.some((t) => t.id === tid))
  boss.use(WS)
})

test('app can be switched off for the company', async () => {
  let r = await boss('PUT', `/api/orgs/${orgId}/apps/office`, { enabled: false })
  assert.equal(r.status, 200, JSON.stringify(r.data))
  r = await emp('GET', '/api/apps/office')
  assert.equal(r.status, 403)
  await boss('PUT', `/api/orgs/${orgId}/apps/office`, { enabled: true })
  r = await emp('GET', '/api/apps/office')
  assert.equal(r.status, 200)
})
