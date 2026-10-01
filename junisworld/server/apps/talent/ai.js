// AI functions for Junis Talent. All outputs are recommendations for humans, never automated decisions.
import { ApiError } from '../../lib/http.js'
import { aiCreate, aiStructured, aiText, BASE_SYSTEM } from '../../lib/ai.js'

const FAIR = `Fairness-Regeln: Bewerte ausschließlich berufsrelevante Kompetenzen und Belege. Ignoriere Alter, Geschlecht, Herkunft, Religion, Behinderung, Familienstand, Aussehen, Akzent und Sprachfehler. Keine Vermutungen über geschützte Merkmale. Erfinde keine Fakten über die Person.`

// ---------- CV parsing ----------

const CV_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'summary', 'location', 'domains', 'skills', 'experience', 'education', 'languages'],
  properties: {
    headline: { type: 'string', description: 'Berufliche Kurzbeschreibung, z. B. "Ärztin (Innere Medizin) mit Data-Science-Erfahrung"' },
    summary: { type: 'string', description: '2–3 Sätze, nur aus dem Lebenslauf belegbar' },
    location: { type: 'string', description: 'Ort/Land oder leer' },
    domains: { type: 'array', items: { type: 'string' }, description: 'Fachgebiete, z. B. Medizin, Recht, Software Engineering, Physik' },
    skills: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'years'], properties: { name: { type: 'string' }, years: { type: 'number', description: 'Jahre Erfahrung, 0 wenn unklar' } } } },
    experience: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'org', 'from', 'to', 'summary'], properties: { title: { type: 'string' }, org: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, summary: { type: 'string' } } } },
    education: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['degree', 'institution', 'year'], properties: { degree: { type: 'string' }, institution: { type: 'string' }, year: { type: 'string' } } } },
    languages: { type: 'array', items: { type: 'string' } },
  },
}

export async function parseCv({ mime, buffer, text }) {
  const content = []
  if (mime === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') } })
  else if (text) content.push({ type: 'text', text })
  else throw new ApiError(415, 'unsupported', 'Bitte lade den Lebenslauf als PDF oder Textdatei hoch.')
  content.push({ type: 'text', text: 'Extrahiere das berufliche Profil aus diesem Lebenslauf. Nur Angaben, die im Dokument stehen. Keine Bewertung der Person. Keine Daten zu Alter, Geschlecht, Familienstand oder Foto übernehmen.' })
  const msg = await aiCreate({ max_tokens: 8000, system: BASE_SYSTEM, messages: [{ role: 'user', content }], output_config: { format: { type: 'json_schema', schema: CV_SCHEMA } } })
  try {
    return JSON.parse(aiText(msg))
  } catch {
    throw new ApiError(502, 'ai_error', 'Der Lebenslauf konnte nicht ausgelesen werden. Bitte erneut versuchen oder Profil manuell ausfüllen.')
  }
}

// ---------- Interview ----------

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['question', 'focus'], properties: { question: { type: 'string' }, focus: { type: 'string', enum: ['experience', 'domain', 'problem_solving', 'ai_review', 'communication', 'motivation'] } } },
    },
  },
}

const profileText = (p) => [
  `Headline: ${p.headline || '-'}`,
  `Fachgebiete: ${(p.domains || []).join(', ') || '-'}`,
  `Skills: ${(p.skills || []).map((s) => `${s.name}${s.years ? ` (${s.years} J.)` : ''}`).join(', ') || '-'}`,
  `Erfahrung: ${(p.experience || []).map((e) => `${e.title} @ ${e.org} (${e.from}–${e.to}): ${e.summary}`).join(' | ') || '-'}`,
  `Ausbildung: ${(p.education || []).map((e) => `${e.degree}, ${e.institution} ${e.year}`).join(' | ') || '-'}`,
].join('\n')

export async function planInterview(profile) {
  const prompt = `Plane ein strukturiertes Fachinterview (ca. 20 Minuten, 7 Fragen) für dieses Profil:
${profileText(profile)}

Anforderungen:
- Fragen individuell auf den Werdegang zugeschnitten, offen formuliert, konkret.
- Mischung: 2× experience (konkrete eigene Projekte), 2× domain (Fachwissen auf Expertenniveau), 1× problem_solving (realistische Fallaufgabe), 1× ai_review (bewerte eine kurze, plausibel klingende aber fehlerhafte KI-Antwort aus dem Fachgebiet — die KI-Antwort steht in der Frage), 1× motivation.
- Keine Fragen zu Privatleben, Gesundheit, Herkunft, Familie, Religion, Alter.
- Sprache: Deutsch.`
  const out = await aiStructured(BASE_SYSTEM, prompt, PLAN_SCHEMA, { maxTokens: 6000 })
  return out.questions.slice(0, 8)
}

const TURN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['followUp'],
  properties: { followUp: { type: 'string', description: 'Eine kurze Nachfrage, wenn die Antwort vage oder unvollständig ist; sonst leer' } },
}

export async function interviewFollowUp(question, answer) {
  const prompt = `Interviewfrage: ${question}\nAntwort: ${answer}\n\nIst eine kurze, präzisierende Nachfrage sinnvoll (z. B. nach konkretem Beispiel, Begründung, eigener Rolle)? Wenn die Antwort bereits konkret ist: leer lassen.`
  const out = await aiStructured(BASE_SYSTEM, prompt, TURN_SCHEMA, { maxTokens: 1000, effort: 'low' })
  return out.followUp?.trim() || ''
}

const EVAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['overall', 'dimensions', 'strengths', 'weaknesses', 'recommendations', 'skills', 'summary'],
  properties: {
    overall: { type: 'integer', description: '0–100' },
    dimensions: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['name', 'score', 'evidence'], properties: { name: { type: 'string', enum: ['Fachwissen', 'Praxiserfahrung', 'Problemlösung', 'KI-Antworten prüfen', 'Kommunikation'] }, score: { type: 'integer' }, evidence: { type: 'string', description: 'Konkreter Beleg aus den Antworten' } } },
    },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' }, description: 'Konkrete Tipps, wie die Person sich verbessern kann' },
    skills: { type: 'array', description: 'Im Interview tatsächlich belegte Skills', items: { type: 'object', additionalProperties: false, required: ['name', 'level'], properties: { name: { type: 'string' }, level: { type: 'string', enum: ['Grundlagen', 'Fortgeschritten', 'Experte'] } } } },
    summary: { type: 'string', description: '2–3 Sätze, sachlich, an die Person gerichtet (Du-Form)' },
  },
}

export async function evaluateInterview(profile, transcript) {
  const prompt = `Bewerte dieses Fachinterview. Das Ergebnis wird der Person vollständig angezeigt und ist eine Empfehlung für menschliche Entscheider, keine automatische Entscheidung.
${FAIR}

Profil:
${profileText(profile)}

Interview:
${transcript.map((t, i) => `F${i + 1}: ${t.q}\nA${i + 1}: ${t.a || '(keine Antwort)'}`).join('\n\n')}

Bewerte jede Dimension 0–100 nur anhand der Antworten. Kurze oder fehlende Antworten führen zu niedrigeren Werten, aber ohne Spekulation über Gründe. Stärken und Schwächen konkret und wertschätzend formulieren.`
  const out = await aiStructured(BASE_SYSTEM, prompt, EVAL_SCHEMA, { maxTokens: 8000 })
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))
  return { ...out, overall: clamp(out.overall), dimensions: out.dimensions.map((d) => ({ ...d, score: clamp(d.score) })) }
}

// ---------- Projects ----------

const PROJECT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'type', 'domains', 'skills', 'seniority', 'languages', 'summary'],
  properties: {
    title: { type: 'string' },
    type: { type: 'string', enum: ['expert_ai_training', 'freelance', 'employment'] },
    domains: { type: 'array', items: { type: 'string' } },
    skills: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'importance'], properties: { name: { type: 'string' }, importance: { type: 'string', enum: ['must', 'nice'] } } } },
    seniority: { type: 'string', enum: ['junior', 'mid', 'senior', 'expert'] },
    languages: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string', description: 'Sachliche Projektbeschreibung für Talente, 2–4 Sätze' },
  },
}

export async function structureProject(description) {
  const prompt = `Ein Unternehmen beschreibt in eigenen Worten, wen es sucht:
"""${description}"""
Strukturiere das als Anforderungsprofil. Nur Anforderungen, die im Text stehen oder zwingend daraus folgen. Keine diskriminierenden Kriterien (Alter, Geschlecht, Herkunft …) übernehmen — falls vorhanden, ignorieren.`
  return aiStructured(BASE_SYSTEM, prompt, PROJECT_SCHEMA, { maxTokens: 4000 })
}
