// Google-Gemini-Backend für Junis AI. Nimmt Anfragen im Format der Anthropic Messages API entgegen
// (so wie sie im Code gebaut werden) und liefert eine Antwort in derselben Form zurück — die aufrufenden
// Module (Lektionen, Interview, Verträge, GastroFlow …) bleiben dadurch unverändert.
import { GoogleGenAI, ApiError as GeminiApiError } from '@google/genai'
import { ApiError } from './http.js'

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
let client = null
const getClient = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, ...(process.env.GEMINI_BASE_URL ? { httpOptions: { baseUrl: process.env.GEMINI_BASE_URL } } : {}) }))

const systemText = (system) => (Array.isArray(system) ? system.map((b) => b.text || '').join('\n\n') : system || '')

function partsOf(content) {
  if (typeof content === 'string') return [{ text: content }]
  const parts = []
  for (const b of content || []) {
    if (b.type === 'text' && b.text) parts.push({ text: b.text })
    else if ((b.type === 'document' || b.type === 'image') && b.source?.type === 'base64') parts.push({ inlineData: { mimeType: b.source.media_type, data: b.source.data } })
  }
  return parts.length ? parts : [{ text: '' }]
}

const REFUSAL = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION', 'IMAGE_SAFETY', 'IMAGE_PROHIBITED_CONTENT'])

/** Anthropic-förmige Parameter → Gemini generateContent → Anthropic-förmige Antwort. */
export async function geminiCreate(params) {
  const config = {
    systemInstruction: systemText(params.system) || undefined,
    // Bei Gemini zählen Denk-Tokens zum Ausgabelimit — daher Puffer, damit Antworten nicht abgeschnitten werden.
    maxOutputTokens: (params.max_tokens || 8000) + 8192,
  }
  const format = params.output_config?.format
  if (format?.type === 'json_schema') {
    config.responseMimeType = 'application/json'
    config.responseJsonSchema = format.schema
  }
  if (params.tools?.some((t) => t.name === 'web_search')) config.tools = [{ googleSearch: {} }]
  const contents = params.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: partsOf(m.content) }))

  let res
  try {
    res = await getClient().models.generateContent({ model: GEMINI_MODEL, contents, config })
  } catch (e) {
    if (e instanceof GeminiApiError) {
      if (e.status === 401 || e.status === 403) throw new ApiError(503, 'ai_unavailable', 'Junis AI ist falsch konfiguriert (Gemini-API-Schlüssel ungültig oder ohne Berechtigung).')
      if (e.status === 429) throw new ApiError(503, 'ai_busy', 'Junis AI (Gemini) ist gerade ausgelastet oder das Kontingent ist aufgebraucht. Bitte später erneut versuchen.')
      if (e.status === 400 || e.status === 404) throw new ApiError(502, 'ai_error', `Gemini konnte die Anfrage nicht verarbeiten (Modell „${GEMINI_MODEL}“).`)
    }
    throw new ApiError(502, 'ai_error', 'Junis AI (Gemini) ist gerade nicht erreichbar. Bitte versuche es erneut.')
  }

  const cand = res.candidates?.[0]
  const finish = cand?.finishReason
  let stop_reason = 'end_turn'
  if (res.promptFeedback?.blockReason || REFUSAL.has(finish)) stop_reason = 'refusal'
  else if (finish === 'MAX_TOKENS') stop_reason = 'max_tokens'

  const text = (cand?.content?.parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join('')
  const chunks = (cand?.groundingMetadata?.groundingChunks || []).map((c) => c.web).filter((w) => w?.uri)
  const citedIdx = new Set((cand?.groundingMetadata?.groundingSupports || []).flatMap((s) => s.groundingChunkIndices || []))
  const content = []
  if (chunks.length) content.push({ type: 'web_search_tool_result', content: chunks.map((w) => ({ url: w.uri, title: w.title || w.uri })) })
  content.push({ type: 'text', text, citations: [...citedIdx].map((i) => chunks[i]).filter(Boolean).map((w) => ({ url: w.uri, title: w.title || w.uri })) })
  return { content, stop_reason, model: GEMINI_MODEL }
}
