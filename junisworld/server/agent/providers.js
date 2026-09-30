// Provider-neutral model calls with tool use.
// Neutral history: {role:'user', text} | {role:'assistant', text, toolCalls:[{id,name,input}], raw?} | {role:'tool', results:[{id,name,output,isError}]}
import Anthropic from '@anthropic-ai/sdk'
import { ApiError } from '../lib/http.js'
import { TOOL_DEFS } from './tools.js'

// ---------- Anthropic (official SDK) ----------

function toAnthropic(history, provider, model) {
  const out = []
  for (const m of history) {
    if (m.role === 'user') out.push({ role: 'user', content: m.text })
    else if (m.role === 'assistant') {
      // Replay provider-native content (incl. thinking blocks) when it came from the same model.
      if (m.raw && m.raw.provider === provider && m.raw.model === model) out.push({ role: 'assistant', content: m.raw.content })
      else {
        const content = []
        if (m.text) content.push({ type: 'text', text: m.text })
        for (const c of m.toolCalls || []) content.push({ type: 'tool_use', id: c.id, name: c.name, input: c.input || {} })
        out.push({ role: 'assistant', content: content.length ? content : [{ type: 'text', text: '…' }] })
      }
    } else if (m.role === 'tool') {
      out.push({ role: 'user', content: m.results.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: r.output || '(leer)', is_error: !!r.isError })) })
    }
  }
  return out
}

async function callAnthropic(cfg, { model, system, history, tools }) {
  if (!cfg.apiKey) throw new ApiError(400, 'provider_not_configured', 'Für Claude ist kein API-Schlüssel hinterlegt. Trage ihn unter PersonalAI → Einstellungen → Anbieter ein.')
  const client = new Anthropic({ apiKey: cfg.apiKey })
  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 16000,
      system,
      messages: toAnthropic(history, 'anthropic', model),
      ...(tools.length ? { tools: tools.map((t) => ({ name: t, description: TOOL_DEFS[t].description, input_schema: TOOL_DEFS[t].parameters })) } : {}),
    })
    if (msg.stop_reason === 'refusal') return { text: 'Das Modell hat diese Anfrage abgelehnt.', toolCalls: [], raw: null }
    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
    const toolCalls = msg.content.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, name: b.name, input: b.input }))
    return { text, toolCalls, raw: { provider: 'anthropic', model, content: msg.content }, truncated: msg.stop_reason === 'max_tokens' }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new ApiError(400, 'provider_auth', 'Der Claude-API-Schlüssel ist ungültig.')
    if (e instanceof Anthropic.NotFoundError) throw new ApiError(400, 'provider_model', `Das Modell „${model}“ ist bei Anthropic nicht verfügbar.`)
    if (e instanceof Anthropic.RateLimitError) throw new ApiError(503, 'provider_busy', 'Claude ist gerade ausgelastet. Bitte kurz warten und erneut versuchen.')
    if (e instanceof Anthropic.APIError) throw new ApiError(502, 'provider_error', `Claude-Fehler: ${e.message}`)
    throw e
  }
}

// ---------- OpenAI-compatible (OpenAI, xAI, Ollama, custom) via Chat Completions ----------

function toOpenAI(system, history) {
  const out = [{ role: 'system', content: system }]
  for (const m of history) {
    if (m.role === 'user') out.push({ role: 'user', content: m.text })
    else if (m.role === 'assistant') {
      const msg = { role: 'assistant', content: m.text || null }
      if (m.toolCalls?.length) msg.tool_calls = m.toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.input || {}) } }))
      out.push(msg)
    } else if (m.role === 'tool') {
      for (const r of m.results) out.push({ role: 'tool', tool_call_id: r.id, content: r.output || '(leer)' })
    }
  }
  return out
}

async function callOpenAICompatible(cfg, { model, system, history, tools }) {
  if (!cfg.baseUrl) throw new ApiError(400, 'provider_not_configured', 'Für diesen Anbieter ist keine API-Adresse hinterlegt.')
  const headers = { 'content-type': 'application/json' }
  if (cfg.apiKey) headers.authorization = `Bearer ${cfg.apiKey}`
  const body = { model, messages: toOpenAI(system, history) }
  if (tools.length) body.tools = tools.map((t) => ({ type: 'function', function: { name: t, description: TOOL_DEFS[t].description, parameters: TOOL_DEFS[t].parameters } }))
  let res
  try {
    res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) })
  } catch (e) {
    throw new ApiError(502, 'provider_unreachable', `Der Anbieter ist nicht erreichbar (${cfg.baseUrl}). ${cfg.provider === 'ollama' ? 'Läuft Ollama auf diesem Rechner?' : ''} ${e.message}`)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`
    if (res.status === 401) throw new ApiError(400, 'provider_auth', `Der API-Schlüssel wurde abgelehnt: ${msg}`)
    if (res.status === 404) throw new ApiError(400, 'provider_model', `Modell oder Adresse nicht gefunden: ${msg}`)
    throw new ApiError(502, 'provider_error', `Fehler vom Anbieter: ${msg}`)
  }
  const choice = data.choices?.[0]
  const message = choice?.message || {}
  const toolCalls = (message.tool_calls || []).map((c) => {
    let input = {}
    try { input = JSON.parse(c.function?.arguments || '{}') } catch { input = { _invalid: c.function?.arguments } }
    return { id: c.id, name: c.function?.name, input }
  })
  return { text: (message.content || '').trim(), toolCalls, raw: null, truncated: choice?.finish_reason === 'length' }
}

let override = null
/** Test hook: replace the model call. */
export function __setModelCaller(fn) {
  override = fn
}

export async function callModel(cfg, params) {
  if (override) return override(cfg, params)
  if (!params.model) throw new ApiError(400, 'provider_model', 'Im Profil ist kein Modell eingetragen. Trage unter Einstellungen einen Modellnamen ein.')
  return cfg.provider === 'anthropic' ? callAnthropic(cfg, params) : callOpenAICompatible(cfg, params)
}
