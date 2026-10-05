import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'junis-apps-'))
process.env.JUNIS_DATA_DIR = dir

const { createApp } = await import('../app.js')
const { checkHtml } = await import('../apps/a11y/rules.js')
const { deadlines, sendDueReminders } = await import('../apps/contracts/service.js')
const { safeFetch } = await import('../apps/safeFetch.js')
const { all, one } = await import('../db.js')

let server, base, site, siteBase
before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${server.address().port}`
  site = http.createServer((req, res) => {
    res.setHeader('content-type', 'text/html; charset=utf-8')
    if (req.url === '/about') return res.end('<!doctype html><html lang="de"><head><title>Über uns</title></head><body><main><h1>Über uns</h1><button></button></main></body></html>')
    res.end('<!doctype html><html><head><title>Start</title><meta name="viewport" content="width=device-width, user-scalable=no"></head><body><h1>Shop</h1><h3>Angebote</h3><img src="a.jpg"><form><input type="email" placeholder="E-Mail"></form><a href="/about">hier</a><a href="/about"><svg></svg></a><p style="color:#999999;background-color:#ffffff">Grauer Text</p></body></html>')
  }).listen(0, '127.0.0.1')
  await new Promise((r) => site.once('listening', r))
  siteBase = `http://127.0.0.1:${site.address().port}`
})
after(() => {
  server.close()
  site.close()
  fs.rmSync(dir, { recursive: true, force: true })
})

function client() {
  let cookie = ''
  return async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', cookie }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]
    const ct = res.headers.get('content-type') || ''
    return { status: res.status, data: ct.includes('json') ? await res.json() : await res.text() }
  }
}

test('accessibility rules find typical barriers and propose fixes', () => {
  const f = checkHtml('<html><head></head><body><img src="x.png"><input id="q"><button><i class="icon"></i></button><h2>A</h2><h4>B</h4><a href="/x"></a><div id="d"></div><span id="d"></span></body></html>')
  const rules = f.map((x) => x.rule)
  for (const r of ['html-lang', 'document-title', 'image-alt', 'form-label', 'button-name', 'heading-order', 'heading-h1', 'link-name', 'duplicate-id', 'landmark-main']) assert.ok(rules.includes(r), `missing ${r}`)
  assert.match(f.find((x) => x.rule === 'image-alt').fix, /<img alt="\[Kurze Beschreibung/)
  assert.match(f.find((x) => x.rule === 'form-label').fix, /<label for="q">/)
  const clean = checkHtml('<html lang="de"><head><title>T</title></head><body><main><h1>T</h1><img src="a" alt=""><label>Name <input></label><button>OK</button><a href="/">Start</a></main></body></html>')
  assert.deepEqual(clean.map((x) => x.rule), [])
})

test('safeFetch blocks internal addresses unless explicitly allowed', async () => {
  await assert.rejects(() => safeFetch(`${siteBase}/`), /Interne Netzwerkadressen/)
  await assert.rejects(() => safeFetch('http://169.254.169.254/latest/meta-data'), /Interne Netzwerkadressen/)
  await assert.rejects(() => safeFetch('file:///etc/passwd'), /http/)
})

test('site scan crawls same-origin pages and stores findings', async () => {
  process.env.APPS_ALLOW_PRIVATE_FETCH = 'on'
  const api = client()
  await api('POST', '/api/auth/register', { email: 'w@example.org', name: 'Web', password: 'sehr-sicheres-passwort', acceptTerms: true })
  let r = await api('POST', '/api/apps/a11y/sites', { url: `${siteBase}/`, schedule: 'off', maxPages: 5 })
  assert.equal(r.status, 201)
  const id = r.data.id
  for (let i = 0; i < 50 && !(await api('GET', `/api/apps/a11y/sites/${id}`)).data.scans[0]?.finished_at; i++) await new Promise((x) => setTimeout(x, 100))
  r = await api('GET', `/api/apps/a11y/sites/${id}`)
  const scan = r.data.scans[0]
  assert.equal(scan.status, 'done', scan.error)
  assert.equal(scan.pages.length, 2)
  r = await api('GET', `/api/apps/a11y/scans/${scan.id}`)
  const rules = new Set(r.data.issues.map((i) => i.rule))
  for (const x of ['html-lang', 'meta-viewport', 'image-alt', 'form-label', 'link-generic', 'link-name', 'heading-order', 'color-contrast-inline', 'button-name']) assert.ok(rules.has(x), `missing ${x}`)
  assert.ok(scan.score < 100)
  r = await api('GET', `/api/apps/a11y/scans/${scan.id}/export.csv`)
  assert.match(r.data, /Seite;Schwere;WCAG/)
  // second scan -> diff available
  await api('POST', `/api/apps/a11y/sites/${id}/scan`, { wait: true })
  r = await api('GET', `/api/apps/a11y/sites/${id}`)
  const second = await api('GET', `/api/apps/a11y/scans/${r.data.scans[0].id}`)
  assert.deepEqual(second.data.diff, { newCount: 0, fixedCount: 0 })
  delete process.env.APPS_ALLOW_PRIVATE_FETCH
})

test('contract deadlines roll forward and reminders are sent once', async () => {
  const today = new Date('2026-08-01T00:00:00Z')
  const c = { term_end: '2026-12-31', notice_value: 3, notice_unit: 'months', auto_renew: 1, renewal_months: 12 }
  assert.deepEqual(deadlines(c, today), { termEnd: '2026-12-31', cancelBy: '2026-09-30', daysLeft: 60, rolled: 0 })
  assert.equal(deadlines(c, new Date('2026-10-05T00:00:00Z')).cancelBy, '2027-09-30')
  assert.equal(deadlines({ ...c, auto_renew: 0 }, new Date('2026-10-05T00:00:00Z')).daysLeft < 0, true)
  assert.equal(deadlines({ ...c, notice_value: 6, notice_unit: 'weeks' }, today).cancelBy, '2026-11-19')
  assert.equal(deadlines({ term_end: null }).cancelBy, null)

  const api = client()
  await api('POST', '/api/auth/register', { email: 'f@example.org', name: 'Finanz', password: 'sehr-sicheres-passwort', acceptTerms: true })
  let r = await api('POST', '/api/apps/contracts', { title: 'Büromiete', counterparty: 'Vermieter GmbH', termEnd: '2026-12-31', noticeValue: 3, noticeUnit: 'months', costAmount: 1500, costInterval: 'monthly' })
  assert.equal(r.status, 201)
  r = await api('GET', '/api/apps/contracts')
  assert.equal(r.data.summary.annualCost, 18000)
  const userId = one('SELECT id FROM users WHERE email = ?', 'f@example.org').id
  assert.equal(await sendDueReminders(today), 1) // 60 days left -> the 90-day reminder
  assert.equal(await sendDueReminders(today), 0) // not twice
  assert.equal(await sendDueReminders(new Date('2026-09-05T00:00:00Z')), 1) // 25 days left -> the 30-day reminder
  const notes = all("SELECT title FROM notifications WHERE user_id = ? AND type = 'contract'", userId)
  assert.equal(notes.length, 2)
  assert.match(notes[0].title, /bis 30\.9\.2026/)
  r = await api('GET', '/api/apps/contracts-calendar.ics')
  assert.match(r.data, /BEGIN:VEVENT[\s\S]*DTSTART;VALUE=DATE:\d{8}/)
  r = await api('POST', '/api/apps/contracts/1/extract')
  assert.ok([400, 503].includes(r.status))
})
