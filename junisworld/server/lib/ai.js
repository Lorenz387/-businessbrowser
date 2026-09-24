// Junis AI — all Claude API calls go through this module.
import Anthropic from '@anthropic-ai/sdk'
import { all, one, parseJSON } from '../db.js'
import { ApiError } from './http.js'
import { entitlements } from './auth.js'
import { activeGoals, goalAnalysis, userSkills, skillInfo } from './engine.js'
import { SKILLS } from './catalog.js'

const MODEL = process.env.JUNIS_MODEL || 'claude-opus-5'
const USE_FALLBACKS = process.env.JUNIS_AI_FALLBACKS !== 'off'

let client = null
export function aiAvailable() {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}
function getClient() {
  if (!aiAvailable()) {
    throw new ApiError(503, 'ai_unavailable', 'Junis AI ist auf diesem Server noch nicht eingerichtet. Der Betreiber muss einen Anthropic-API-Schlüssel hinterlegen (ANTHROPIC_API_KEY).')
  }
  client ??= new Anthropic()
  return client
}

const BASE_SYSTEM = `Du bist Junis, der persönliche Entwicklungsassistent von JunisWorld.
JunisWorld bringt Menschen systematisch von ihrem heutigen Stand zu einem gewünschten Ziel: Ziel → Verstehen → Planen → Lernen → Üben → Bauen → Nachweisen → Anwenden → Verbessern.

Grundsätze:
- Antworte in der Sprache des Nutzers (Standard: Deutsch), klar, ruhig und präzise. Keine Floskeln, kein Marketington.
- Beziehe dich auf den Nutzerkontext (Ziele, Skills, Projekte), wenn er relevant ist, und erkläre, wie ein Schritt das Ziel voranbringt.
- Erfinde keine Quellen, Zahlen, Studien, Kurse, Zertifikate oder Stellenangebote. Wenn du etwas nicht weißt, sag es.
- Kennzeichne Unsicherheit ausdrücklich. Versprich keine sicheren beruflichen, medizinischen, rechtlichen oder finanziellen Ergebnisse.
- Der Junis-Twin und der Skill Graph sind datenbasierte Näherungen, keine objektive Abbildung eines Menschen.
- Bei Aufgaben zum Lernen: erst zum eigenen Denken anregen, dann erklären. Keine fertigen Lösungen für Prüfungsbetrug.
- Nutze Markdown sparsam (kurze Absätze, Listen, Codeblöcke wo nötig).`

function levelText(l) {
  if (l >= 75) return 'sicher'
  if (l >= 50) return 'fortgeschritten'
  if (l >= 25) return 'Grundlagen'
  if (l > 0) return 'Einstieg'
  return 'nicht nachgewiesen'
}

/** Compact, current user context for every Junis AI request. */
export function buildUserContext(userId) {
  const user = one('SELECT name FROM users WHERE id = ?', userId)
  const p = one('SELECT * FROM profiles WHERE user_id = ?', userId) || {}
  const plan = entitlements(userId)
  const lines = [`Nutzer: ${user?.name ?? 'unbekannt'}`]
  if (p.situation) lines.push(`Situation: ${p.situation}`)
  const interests = parseJSON(p.interests, [])
  if (interests.length) lines.push(`Interessen: ${interests.join(', ')}`)
  lines.push(`Bevorzugte Lernweise: ${p.learning_style ?? 'gemischt'}; Erklärniveau: ${p.explanation_level ?? 'normal'}; Lernzeit/Woche: ${p.weekly_minutes ?? '?'} Min.`)
  if (p.career_goal) lines.push(`Karriereziel: ${p.career_goal}`)
  lines.push(`Lernintensität: ${p.intensity ?? 'normal'}; Antwortsprache: ${p.language === 'en' ? 'Englisch' : 'Deutsch'}`)
  const goals = activeGoals(userId)
  if (goals.length) {
    lines.push('Aktive Ziele:')
    for (const g of goals.slice(0, 5)) {
      const a = goalAnalysis(userId, g.id)
      const gaps = a.skills.filter((s) => s.gap > 0).slice(0, 5).map((s) => `${s.name} ${s.current}/${s.target}`)
      lines.push(`- ${g.title} (Fortschritt ${a.progress} %, Priorität ${g.priority})${gaps.length ? `; größte Lücken: ${gaps.join(', ')}` : ''}`)
    }
  }
  const skills = userSkills(userId).filter((s) => s.level > 0 || s.selfLevel != null)
  if (skills.length) {
    lines.push('Skills (gemessen, 0–100):')
    for (const s of skills.slice(0, 25)) {
      lines.push(`- ${s.name}: ${s.level} (${levelText(s.level)}, ${s.statusLabel}${s.errorRate != null ? `, Fehlerquote ${s.errorRate} %` : ''}${s.flag === 'reexplain' ? ', braucht erneute Erklärung' : ''})`)
    }
  }
  const projects = all("SELECT title, objective FROM projects WHERE user_id = ? AND status = 'active' LIMIT 5", userId)
  if (projects.length) lines.push(`Aktive Projekte: ${projects.map((x) => x.title).join('; ')}`)
  if (plan.flags.memory) {
    const mem = all('SELECT kind, content FROM memories WHERE user_id = ? ORDER BY created_at DESC LIMIT 30', userId)
    if (mem.length) {
      lines.push('Junis Memory (vom Nutzer einsehbar):')
      for (const m of mem) lines.push(`- [${m.kind}] ${m.content}`)
    }
  }
  return lines.join('\n')
}

async function create(params) {
  const c = getClient()
  try {
    const req = { model: MODEL, ...params }
    const msg = USE_FALLBACKS
      ? await c.beta.messages.create({ ...req, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      : await c.messages.create(req)
    if (msg.stop_reason === 'refusal') {
      throw new ApiError(422, 'ai_refused', 'Junis kann bei dieser Anfrage nicht helfen. Formuliere sie bitte anders.')
    }
    return msg
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (e instanceof Anthropic.AuthenticationError) throw new ApiError(503, 'ai_unavailable', 'Junis AI ist falsch konfiguriert (API-Schlüssel ungültig).')
    if (e instanceof Anthropic.RateLimitError) throw new ApiError(503, 'ai_busy', 'Junis AI ist gerade ausgelastet. Bitte versuche es in einer Minute erneut.')
    if (e instanceof Anthropic.BadRequestError) throw new ApiError(502, 'ai_error', 'Junis AI konnte die Anfrage nicht verarbeiten.')
    if (e instanceof Anthropic.APIError) throw new ApiError(502, 'ai_error', 'Junis AI ist gerade nicht erreichbar. Bitte versuche es erneut.')
    throw e
  }
}

const textOf = (msg) => msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()

async function structured(system, userText, schema, { maxTokens = 16000, effort } = {}) {
  const msg = await create({
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userText }],
    output_config: { format: { type: 'json_schema', schema }, ...(effort ? { effort } : {}) },
  })
  if (msg.stop_reason === 'max_tokens') throw new ApiError(502, 'ai_error', 'Die Antwort von Junis AI war unvollständig. Bitte versuche es erneut.')
  try {
    return JSON.parse(textOf(msg))
  } catch {
    throw new ApiError(502, 'ai_error', 'Junis AI hat eine unlesbare Antwort geliefert. Bitte versuche es erneut.')
  }
}

// ---------- Chat ----------

export async function chat(userId, history, { pageContext, knowledge = [] } = {}) {
  const system = [
    { type: 'text', text: BASE_SYSTEM, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Aktueller Nutzerkontext:\n${buildUserContext(userId)}` },
  ]
  if (pageContext) system.push({ type: 'text', text: `Der Nutzer fragt aus diesem Bereich heraus:\n${pageContext}` })
  if (knowledge.length) {
    system.push({ type: 'text', text: `Relevante Einträge aus der persönlichen Wissensbibliothek des Nutzers (nur verwenden, wenn passend; als Quelle nennen):\n${knowledge.map((k) => `### ${k.title}\n${k.content.slice(0, 3000)}`).join('\n\n')}` })
  }
  const msg = await create({
    max_tokens: 16000,
    system,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
    output_config: { effort: 'medium' },
  })
  return textOf(msg)
}

// ---------- Lessons ----------

const LESSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'what', 'why', 'where', 'prerequisites', 'next', 'sections', 'examples', 'keyPoints', 'flashcards'],
  properties: {
    title: { type: 'string' },
    what: { type: 'string', description: 'Was lerne ich? (1–2 Sätze)' },
    why: { type: 'string', description: 'Warum brauche ich das — bezogen auf das Ziel des Nutzers' },
    where: { type: 'string', description: 'Wo kann ich es anwenden?' },
    prerequisites: { type: 'array', items: { type: 'string' } },
    next: { type: 'string', description: 'Was kommt danach?' },
    sections: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['heading', 'body'], properties: { heading: { type: 'string' }, body: { type: 'string', description: 'Markdown' } } } },
    examples: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'body'], properties: { title: { type: 'string' }, body: { type: 'string', description: 'Markdown' } } } },
    keyPoints: { type: 'array', items: { type: 'string' } },
    flashcards: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['front', 'back'], properties: { front: { type: 'string' }, back: { type: 'string' } } } },
  },
}

const MODE_TEXT = {
  normal: 'Normale Erklärung.',
  reexplain: 'Der Nutzer hat bei Übungen häufig Fehler gemacht. Erkläre das Konzept neu, aus einem anderen Blickwinkel, mit einfacheren Schritten und typischen Fehlern.',
  simplify: 'Der Nutzer braucht lange. Vereinfache: kürzere Sätze, mehr Beispiele, kleinere Schritte.',
  compress: 'Der Nutzer versteht schnell. Komprimiere: nur das Wesentliche, dichter, mit anspruchsvolleren Beispielen.',
  short: 'Kurze Erklärung (ca. 5 Minuten Lesezeit).',
  deep: 'Ausführliche Erklärung (ca. 20 Minuten Lesezeit) mit Hintergründen.',
}

export async function generateLesson(userId, { skillId, level, mode = 'normal', goalTitle }) {
  const info = skillInfo(userId, skillId)
  const p = one('SELECT learning_style, explanation_level, language FROM profiles WHERE user_id = ?', userId) || {}
  const prompt = `Erstelle eine Lerneinheit.
Skill: ${info.name} (${info.category}${info.subcategory ? ' / ' + info.subcategory : ''}) — ${info.description ?? ''}
Aktuelles gemessenes Niveau des Nutzers: ${level}/100 (${levelText(level)}).
${goalTitle ? `Ziel des Nutzers, für das dieser Skill gebraucht wird: ${goalTitle}` : ''}
Bevorzugte Lernweise: ${p.learning_style ?? 'gemischt'}. Erklärniveau: ${p.explanation_level ?? 'normal'}.
Modus: ${MODE_TEXT[mode] ?? MODE_TEXT.normal}
Anforderungen: fachlich korrekt; 3–6 Abschnitte; 2–3 konkrete Beispiele (bei Programmierung mit Code); 4–8 Lernkarten; keine erfundenen Quellen oder Statistiken.`
  return structured(`${BASE_SYSTEM}\n\nNutzerkontext:\n${buildUserContext(userId)}`, prompt, LESSON_SCHEMA)
}

// ---------- Practice ----------

const QUIZ_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'prompt', 'options', 'correctIndex', 'acceptedAnswers', 'numericAnswer', 'tolerance', 'items', 'explanation', 'concept', 'code'],
        properties: {
          type: { type: 'string', enum: ['mc', 'open', 'numeric', 'order', 'code'] },
          prompt: { type: 'string' },
          code: { type: 'string', description: 'Optionaler Code-Ausschnitt oder Startcode, sonst leer' },
          options: { type: 'array', items: { type: 'string' }, description: 'Nur für mc: 3–5 Optionen, sonst leer' },
          correctIndex: { type: 'integer', description: 'Nur für mc, sonst -1' },
          acceptedAnswers: { type: 'array', items: { type: 'string' }, description: 'Für open/code: Musterlösung(en) bzw. Bewertungskriterien' },
          numericAnswer: { type: 'number', description: 'Nur für numeric, sonst 0' },
          tolerance: { type: 'number', description: 'Nur für numeric: erlaubte absolute Abweichung, sonst 0' },
          items: { type: 'array', items: { type: 'string' }, description: 'Nur für order: Elemente in der KORREKTEN Reihenfolge, sonst leer' },
          explanation: { type: 'string', description: 'Erklärung der richtigen Lösung' },
          concept: { type: 'string', description: 'Geprüftes Teilkonzept (kurz)' },
        },
      },
    },
  },
}

const KIND_TEXT = {
  quiz: 'Gemischtes Quiz: überwiegend Multiple Choice, dazu 1–2 offene Fragen.',
  mc: 'Nur Multiple-Choice-Fragen.',
  open: 'Nur offene Fragen, die Verständnis prüfen.',
  numeric: 'Rechenaufgaben mit numerischem Ergebnis (wo fachlich sinnvoll), sonst Multiple Choice.',
  code: 'Coding Challenges: kurze Programmieraufgaben, die als Code beantwortet werden (Typ code).',
  order: 'Überwiegend Reihenfolge-Aufgaben (Schritte/Abläufe sortieren), ergänzt um Multiple Choice.',
  case: 'Eine kurze Fallstudie im Prompt, dazu offene und Multiple-Choice-Fragen zur Fallstudie.',
  exam: 'Prüfungssimulation: gemischte Aufgabentypen, anspruchsvoll, prüfungsnah.',
}

export async function generateQuiz(userId, { skillId, difficulty, count = 5, kind = 'quiz', lessonContent }) {
  const info = skillInfo(userId, skillId)
  const us = one('SELECT * FROM user_skills WHERE user_id = ? AND skill_id = ?', userId, skillId)
  const recentMistakes = all(
    'SELECT results FROM practice_sessions WHERE user_id = ? AND skill_id = ? AND results IS NOT NULL ORDER BY id DESC LIMIT 3',
    userId, skillId,
  ).flatMap((r) => parseJSON(r.results, []).filter((x) => !x.correct).map((x) => x.concept)).filter(Boolean)
  const prompt = `Erstelle ${count} Übungsaufgaben.
Skill: ${info.name} — ${info.description ?? ''}
Schwierigkeit: ${difficulty} von 5 (1 = Einstieg, 3 = solide Anwendung, 5 = Expertenniveau).
Aufgabenform: ${KIND_TEXT[kind] ?? KIND_TEXT.quiz}
${recentMistakes.length ? `Konzepte, bei denen der Nutzer zuletzt Fehler gemacht hat (gezielt erneut prüfen): ${[...new Set(recentMistakes)].join(', ')}` : ''}
${us?.flag === 'reexplain' ? 'Der Nutzer hatte zuletzt Schwierigkeiten — Aufgaben klar formulieren.' : ''}
${lessonContent ? `Beziehe dich auf diese Lektion:\n${lessonContent.slice(0, 6000)}` : ''}
Regeln: Jede Aufgabe eindeutig lösbar. Bei mc genau eine richtige Option. Fachlich korrekt. Erklärung zu jeder Aufgabe.`
  const out = await structured(BASE_SYSTEM, prompt, QUIZ_SCHEMA)
  return out.questions.slice(0, count).map((q, i) => ({ id: i + 1, ...q }))
}

const GRADE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'feedback', 'misconception'],
  properties: {
    score: { type: 'number', description: '0 bis 1' },
    feedback: { type: 'string', description: 'Kurzes, konkretes Feedback an den Nutzer (2–4 Sätze)' },
    misconception: { type: 'string', description: 'Erkanntes Missverständnis oder leer' },
  },
}

export async function gradeOpenAnswer(question, answer) {
  const prompt = `Bewerte die Antwort auf eine Übungsaufgabe fair und streng fachlich.
Aufgabe: ${question.prompt}
${question.code ? `Code/Kontext:\n${question.code}\n` : ''}Musterlösung/Kriterien: ${question.acceptedAnswers.join(' | ')}
Antwort des Nutzers:\n${answer || '(keine Antwort)'}
Score 1 = vollständig richtig, 0.5 = teilweise richtig, 0 = falsch.`
  const r = await structured(BASE_SYSTEM, prompt, GRADE_SCHEMA, { maxTokens: 4000, effort: 'low' })
  return { ...r, score: Math.max(0, Math.min(1, Number(r.score) || 0)) }
}

// ---------- Goals ----------

const GOAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['targetState', 'skills', 'milestones'],
  properties: {
    targetState: { type: 'string' },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['catalogId', 'name', 'category', 'target'],
        properties: {
          catalogId: { type: 'string', description: 'ID aus dem Katalog oder leer, wenn kein passender Skill existiert' },
          name: { type: 'string' },
          category: { type: 'string' },
          target: { type: 'integer', description: 'Benötigtes Niveau 0–100' },
        },
      },
    },
    milestones: { type: 'array', items: { type: 'string' } },
  },
}

export async function inferGoalSkills(userId, { title, description }) {
  const catalog = SKILLS.map((s) => `${s.id}: ${s.name} (${s.category})`).join('\n')
  const prompt = `Ein Nutzer hat folgendes Ziel definiert:
Titel: ${title}
Beschreibung: ${description || '-'}

Bestimme 3–8 Fähigkeiten, die realistisch für dieses Ziel benötigt werden, und das jeweils nötige Niveau (0–100; 50 = solide Grundlagen, 75 = sicher).
Nutze vorrangig diese Katalog-Skills (catalogId exakt übernehmen):
${catalog}
Nur wenn nichts passt: catalogId leer lassen und einen präzisen neuen Skill-Namen nennen.
Formuliere außerdem den Zielzustand in einem Satz und 3–5 Meilensteine.`
  return structured(BASE_SYSTEM, prompt, GOAL_SCHEMA, { maxTokens: 6000 })
}

// ---------- Projects ----------

const TASKS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['tasks', 'skills'],
  properties: {
    tasks: { type: 'array', items: { type: 'string' } },
    skills: { type: 'array', items: { type: 'string' }, description: 'Katalog-IDs der trainierten Skills' },
  },
}

export async function planProject(userId, { title, objective, description }) {
  const catalog = SKILLS.map((s) => `${s.id}: ${s.name}`).join('\n')
  const prompt = `Plane dieses Projekt in 4–8 konkrete, überprüfbare Aufgaben (jeweils eine Zeile, beginnend mit einem Verb).
Projekt: ${title}
Ziel: ${objective || '-'}
Beschreibung: ${description || '-'}
Nenne außerdem die Skills (nur IDs aus diesem Katalog), die das Projekt trainiert:
${catalog}`
  return structured(`${BASE_SYSTEM}\n\nNutzerkontext:\n${buildUserContext(userId)}`, prompt, TASKS_SCHEMA, { maxTokens: 4000 })
}

export async function projectFeedback(userId, project, tasks) {
  const prompt = `Gib ehrliches, konkretes Feedback zu diesem Projekt: Was ist gut, was fehlt, was sind die nächsten 2–3 sinnvollen Schritte? Bewerte nur, was beschrieben ist; erfinde keine Details.
Projekt: ${project.title}
Ziel: ${project.objective || '-'}
Beschreibung: ${project.description || '-'}
Ergebnis: ${project.result || '(noch keins)'} ${project.result_url ? `(${project.result_url})` : ''}
Aufgaben: ${tasks.map((t) => `${t.status === 'done' ? '[x]' : '[ ]'} ${t.title}`).join('; ')}`
  const msg = await create({
    max_tokens: 6000,
    system: [{ type: 'text', text: BASE_SYSTEM }, { type: 'text', text: `Nutzerkontext:\n${buildUserContext(userId)}` }],
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort: 'medium' },
  })
  return textOf(msg)
}

// ---------- Creator ----------

const STRUCTURE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'skills', 'modules'],
  properties: {
    summary: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' }, description: 'Katalog-IDs' },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'type', 'body'],
        properties: {
          title: { type: 'string' },
          type: { type: 'string', enum: ['lesson', 'task', 'project', 'test'] },
          body: { type: 'string', description: 'Markdown-Entwurf, den der Experte überarbeitet' },
        },
      },
    },
  },
}

/** Draft a structure for expert content. The creator reviews and edits everything before publishing. */
export async function structureCreatorItem({ type, title, summary, notes }) {
  const catalog = SKILLS.map((s) => `${s.id}: ${s.name}`).join('\n')
  const prompt = `Ein Experte erstellt Lerninhalte für JunisWorld und bittet um einen Strukturvorschlag.
Art: ${type}
Titel: ${title}
Beschreibung: ${summary || '-'}
Notizen des Experten: ${notes || '-'}
Schlage 4–10 Module in sinnvoller Reihenfolge vor (Lektionen, Aufgaben, Projekte, Tests), jeweils mit einem kurzen Entwurf.
Ordne passende Skills aus diesem Katalog zu (nur IDs):
${catalog}
Wichtig: Nur Entwürfe. Keine erfundenen Fakten, Zahlen oder Quellen; markiere Stellen, an denen der Experte Fachinhalt ergänzen muss, mit [Experte ergänzt].`
  return structured(BASE_SYSTEM, prompt, STRUCTURE_SCHEMA)
}

// ---------- Documents ----------

export async function analyzeDocument({ filename, mime, buffer, text, question }) {
  const content = []
  if (mime === 'application/pdf') {
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') } })
  } else if (/^image\/(png|jpeg|gif|webp)$/.test(mime)) {
    content.push({ type: 'image', source: { type: 'base64', media_type: mime, data: buffer.toString('base64') } })
  } else if (text) {
    content.push({ type: 'text', text: `Inhalt der Datei „${filename}“:\n\n${text}` })
  } else {
    throw new ApiError(415, 'unsupported', 'Dieser Dateityp kann nicht analysiert werden. Unterstützt: PDF, Bilder (PNG, JPG, GIF, WebP) und Textdateien.')
  }
  content.push({
    type: 'text',
    text: question?.trim()
      ? question.trim()
      : 'Fasse den Inhalt strukturiert zusammen: Kernaussagen, wichtige Begriffe, offene Fragen. Nenne, welche Lernthemen sich daraus ergeben. Kennzeichne Unsicherheiten.',
  })
  const msg = await create({ max_tokens: 16000, system: BASE_SYSTEM, messages: [{ role: 'user', content }] })
  return textOf(msg)
}

// ---------- Research ----------

export async function research(userId, { question, depth }) {
  const maxUses = depth === 'deep' ? 15 : 6
  const system = `${BASE_SYSTEM}

Du arbeitest im Research-Modus. Recherchiere im Web, vergleiche Quellen und erstelle einen strukturierten Bericht:
1. Kurzantwort
2. Befunde (mit Quellenverweisen)
3. Quellenvergleich: wo stimmen Quellen überein, wo widersprechen sie sich
4. Unsicherheiten und offene Fragen
Belege jede Tatsachenbehauptung mit einer gefundenen Quelle. Kennzeichne Aussagen ohne Beleg als [unsicher]. Erfinde keine Quellen.`
  const messages = [{ role: 'user', content: question }]
  const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxUses }]
  let msg
  for (let i = 0; i < 4; i++) {
    msg = await create({ max_tokens: 32000, system, messages, tools, output_config: { effort: depth === 'deep' ? 'high' : 'medium' } })
    if (msg.stop_reason !== 'pause_turn') break
    messages.push({ role: 'assistant', content: msg.content })
  }
  const allContent = [...messages.filter((m) => m.role === 'assistant').flatMap((m) => m.content), ...msg.content]
  const sources = new Map()
  for (const block of allContent) {
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const r of block.content) if (r.url) sources.set(r.url, { url: r.url, title: r.title || r.url, pageAge: r.page_age || null })
    }
  }
  const cited = new Set()
  let report = ''
  for (const block of msg.content) {
    if (block.type !== 'text') continue
    report += block.text
    for (const c of block.citations || []) {
      if (c.url) {
        cited.add(c.url)
        if (!sources.has(c.url)) sources.set(c.url, { url: c.url, title: c.title || c.url, pageAge: null })
      }
    }
  }
  const list = [...sources.values()].map((s) => ({ ...s, cited: cited.has(s.url) })).sort((a, b) => Number(b.cited) - Number(a.cited))
  return { report: report.trim(), sources: list }
}
