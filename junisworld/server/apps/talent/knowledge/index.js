// Industry knowledge packs for Junis Talent: roles, skill taxonomy, facts, knowledge checks and work samples.
import { office } from './office.js'

export const PACKS = { [office.id]: office }

export const QUIZ_PASS = 0.8
export const TASK_PASS = 70

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}+#. ]/gu, ' ').replace(/\s+/g, ' ').trim()

export const getPack = (id) => PACKS[id] || null
export const skillOf = (pack, id) => pack.skills.find((s) => s.id === id)

/** Packs whose domain aliases match any of the given domains. */
export function packsForDomains(domains = []) {
  const ds = domains.map(norm)
  return Object.values(PACKS).filter((p) => p.domainAliases.some((a) => ds.some((d) => d && (d === norm(a) || d.includes(norm(a)) || norm(a).includes(d)))))
}

// Alias index: every alias and skill name → "pack:skillId".
const ALIAS = new Map()
for (const p of Object.values(PACKS)) for (const s of p.skills) for (const a of [s.name, ...s.aliases]) ALIAS.set(norm(a), `${p.id}:${s.id}`)

/** Canonical skill key if the name is a known alias, else null. */
export const canonicalSkill = (name) => ALIAS.get(norm(name)) ?? null

/** Public view of a pack: no quiz answers, no sample solutions. */
export function packOut(pack) {
  return {
    id: pack.id,
    name: pack.name,
    version: pack.version,
    intro: pack.intro,
    facts: pack.facts,
    skills: pack.skills.map(({ id, name, description }) => ({ id, name, description, quizQuestions: pack.quizzes[id]?.length || 0 })),
    roles: pack.roles,
    tasks: pack.tasks.map(({ sample: _sample, ...t }) => t),
    projectTemplates: pack.projectTemplates.map((t) => ({ ...t, skills: t.skills.map(([id, importance]) => ({ name: skillOf(pack, id).name, importance })) })),
  }
}

/** Quiz questions without answers. */
export const quizOut = (pack, skillId) => (pack.quizzes[skillId] || []).map(({ q, options }, i) => ({ index: i, q, options }))

export function gradeQuiz(pack, skillId, answers) {
  const qs = pack.quizzes[skillId] || []
  const results = qs.map((q, i) => ({ index: i, correct: answers[i] === q.answer, answer: q.answer, chosen: answers[i] ?? null, explain: q.explain }))
  const correct = results.filter((r) => r.correct).length
  const score = qs.length ? Math.round((correct / qs.length) * 100) : 0
  return { score, correct, total: qs.length, passed: qs.length > 0 && correct / qs.length >= QUIZ_PASS, results }
}
