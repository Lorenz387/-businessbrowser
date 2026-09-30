// PersonalAI persistence: profiles, provider settings, conversations, messages, pending approvals.
import os from 'node:os'
import path from 'node:path'
import { db, one, all, run, parseJSON } from '../db.js'

db.exec(`
CREATE TABLE IF NOT EXISTS agent_providers (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key TEXT,
  base_url TEXT,
  default_model TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, provider)
);
CREATE TABLE IF NOT EXISTS agent_profiles (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'anthropic',
  model TEXT,
  tools TEXT NOT NULL DEFAULT '["run_command","read_file","write_file","list_directory","web_fetch","remember"]',
  permission_mode TEXT NOT NULL DEFAULT 'ask',
  workspace TEXT,
  allow_outside INTEGER NOT NULL DEFAULT 0,
  max_steps INTEGER NOT NULL DEFAULT 20,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS agent_conversations (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id INTEGER REFERENCES agent_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  pending TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS agent_messages (
  id INTEGER PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

export const PROVIDERS = {
  anthropic: { label: 'Claude (Anthropic)', baseUrl: null, defaultModel: 'claude-opus-5', needsKey: true, envKey: 'ANTHROPIC_API_KEY' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', defaultModel: null, needsKey: true, envKey: 'OPENAI_API_KEY' },
  xai: { label: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1', defaultModel: null, needsKey: true, envKey: 'XAI_API_KEY' },
  ollama: { label: 'Ollama (lokal)', baseUrl: 'http://localhost:11434/v1', defaultModel: null, needsKey: false, envKey: null },
  custom: { label: 'OpenAI-kompatibel (eigene URL)', baseUrl: null, defaultModel: null, needsKey: false, envKey: null },
}

export const TOOL_NAMES = ['run_command', 'read_file', 'write_file', 'list_directory', 'web_fetch', 'remember']
export const PERMISSION_MODES = ['strict', 'ask', 'auto']

export const defaultWorkspace = () => path.join(os.homedir(), 'PersonalAI-Workspace')

/** Provider config for a user: DB values, falling back to environment and defaults. */
export function providerConfig(userId, provider) {
  const def = PROVIDERS[provider]
  if (!def) return null
  const row = one('SELECT * FROM agent_providers WHERE user_id = ? AND provider = ?', userId, provider) || {}
  return {
    provider,
    apiKey: row.api_key || (def.envKey ? process.env[def.envKey] : null) || null,
    keySource: row.api_key ? 'app' : def.envKey && process.env[def.envKey] ? 'env' : null,
    baseUrl: row.base_url || def.baseUrl,
    defaultModel: row.default_model || def.defaultModel,
  }
}

export function publicProviders(userId) {
  return Object.entries(PROVIDERS).map(([id, def]) => {
    const c = providerConfig(userId, id)
    return {
      id,
      label: def.label,
      needsKey: def.needsKey,
      hasKey: !!c.apiKey,
      keySource: c.keySource,
      keyHint: c.apiKey ? `…${c.apiKey.slice(-4)}` : null,
      baseUrl: c.baseUrl,
      defaultModel: c.defaultModel,
      configured: (!def.needsKey || !!c.apiKey) && (id === 'anthropic' || !!c.baseUrl),
    }
  })
}

export function ensureDefaultProfile(userId) {
  const p = one('SELECT * FROM agent_profiles WHERE user_id = ? ORDER BY id LIMIT 1', userId)
  if (p) return p
  const r = run("INSERT INTO agent_profiles (user_id, name, instructions) VALUES (?, 'Standard', '')", userId)
  return one('SELECT * FROM agent_profiles WHERE id = ?', Number(r.lastInsertRowid))
}

export function profileOut(p) {
  return {
    id: p.id,
    name: p.name,
    instructions: p.instructions,
    provider: p.provider,
    model: p.model,
    tools: parseJSON(p.tools, []),
    permissionMode: p.permission_mode,
    workspace: p.workspace || defaultWorkspace(),
    allowOutside: !!p.allow_outside,
    maxSteps: p.max_steps,
  }
}

export function getProfile(userId, id) {
  const p = id ? one('SELECT * FROM agent_profiles WHERE id = ? AND user_id = ?', id, userId) : null
  return profileOut(p || ensureDefaultProfile(userId))
}

export function listMessages(convId) {
  return all('SELECT id, role, data, created_at FROM agent_messages WHERE conversation_id = ? ORDER BY id', convId).map((m) => ({
    id: m.id,
    role: m.role,
    createdAt: m.created_at,
    ...parseJSON(m.data, {}),
  }))
}

export function addMessage(convId, role, data) {
  run('INSERT INTO agent_messages (conversation_id, role, data) VALUES (?, ?, ?)', convId, role, JSON.stringify(data))
  run("UPDATE agent_conversations SET updated_at = datetime('now') WHERE id = ?", convId)
}
