import crypto from 'node:crypto'
import { one, run, all, tx } from '../db.js'
import { getTemplate, SKILLS, getCatalogSkill } from './catalog.js'
import { ensureUserSkill, logActivity } from './engine.js'
import { aiAvailable, inferGoalSkills } from './ai.js'
import { entitlements } from './auth.js'
import { ApiError, badRequest } from './http.js'

const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

/** Create (or reuse) a user-defined skill and return its id. */
export function ensureCustomSkill(userId, name, category = 'Eigene Skills') {
  const existing = one('SELECT id FROM custom_skills WHERE user_id = ? AND lower(name) = lower(?)', userId, name)
  if (existing) return existing.id
  const catalog = SKILLS.find((s) => s.name.toLowerCase() === name.toLowerCase())
  if (catalog) return catalog.id
  const id = `custom-${slug(name) || 'skill'}-${crypto.randomBytes(3).toString('hex')}`
  run('INSERT INTO custom_skills (id, user_id, name, category) VALUES (?, ?, ?, ?)', id, userId, name, category)
  return id
}

/**
 * Create a goal. Required skills come from a template, from Junis AI (custom goals),
 * or from the skills the user selected explicitly.
 */
export async function createGoal(userId, input) {
  const plan = entitlements(userId)
  const count = one("SELECT COUNT(*) AS n FROM goals WHERE user_id = ? AND status = 'active'", userId).n
  if (count >= plan.limits.goals) {
    throw new ApiError(402, 'plan_limit', `Dein Tarif ${plan.name} erlaubt ${plan.limits.goals} aktive Ziele. Schließe ein Ziel ab, archiviere es oder wechsle den Tarif.`, { feature: 'goals' })
  }
  const template = input.templateId ? getTemplate(input.templateId) : null
  if (input.templateId && !template) throw badRequest('Unbekannte Zielvorlage.')
  const title = template?.title ?? input.title
  if (!title) throw badRequest('Bitte gib deinem Ziel einen Titel.')

  let skills = []
  let milestones = []
  let targetState = input.targetState || null
  let skillSource = 'manual'
  if (template) {
    skills = template.skills.map(([skillId, target]) => ({ skillId, target }))
    milestones = template.milestones
    targetState ||= template.targetState
    skillSource = 'template'
  } else if (input.skills?.length) {
    skills = input.skills
      .filter((s) => s.skillId && (getCatalogSkill(s.skillId) || one('SELECT 1 FROM custom_skills WHERE id = ? AND user_id = ?', s.skillId, userId)))
      .map((s) => ({ skillId: s.skillId, target: Math.min(100, Math.max(10, Number(s.target) || 60)) }))
  } else if (aiAvailable()) {
    const inferred = await inferGoalSkills(userId, { title, description: input.description })
    skills = inferred.skills.map((s) => ({
      skillId: s.catalogId && getCatalogSkill(s.catalogId) ? s.catalogId : ensureCustomSkill(userId, s.name, s.category || 'Eigene Skills'),
      target: Math.min(100, Math.max(10, s.target || 60)),
    }))
    milestones = inferred.milestones
    targetState ||= inferred.targetState
    skillSource = 'ai'
  }

  return tx(() => {
    const r = run(
      `INSERT INTO goals (user_id, title, description, target_state, current_state, timeframe_weeks, priority, template_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      userId, title, input.description ?? template?.description ?? null, targetState, input.currentState ?? null,
      input.timeframeWeeks ?? null, input.priority ?? 'medium', template?.id ?? null,
    )
    const goalId = Number(r.lastInsertRowid)
    const seen = new Set()
    for (const s of skills) {
      if (seen.has(s.skillId)) continue
      seen.add(s.skillId)
      run('INSERT INTO goal_skills (goal_id, skill_id, target_level) VALUES (?, ?, ?)', goalId, s.skillId, s.target)
      ensureUserSkill(userId, s.skillId)
    }
    milestones.forEach((m, i) => run('INSERT INTO milestones (goal_id, title, position) VALUES (?, ?, ?)', goalId, m, i))
    run("INSERT INTO memories (user_id, kind, content, source) VALUES (?, 'Ziel', ?, 'goal')", userId, title)
    logActivity(userId, 'goal_created', title, { refId: goalId })
    return { goalId, skillSource, skillCount: seen.size }
  })
}

export function goalSkillIds(goalId) {
  return all('SELECT skill_id FROM goal_skills WHERE goal_id = ?', goalId).map((r) => r.skill_id)
}
