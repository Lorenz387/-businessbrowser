import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'junis-agent-'))
process.env.JUNIS_DATA_DIR = dir
process.env.PERSONALAI_TOOLS = 'on'

const { createApp } = await import('../app.js')
const { __setModelCaller } = await import('../agent/providers.js')

let server
let base
before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => {
  server.close()
  __setModelCaller(null)
  fs.rmSync(dir, { recursive: true, force: true })
})

function client() {
  let cookie = ''
  return async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', cookie }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]
    return { status: res.status, data: await res.json() }
  }
}

test('agent runs a command only after approval and continues the loop', async () => {
  const api = client()
  await api('POST', '/api/auth/register', { email: 'a@example.org', name: 'Ada', password: 'sehr-sicheres-passwort', acceptTerms: true })
  let r = await api('GET', '/api/agent/status')
  assert.equal(r.data.local.enabled, true)
  const profile = r.data.profiles[0]
  assert.equal(profile.permissionMode, 'ask')
  const workspace = path.join(dir, 'ws')
  await api('PATCH', `/api/agent/profiles/${profile.id}`, { workspace, model: 'test-model' })

  const seen = []
  __setModelCaller(async (_cfg, { history, tools }) => {
    seen.push({ history, tools })
    const last = history[history.length - 1]
    if (last.role === 'user') return { text: 'Ich lege die Datei an und prüfe sie.', toolCalls: [{ id: 'c1', name: 'write_file', input: { path: 'hello.txt', content: 'hallo' } }, { id: 'c2', name: 'list_directory', input: {} }], raw: null }
    if (last.role === 'tool' && last.results[0].id === 'c1') return { text: '', toolCalls: [{ id: 'c3', name: 'run_command', input: { command: process.platform === 'win32' ? 'Get-Content hello.txt' : 'cat hello.txt' } }], raw: null }
    return { text: `Fertig: ${last.results[0].output.split('\n').pop()}`, toolCalls: [], raw: null }
  })

  r = await api('POST', '/api/agent/chat', { message: 'Leg eine Datei an' })
  assert.equal(r.status, 200, JSON.stringify(r.data))
  assert.equal(r.data.status, 'awaiting_approval')
  assert.deepEqual(r.data.pending.map((c) => [c.name, c.needsApproval]), [['write_file', true], ['list_directory', false]])
  assert.ok(!fs.existsSync(path.join(workspace, 'hello.txt')), 'nothing written before approval')
  assert.ok(seen[0].tools.includes('run_command'))
  const convId = r.data.id

  r = await api('POST', `/api/agent/conversations/${convId}/approve`, { decisions: { c1: 'approve' } })
  assert.equal(r.data.status, 'awaiting_approval')
  assert.equal(fs.readFileSync(path.join(workspace, 'hello.txt'), 'utf8'), 'hallo')
  assert.equal(r.data.pending[0].name, 'run_command')

  r = await api('POST', `/api/agent/conversations/${convId}/approve`, { decisions: { c3: 'approve' } })
  assert.equal(r.data.status, 'idle')
  const final = r.data.messages.filter((m) => m.role === 'assistant').pop()
  assert.equal(final.text, 'Fertig: hallo')
  assert.ok(!r.data.messages.some((m) => m.raw), 'raw provider content is not sent to the client')
})

test('denied calls are reported to the model and path escapes are blocked', async () => {
  const api = client()
  await api('POST', '/api/auth/register', { email: 'b@example.org', name: 'Ben', password: 'sehr-sicheres-passwort', acceptTerms: true })
  let r = await api('GET', '/api/agent/status')
  await api('PATCH', `/api/agent/profiles/${r.data.profiles[0].id}`, { workspace: path.join(dir, 'ws2'), model: 'm', permissionMode: 'auto' })
  __setModelCaller(async (_cfg, { history }) => {
    const last = history[history.length - 1]
    if (last.role === 'user') return { text: '', toolCalls: [{ id: 'x', name: 'read_file', input: { path: '../../etc/passwd' } }], raw: null }
    return { text: last.results[0].output, toolCalls: [], raw: null }
  })
  r = await api('POST', '/api/agent/chat', { message: 'lies was' })
  const final = r.data.messages.filter((m) => m.role === 'assistant').pop()
  assert.match(final.text, /außerhalb des Workspace/)
})

test('without local opt-in no machine tools are offered', async () => {
  process.env.PERSONALAI_TOOLS = 'off'
  const api = client()
  await api('POST', '/api/auth/register', { email: 'c@example.org', name: 'Cem', password: 'sehr-sicheres-passwort', acceptTerms: true })
  let r = await api('GET', '/api/agent/status')
  assert.equal(r.data.local.enabled, false)
  await api('PATCH', `/api/agent/profiles/${r.data.profiles[0].id}`, { model: 'm' })
  let offered
  __setModelCaller(async (_cfg, { tools, history }) => {
    offered = tools
    const last = history[history.length - 1]
    if (last.role === 'user') return { text: '', toolCalls: [{ id: 'y', name: 'run_command', input: { command: 'echo pwned' } }], raw: null }
    return { text: last.results[0].output, toolCalls: [], raw: null }
  })
  r = await api('POST', '/api/agent/chat', { message: 'führ was aus' })
  assert.deepEqual(offered, ['remember'])
  // Even if a model hallucinates the tool (auto-approved or not), execution is refused.
  if (r.data.status === 'awaiting_approval') r = await api('POST', `/api/agent/conversations/${r.data.id}/approve`, { decisions: { y: 'approve' } })
  const final = r.data.messages.filter((m) => m.role === 'assistant').pop()
  assert.match(final.text, /nicht verfügbar/)
  process.env.PERSONALAI_TOOLS = 'on'
})
