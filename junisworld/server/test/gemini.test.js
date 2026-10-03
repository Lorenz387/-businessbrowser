// Junis AI über Gemini: geprüft gegen einen lokalen Fake-Server, der die echten SDK-Anfragen empfängt.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'junis-gemini-'))
process.env.JUNIS_DATA_DIR = dir
delete process.env.ANTHROPIC_API_KEY
delete process.env.ANTHROPIC_AUTH_TOKEN
process.env.GEMINI_API_KEY = 'test-key'

const requests = []
let reply = () => ({})
const fake = http.createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    requests.push({ url: req.url, headers: req.headers, body: JSON.parse(body || '{}') })
    const { status = 200, json } = reply()
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(json))
  })
})
const answer = (text, extra = {}) => ({ json: { candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP', ...extra }] } })

let ai
before(async () => {
  fake.listen(0, '127.0.0.1')
  await new Promise((r) => fake.once('listening', r))
  process.env.GEMINI_BASE_URL = `http://127.0.0.1:${fake.address().port}`
  ai = await import('../lib/ai.js')
})
after(() => { fake.close(); fs.rmSync(dir, { recursive: true, force: true }) })

test('Gemini backend: structured output, PDFs, search grounding, errors', async () => {
  assert.equal(ai.aiProvider(), 'gemini')

  // Structured output with a JSON schema + system prompt.
  reply = () => answer('{"title":"Mietvertrag"}')
  const schema = { type: 'object', additionalProperties: false, required: ['title'], properties: { title: { type: 'string' } } }
  const out = await ai.aiStructured('System X', 'Lies das', schema, { maxTokens: 1000 })
  assert.deepEqual(out, { title: 'Mietvertrag' })
  let r = requests.at(-1)
  assert.match(r.url, /models\/gemini-3\.8-flash:generateContent/)
  assert.equal(r.headers['x-goog-api-key'], 'test-key')
  assert.equal(r.body.generationConfig.responseMimeType, 'application/json')
  assert.deepEqual(r.body.generationConfig.responseJsonSchema, schema)
  assert.equal(r.body.systemInstruction.parts[0].text, 'System X')
  assert.equal(r.body.contents[0].role, 'user')

  // PDF documents become inlineData; assistant turns become "model".
  reply = () => answer('Zusammenfassung')
  const msg = await ai.aiCreate({ max_tokens: 500, system: [{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }], messages: [
    { role: 'user', content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'JVBERi0=' } }, { type: 'text', text: 'Fasse zusammen' }] },
    { role: 'assistant', content: 'Ok' }, { role: 'user', content: 'Weiter' }] })
  assert.equal(ai.aiText(msg), 'Zusammenfassung')
  r = requests.at(-1)
  assert.deepEqual(r.body.contents[0].parts[0], { inlineData: { mimeType: 'application/pdf', data: 'JVBERi0=' } })
  assert.equal(r.body.contents[1].role, 'model')
  assert.equal(r.body.systemInstruction.parts[0].text, 'A\n\nB')

  // Research: web_search → googleSearch tool; grounding chunks become sources, supports mark citations.
  reply = () => answer('Bericht', { groundingMetadata: { groundingChunks: [{ web: { uri: 'https://a.example', title: 'a.example' } }, { web: { uri: 'https://b.example', title: 'b.example' } }], groundingSupports: [{ groundingChunkIndices: [1] }] } })
  const rep = await ai.research(1, { question: 'Was gilt?', depth: 'quick' })
  r = requests.at(-1)
  assert.deepEqual(r.body.tools, [{ googleSearch: {} }])
  assert.equal(rep.report, 'Bericht')
  assert.deepEqual(rep.sources.map((s) => [s.url, s.cited]), [['https://b.example', true], ['https://a.example', false]])

  // Safety block → refusal error; invalid key → clear setup error.
  reply = () => ({ json: { candidates: [{ finishReason: 'SAFETY' }] } })
  await assert.rejects(ai.aiCreate({ max_tokens: 10, messages: [{ role: 'user', content: 'x' }] }), (e) => e.code === 'ai_refused')
  reply = () => ({ status: 403, json: { error: { code: 403, message: 'API key not valid', status: 'PERMISSION_DENIED' } } })
  await assert.rejects(ai.aiCreate({ max_tokens: 10, messages: [{ role: 'user', content: 'x' }] }), (e) => e.code === 'ai_unavailable')
  // Truncated output is reported as max_tokens (structured() turns that into an error).
  reply = () => ({ json: { candidates: [{ content: { parts: [{ text: '{"ti' }] }, finishReason: 'MAX_TOKENS' }] } })
  await assert.rejects(ai.aiStructured('S', 'U', schema), (e) => e.code === 'ai_error')
})
