import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'junis-ws-'))
process.env.JUNIS_DATA_DIR = dir
const { createApp } = await import('../app.js')
const { one, all, run } = await import('../db.js')
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

test('company workspace: separation, roles, app toggles, 2FA policy, hand-over', async () => {
  const boss = client()
  const mgr = client()
  const emp = client()
  const stranger = client()
  await reg(boss, 'boss@firma.de', 'Boss')
  await reg(mgr, 'mgr@firma.de', 'Manager')
  await reg(emp, 'emp@firma.de', 'Angestellte')
  await reg(stranger, 'x@other.de', 'Fremd')

  let r = await boss('POST', '/api/orgs', { name: 'Muster GmbH', kind: 'business' })
  const orgId = r.data.id
  const WS = `org:${orgId}`
  for (const [c, email, role] of [[mgr, 'mgr@firma.de', 'manager'], [emp, 'emp@firma.de', 'member']]) {
    await boss('POST', `/api/orgs/${orgId}/invites`, { email, role })
    const inv = (await c('GET', '/api/orgs')).data.invites[0]
    await c('POST', `/api/invites/${inv.id}/accept`)
    c.use(WS)
  }
  boss.use(WS)

  // Private and company data are separate.
  await boss('POST', '/api/apps/contracts', { title: 'Firmen-Leasing' })
  boss.use('private')
  await boss('POST', '/api/apps/contracts', { title: 'Privates Handy' })
  assert.deepEqual((await boss('GET', '/api/apps/contracts')).data.contracts.map((c) => c.title), ['Privates Handy'])
  boss.use(WS)
  assert.deepEqual((await boss('GET', '/api/apps/contracts')).data.contracts.map((c) => c.title), ['Firmen-Leasing'])

  // Manager can write, member can read only, strangers see nothing.
  r = await mgr('POST', '/api/apps/contracts', { title: 'Bürosoftware' })
  assert.equal(r.status, 201)
  r = await emp('GET', '/api/apps/contracts')
  assert.equal(r.data.contracts.length, 2)
  assert.equal(r.data.canWrite, false)
  assert.equal((await emp('POST', '/api/apps/contracts', { title: 'Nope' })).status, 403)
  const cid = r.data.contracts.find((c) => c.title === 'Bürosoftware').id
  assert.equal((await emp('DELETE', `/api/apps/contracts/${cid}`)).status, 403)
  stranger.use(WS)
  assert.equal((await stranger('GET', '/api/apps/contracts')).data.error, 'workspace_forbidden')
  stranger.use('private')
  assert.equal((await stranger('GET', `/api/apps/contracts/${cid}`)).status, 404)
  emp.use('private')
  assert.equal((await emp('GET', '/api/apps/contracts')).data.contracts.length, 0, 'company data never shows in the private area')
  emp.use(WS)

  // Disabling an app blocks it in the company workspace.
  assert.equal((await mgr('PUT', `/api/orgs/${orgId}/apps/contracts`, { enabled: false })).status, 403, 'only owner/admin manage apps')
  await boss('PUT', `/api/orgs/${orgId}/apps/contracts`, { enabled: false })
  r = await emp('GET', '/api/apps/contracts')
  assert.equal(r.data.error, 'app_disabled')
  r = await emp('GET', '/api/workspace')
  assert.equal(r.data.apps.find((a) => a.id === 'contracts').enabled, false)
  await boss('PUT', `/api/orgs/${orgId}/apps/contracts`, { enabled: true })

  // GastroFlow: company restaurant is visible to owner/admin/manager; members need an explicit role.
  r = await mgr('POST', '/api/apps/gastro', { name: 'Kantine' })
  const rid = r.data.id
  assert.equal((await boss('GET', `/api/apps/gastro/r/${rid}`)).data.role, 'owner', 'org owner gets owner role')
  assert.equal((await emp('GET', `/api/apps/gastro/r/${rid}`)).status, 404)
  assert.equal((await emp('GET', '/api/apps/gastro')).data.restaurants.length, 0)
  boss.use('private')
  assert.equal((await boss('GET', '/api/apps/gastro')).data.restaurants.length, 0, 'company restaurant not listed privately')
  boss.use(WS)

  // Talent: company projects are shared with managers and stay out of the private list.
  r = await mgr('POST', '/api/apps/talent/company/projects', { company: 'Muster GmbH', title: 'Büroassistenz', skills: [{ name: 'Excel', importance: 'must' }] })
  const pid = r.data.id
  assert.equal((await boss('GET', `/api/apps/talent/projects/${pid}`)).status, 200)
  assert.equal((await emp('GET', `/api/apps/talent/projects/${pid}`)).status, 403)

  // 2FA policy: only possible once the admin has 2FA; then members without 2FA are blocked.
  assert.equal((await boss('PUT', `/api/orgs/${orgId}/policy`, { require2fa: true })).status, 400)
  const setup = await boss('POST', '/api/auth/2fa/setup')
  await boss('POST', '/api/auth/2fa/enable', { code: codeAt(setup.data.secret, currentStep()) })
  assert.equal((await boss('PUT', `/api/orgs/${orgId}/policy`, { require2fa: true })).status, 200)
  assert.equal((await emp('GET', '/api/apps/contracts')).data.error, 'two_factor_required')
  assert.equal((await mgr('GET', `/api/apps/gastro/r/${rid}`)).data.error, 'two_factor_required', 'also enforced on direct links')
  assert.equal((await boss('GET', '/api/apps/contracts')).status, 200)
  const sec = await boss('GET', `/api/orgs/${orgId}/security`)
  assert.deepEqual(sec.data.membersWithout2fa.sort(), ['Angestellte', 'Manager'])
  assert.ok(sec.data.audit.some((a) => a.action === 'org.policy_changed'))
  assert.ok(sec.data.audit.some((a) => a.action === 'org.app_toggled'))
  await boss('PUT', `/api/orgs/${orgId}/policy`, { require2fa: false })

  // When the manager deletes their account, company records stay with the company.
  const mgrId = one("SELECT id FROM users WHERE email = 'mgr@firma.de'").id
  mgr.use('private')
  assert.equal((await mgr('DELETE', '/api/account', { password: 'sehr-sicheres-passwort' })).status, 200)
  assert.equal(one('SELECT COUNT(*) AS n FROM contracts WHERE org_id = ?', orgId).n, 2)
  assert.equal(one('SELECT COUNT(*) AS n FROM gastro_restaurants WHERE org_id = ?', orgId).n, 1)
  assert.equal(one('SELECT COUNT(*) AS n FROM talent_projects WHERE org_id = ?', orgId).n, 1)
  assert.equal(all('SELECT * FROM contracts WHERE user_id = ?', mgrId).length, 0)
  run('SELECT 1')
})
