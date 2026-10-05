import { Router } from 'express'
import { seal } from '../lib/secrets.js'
import { one, all, run } from '../db.js'
import { h, str, int, oneOf, badRequest, notFound } from '../lib/http.js'
import {
  PROVIDERS, TOOL_NAMES, PERMISSION_MODES, publicProviders, ensureDefaultProfile, profileOut, getProfile, listMessages, addMessage,
} from './store.js'
import { localToolsEnabled, TOOL_DEFS } from './tools.js'
import { continueRun, resolvePending, denyPending } from './runner.js'

const r = Router()
const uid = (req) => req.user.id

/** Messages for the client: never send provider-native raw content. */
const clientMessages = (convId) => listMessages(convId).map(({ raw: _raw, ...m }) => m)

function ownConv(req, id = req.params.id) {
  const c = one('SELECT * FROM agent_conversations WHERE id = ? AND user_id = ?', Number(id), uid(req))
  if (!c) throw notFound('Dieses Gespräch existiert nicht.')
  return c
}

function convOut(c) {
  return { id: c.id, title: c.title, profileId: c.profile_id, status: c.status, pending: c.pending ? JSON.parse(c.pending) : [], messages: clientMessages(c.id) }
}

r.get('/agent/status', h(async (req, res) => {
  ensureDefaultProfile(uid(req))
  const local = localToolsEnabled(req)
  res.json({
    local,
    platform: process.platform,
    providers: publicProviders(uid(req)),
    profiles: all('SELECT * FROM agent_profiles WHERE user_id = ? ORDER BY id', uid(req)).map(profileOut),
    tools: TOOL_NAMES.map((t) => ({ id: t, risk: TOOL_DEFS[t].risk, description: TOOL_DEFS[t].description })),
    conversations: all('SELECT id, title, status, profile_id, updated_at FROM agent_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100', uid(req)),
  })
}))

// ---------- Conversations ----------

r.get('/agent/conversations/:id', h(async (req, res) => res.json(convOut(ownConv(req)))))

r.delete('/agent/conversations/:id', h(async (req, res) => {
  const c = ownConv(req)
  run('DELETE FROM agent_conversations WHERE id = ?', c.id)
  res.json({ ok: true })
}))

r.post('/agent/chat', h(async (req, res) => {
  const userId = uid(req)
  const message = str(req.body.message, { required: true, max: 50000, field: 'Nachricht' })
  let conv = req.body.conversationId ? ownConv(req, req.body.conversationId) : null
  const profileId = int(req.body.profileId) ?? conv?.profile_id
  const profile = getProfile(userId, profileId)
  if (!conv) {
    const title = message.length > 60 ? `${message.slice(0, 57)}…` : message
    const rr = run('INSERT INTO agent_conversations (user_id, profile_id, title) VALUES (?, ?, ?)', userId, profile.id, title)
    conv = one('SELECT * FROM agent_conversations WHERE id = ?', Number(rr.lastInsertRowid))
  } else {
    if (conv.profile_id !== profile.id) run('UPDATE agent_conversations SET profile_id = ? WHERE id = ?', profile.id, conv.id)
    denyPending(conv)
  }
  addMessage(conv.id, 'user', { text: message })
  let error = null
  try {
    await continueRun(userId, conv, profile, localToolsEnabled(req).enabled)
  } catch (e) {
    if (!e.status || e.status >= 500) console.error(e)
    error = { code: e.code || 'error', message: e.message }
    addMessage(conv.id, 'notice', { text: e.message, error: true })
  }
  res.json({ ...convOut(one('SELECT * FROM agent_conversations WHERE id = ?', conv.id)), error })
}))

r.post('/agent/conversations/:id/approve', h(async (req, res) => {
  const userId = uid(req)
  const conv = ownConv(req)
  const profile = getProfile(userId, conv.profile_id)
  const decisions = req.body.decisions && typeof req.body.decisions === 'object' ? req.body.decisions : {}
  let error = null
  try {
    await resolvePending(userId, conv, profile, localToolsEnabled(req).enabled, decisions)
  } catch (e) {
    if (e.code === 'nothing_pending' || e.code === 'busy') throw e
    if (!e.status || e.status >= 500) console.error(e)
    error = { code: e.code || 'error', message: e.message }
    addMessage(conv.id, 'notice', { text: e.message, error: true })
  }
  res.json({ ...convOut(one('SELECT * FROM agent_conversations WHERE id = ?', conv.id)), error })
}))

r.post('/agent/conversations/:id/continue', h(async (req, res) => {
  const userId = uid(req)
  const conv = ownConv(req)
  if (conv.pending) throw badRequest('Es gibt noch offene Freigaben.')
  const profile = getProfile(userId, conv.profile_id)
  let error = null
  try {
    await continueRun(userId, conv, profile, localToolsEnabled(req).enabled)
  } catch (e) {
    error = { code: e.code || 'error', message: e.message }
    addMessage(conv.id, 'notice', { text: e.message, error: true })
  }
  res.json({ ...convOut(one('SELECT * FROM agent_conversations WHERE id = ?', conv.id)), error })
}))

// ---------- Profiles ----------

function readProfile(b, existing = {}) {
  const tools = Array.isArray(b.tools) ? b.tools.filter((t) => TOOL_NAMES.includes(t)) : null
  return {
    name: str(b.name, { max: 60, field: 'Name' }) ?? existing.name ?? 'Neues Profil',
    instructions: b.instructions !== undefined ? str(b.instructions, { max: 20000 }) || '' : existing.instructions ?? '',
    provider: oneOf(b.provider, Object.keys(PROVIDERS), { field: 'Anbieter', fallback: existing.provider ?? 'anthropic' }),
    model: b.model !== undefined ? str(b.model, { max: 120 }) : existing.model ?? null,
    tools: JSON.stringify(tools ?? existing.tools ?? TOOL_NAMES),
    permission_mode: oneOf(b.permissionMode, PERMISSION_MODES, { field: 'Rechte', fallback: existing.permissionMode ?? 'ask' }),
    workspace: b.workspace !== undefined ? str(b.workspace, { max: 500 }) : existing.workspace ?? null,
    allow_outside: b.allowOutside !== undefined ? (b.allowOutside ? 1 : 0) : existing.allowOutside ? 1 : 0,
    max_steps: int(b.maxSteps, { min: 1, max: 100, fallback: existing.maxSteps ?? 20 }),
  }
}

r.post('/agent/profiles', h(async (req, res) => {
  const p = readProfile(req.body)
  const rr = run('INSERT INTO agent_profiles (user_id, name, instructions, provider, model, tools, permission_mode, workspace, allow_outside, max_steps) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    uid(req), p.name, p.instructions, p.provider, p.model, p.tools, p.permission_mode, p.workspace, p.allow_outside, p.max_steps)
  res.status(201).json({ id: Number(rr.lastInsertRowid) })
}))

r.patch('/agent/profiles/:id', h(async (req, res) => {
  const row = one('SELECT * FROM agent_profiles WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!row) throw notFound('Dieses Profil existiert nicht.')
  const current = profileOut(row)
  const p = readProfile(req.body, { ...current, workspace: row.workspace })
  run('UPDATE agent_profiles SET name = ?, instructions = ?, provider = ?, model = ?, tools = ?, permission_mode = ?, workspace = ?, allow_outside = ?, max_steps = ? WHERE id = ?',
    p.name, p.instructions, p.provider, p.model, p.tools, p.permission_mode, p.workspace, p.allow_outside, p.max_steps, row.id)
  res.json({ ok: true })
}))

r.delete('/agent/profiles/:id', h(async (req, res) => {
  const count = one('SELECT COUNT(*) AS n FROM agent_profiles WHERE user_id = ?', uid(req)).n
  if (count <= 1) throw badRequest('Mindestens ein Profil muss bestehen bleiben.')
  run('DELETE FROM agent_profiles WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  res.json({ ok: true })
}))

// ---------- Providers ----------

r.put('/agent/providers/:provider', h(async (req, res) => {
  const provider = oneOf(req.params.provider, Object.keys(PROVIDERS), { field: 'Anbieter' })
  const cur = one('SELECT * FROM agent_providers WHERE user_id = ? AND provider = ?', uid(req), provider) || {}
  const apiKey = req.body.clearKey ? null : req.body.apiKey ? seal(str(req.body.apiKey, { max: 500 })) : cur.api_key ?? null
  const baseUrl = req.body.baseUrl !== undefined ? str(req.body.baseUrl, { max: 300 }) : cur.base_url ?? null
  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) throw badRequest('Die API-Adresse muss mit http:// oder https:// beginnen.')
  const model = req.body.defaultModel !== undefined ? str(req.body.defaultModel, { max: 120 }) : cur.default_model ?? null
  run(`INSERT INTO agent_providers (user_id, provider, api_key, base_url, default_model) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, provider) DO UPDATE SET api_key = excluded.api_key, base_url = excluded.base_url, default_model = excluded.default_model, updated_at = datetime('now')`,
  uid(req), provider, apiKey, baseUrl, model)
  res.json({ ok: true })
}))

export default r
