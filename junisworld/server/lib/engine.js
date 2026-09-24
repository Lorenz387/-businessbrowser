// JunisWorld development engine: skill levels, gap analysis, adaptive learning,
// next steps, reviews and weekly summaries. All values derive from real user activity.

import { all, one, run, parseJSON } from '../db.js'
import { SKILLS, MISSIONS, getCatalogSkill } from './catalog.js'
import { entitlements } from './auth.js'

const DAY = 864e5
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60] // days, indexed by success streak
export const LESSON_KNOWLEDGE_CAP = 45 // reading alone never proves more than this
const nowIso = () => new Date().toISOString()

export const LEVEL_BANDS = [
  { min: 75, label: 'Sicher' },
  { min: 50, label: 'Fortgeschritten' },
  { min: 25, label: 'Grundlagen' },
  { min: 1, label: 'Einstieg' },
  { min: 0, label: 'Nicht nachgewiesen' },
]
export const bandFor = (level) => LEVEL_BANDS.find((b) => level >= b.min).label

// ---------- Skill catalog (catalog + user-defined) ----------

export function skillCatalog(userId) {
  const custom = all('SELECT * FROM custom_skills WHERE user_id = ?', userId).map((s) => ({
    ...s,
    requires: [],
    custom: true,
  }))
  return [...SKILLS, ...custom]
}

export function skillInfo(userId, skillId) {
  return getCatalogSkill(skillId) || (() => {
    const c = one('SELECT * FROM custom_skills WHERE id = ? AND user_id = ?', skillId, userId)
    return c ? { ...c, requires: [], custom: true } : null
  })()
}

// ---------- User skill state ----------

export function ensureUserSkill(userId, skillId) {
  run('INSERT OR IGNORE INTO user_skills (user_id, skill_id) VALUES (?, ?)', userId, skillId)
  return one('SELECT * FROM user_skills WHERE user_id = ? AND skill_id = ?', userId, skillId)
}

export const measuredLevel = (us) => (us ? Math.round(0.5 * us.knowledge + 0.5 * us.practice) : 0)

export function evidenceFor(userId, skillId) {
  return all('SELECT * FROM skill_evidence WHERE user_id = ? AND skill_id = ? ORDER BY created_at DESC', userId, skillId)
}

/**
 * Verification requires both a passed test at difficulty ≥ 3 (score ≥ 80 %)
 * and at least one applied proof (project, mission or challenge).
 */
export function verificationStatus(us, evidence) {
  const passedTest = evidence.some((e) => e.type === 'test' && e.score >= 0.8 && (e.difficulty ?? 0) >= 3)
  const applied = evidence.some((e) => ['project', 'mission', 'challenge'].includes(e.type))
  if (passedTest && applied) return 'verified'
  if (evidence.length) return 'evidenced'
  if (us?.self_level != null) return 'self'
  return 'none'
}

export const STATUS_LABELS = {
  verified: 'Verifiziert',
  evidenced: 'Teilweise nachgewiesen',
  self: 'Selbsteinschätzung',
  none: 'Nicht nachgewiesen',
}

function isReviewDue(us) {
  return !!us?.next_review_at && new Date(us.next_review_at).getTime() <= Date.now()
}

function isStale(us) {
  return !!us?.last_used_at && Date.now() - new Date(us.last_used_at).getTime() > 30 * DAY
}

export function describeSkill(userId, skillId, us = null, evidence = null) {
  const info = skillInfo(userId, skillId)
  if (!info) return null
  us = us ?? one('SELECT * FROM user_skills WHERE user_id = ? AND skill_id = ?', userId, skillId)
  evidence = evidence ?? evidenceFor(userId, skillId)
  const level = measuredLevel(us)
  let status = verificationStatus(us, evidence)
  // Verification is a Pro feature: the evidence is kept, the badge is shown once the plan includes it.
  const verifiable = status === 'verified'
  if (verifiable && !entitlements(userId).flags.verification) status = 'evidenced'
  const errorRate = us && us.attempts > 0 ? Math.round(((us.attempts - us.correct) / us.attempts) * 100) : null
  return {
    id: skillId,
    name: info.name,
    category: info.category,
    subcategory: info.subcategory,
    description: info.description,
    requires: info.requires,
    custom: !!info.custom,
    tracked: !!us,
    knowledge: Math.round(us?.knowledge ?? 0),
    practice: Math.round(us?.practice ?? 0),
    level,
    band: bandFor(level),
    selfLevel: us?.self_level ?? null,
    confidence: confidenceFor(us, evidence),
    difficulty: us?.difficulty ?? 2,
    attempts: us?.attempts ?? 0,
    errorRate,
    flag: us?.flag ?? null,
    lastUsedAt: us?.last_used_at ?? null,
    lastTestedAt: us?.last_tested_at ?? null,
    nextReviewAt: us?.next_review_at ?? null,
    reviewDue: isReviewDue(us),
    stale: isStale(us),
    status,
    statusLabel: STATUS_LABELS[status],
    verificationLocked: verifiable && status !== 'verified',
    evidenceCount: evidence.length,
  }
}

/** Confidence: how much data backs the level (0–100), not how good the user is. */
function confidenceFor(us, evidence) {
  if (!us) return 0
  const fromAttempts = Math.min(40, us.attempts * 4)
  const fromEvidence = Math.min(45, evidence.length * 15)
  const recency = us.last_tested_at && Date.now() - new Date(us.last_tested_at).getTime() < 30 * DAY ? 15 : 0
  return Math.min(100, fromAttempts + fromEvidence + recency)
}

export function userSkills(userId) {
  const rows = all('SELECT * FROM user_skills WHERE user_id = ?', userId)
  const ev = all('SELECT * FROM skill_evidence WHERE user_id = ? ORDER BY created_at DESC', userId)
  const byskill = new Map()
  for (const e of ev) {
    if (!byskill.has(e.skill_id)) byskill.set(e.skill_id, [])
    byskill.get(e.skill_id).push(e)
  }
  return rows
    .map((us) => describeSkill(userId, us.skill_id, us, byskill.get(us.skill_id) || []))
    .filter(Boolean)
}

function recordHistory(userId, skillId, source) {
  const us = one('SELECT knowledge, practice FROM user_skills WHERE user_id = ? AND skill_id = ?', userId, skillId)
  if (us) run('INSERT INTO skill_history (user_id, skill_id, knowledge, practice, source) VALUES (?, ?, ?, ?, ?)', userId, skillId, us.knowledge, us.practice, source)
}

export function logActivity(userId, type, title, { skillId = null, refId = null, minutes = 0 } = {}) {
  run('INSERT INTO activity (user_id, type, title, skill_id, ref_id, minutes) VALUES (?, ?, ?, ?, ?, ?)', userId, type, title, skillId, refId, minutes)
}

export function notify(userId, type, title, { body = null, link = null, dedupeKey = null } = {}) {
  const prefs = parseJSON(one('SELECT notifications FROM profiles WHERE user_id = ?', userId)?.notifications, {})
  const prefKey = { review: 'reviews', project: 'projects', skill: 'skills', weekly: 'weekly' }[type]
  if (prefKey && prefs[prefKey] === false) return
  run(
    'INSERT OR IGNORE INTO notifications (user_id, type, title, body, link, dedupe_key) VALUES (?, ?, ?, ?, ?, ?)',
    userId, type, title, body, link, dedupeKey,
  )
}

// ---------- Updates from learning activity ----------

export function applyLessonCompleted(userId, skillId) {
  const us = ensureUserSkill(userId, skillId)
  const knowledge = Math.max(us.knowledge, Math.min(LESSON_KNOWLEDGE_CAP, us.knowledge + 8))
  run('UPDATE user_skills SET knowledge = ?, last_used_at = ?, flag = CASE WHEN flag = \'reexplain\' THEN NULL ELSE flag END WHERE user_id = ? AND skill_id = ?',
    knowledge, nowIso(), userId, skillId)
  recordHistory(userId, skillId, 'lesson')
}

/**
 * Apply a graded practice session.
 * score 0..1, difficulty 1..5, secondsPerQuestion used to detect slow/fast understanding.
 * Returns the adaptation decision so the UI can explain it.
 */
export function applyPracticeResult(userId, skillId, { score, difficulty, correct, total, secondsPerQuestion, adaptive, title, sessionId, isReview }) {
  const us = ensureUserSkill(userId, skillId)
  const before = describeSkill(userId, skillId)
  // Knowledge moves toward what this session demonstrated (difficulty × score).
  const demonstrated = difficulty * 20 * score
  const weight = score >= 0.5 ? 0.35 : 0.2
  const knowledge = clamp(us.knowledge + weight * (demonstrated - us.knowledge), 0, 100)
  const practice = clamp(us.practice + (score >= 0.6 ? 4 : 1), 0, 100)

  let nextDifficulty = us.difficulty
  let flag = null
  let decision = 'keep'
  if (adaptive) {
    if (score >= 0.8) {
      nextDifficulty = Math.min(5, difficulty + 1)
      decision = nextDifficulty > difficulty ? 'harder' : 'keep'
      if (secondsPerQuestion != null && secondsPerQuestion < 25 && score === 1) {
        flag = 'compress'
        decision = 'compress'
      }
    } else if (score < 0.5) {
      nextDifficulty = Math.max(1, difficulty - 1)
      flag = 'reexplain'
      decision = 'reexplain'
    } else if (secondsPerQuestion != null && secondsPerQuestion > 120) {
      flag = 'simplify'
      decision = 'simplify'
    }
  }
  const streak = score >= 0.7 ? us.streak + 1 : 0
  const interval = score >= 0.7 ? REVIEW_INTERVALS[Math.min(streak, REVIEW_INTERVALS.length - 1)] : 1
  const nextReview = new Date(Date.now() + interval * DAY).toISOString()

  run(
    `UPDATE user_skills SET knowledge = ?, practice = ?, difficulty = ?, flag = ?, streak = ?,
       attempts = attempts + ?, correct = correct + ?, last_used_at = ?, last_tested_at = ?, next_review_at = ?
     WHERE user_id = ? AND skill_id = ?`,
    knowledge, practice, nextDifficulty, flag, streak, total, correct, nowIso(), nowIso(), nextReview, userId, skillId,
  )
  run(
    'INSERT INTO skill_evidence (user_id, skill_id, type, ref_id, title, score, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)',
    userId, skillId, 'test', sessionId, title, score, difficulty,
  )
  recordHistory(userId, skillId, isReview ? 'review' : 'practice')
  const after = describeSkill(userId, skillId)
  if (before.status !== 'verified' && after.status === 'verified') {
    notify(userId, 'skill', `Dein Skill ${after.name} wurde verifiziert.`, { link: `/skills/${skillId}`, dedupeKey: `verified:${skillId}:${Date.now()}` })
  } else if (before.status === 'verified' && score >= 0.8) {
    notify(userId, 'skill', `Dein Skill ${after.name} wurde erneut bestätigt.`, { link: `/skills/${skillId}`, dedupeKey: `reconfirmed:${skillId}:${new Date().toISOString().slice(0, 10)}` })
  }
  return { decision, difficultyBefore: difficulty, difficultyAfter: nextDifficulty, levelBefore: before.level, levelAfter: after.level, nextReviewAt: nextReview }
}

/** Projects and missions are applied proof: raise practical experience and add evidence. */
export function applyAppliedWork(userId, skillIds, { type, refId, title }) {
  for (const skillId of skillIds) {
    const us = ensureUserSkill(userId, skillId)
    run('UPDATE user_skills SET practice = ?, last_used_at = ? WHERE user_id = ? AND skill_id = ?',
      clamp(us.practice + 20, 0, 100), nowIso(), userId, skillId)
    run('INSERT INTO skill_evidence (user_id, skill_id, type, ref_id, title) VALUES (?, ?, ?, ?, ?)', userId, skillId, type, refId, title)
    recordHistory(userId, skillId, type)
  }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// ---------- Goals & gap analysis ----------

/** Order skills so prerequisites come first (within the given set), then by gap size. */
export function orderByDependencies(userId, items) {
  const ids = new Set(items.map((i) => i.skillId))
  const visited = new Set()
  const out = []
  const byId = new Map(items.map((i) => [i.skillId, i]))
  const visit = (id) => {
    if (visited.has(id)) return
    visited.add(id)
    const info = skillInfo(userId, id)
    for (const r of info?.requires || []) if (ids.has(r)) visit(r)
    out.push(byId.get(id))
  }
  ;[...items].sort((a, b) => b.gap - a.gap).forEach((i) => visit(i.skillId))
  return out
}

export function goalAnalysis(userId, goalId) {
  const goal = one('SELECT * FROM goals WHERE id = ? AND user_id = ?', goalId, userId)
  if (!goal) return null
  const reqs = all('SELECT * FROM goal_skills WHERE goal_id = ?', goalId)
  const items = reqs.map((r) => {
    const s = describeSkill(userId, r.skill_id)
    const current = s?.level ?? 0
    const missingPrereqs = (s?.requires || []).filter((p) => {
      const ps = one('SELECT * FROM user_skills WHERE user_id = ? AND skill_id = ?', userId, p)
      return measuredLevel(ps) < 25
    })
    return {
      skillId: r.skill_id,
      name: s?.name ?? r.skill_id,
      category: s?.category,
      current,
      selfLevel: s?.selfLevel ?? null,
      target: r.target_level,
      gap: Math.max(0, r.target_level - current),
      status: s?.status ?? 'none',
      statusLabel: s?.statusLabel ?? STATUS_LABELS.none,
      reviewDue: s?.reviewDue ?? false,
      missingPrereqs: missingPrereqs.map((p) => ({ id: p, name: skillInfo(userId, p)?.name ?? p })),
    }
  })
  const ordered = orderByDependencies(userId, items)
  const progress = items.length
    ? Math.round((items.reduce((a, i) => a + Math.min(1, i.current / Math.max(1, i.target)), 0) / items.length) * 100)
    : 0
  const milestones = all('SELECT * FROM milestones WHERE goal_id = ? ORDER BY position', goalId)
  return { goal, skills: ordered, progress, milestones }
}

// ---------- Next steps ----------

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export function activeGoals(userId) {
  return all("SELECT * FROM goals WHERE user_id = ? AND status = 'active'", userId).sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.id - b.id,
  )
}

/** Build the ordered learning plan for a goal: one concrete action per open skill gap. */
export function learningPlan(userId, goalId) {
  const analysis = goalAnalysis(userId, goalId)
  if (!analysis) return []
  const steps = []
  const seen = new Set()
  for (const item of analysis.skills) {
    if (item.gap <= 0 && !item.reviewDue) continue
    const us = one('SELECT * FROM user_skills WHERE user_id = ? AND skill_id = ?', userId, item.skillId)
    const openLesson = one("SELECT id, title FROM lessons WHERE user_id = ? AND skill_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1", userId, item.skillId)
    const dependents = analysis.skills.filter((o) => (skillInfo(userId, o.skillId)?.requires || []).includes(item.skillId)).map((o) => o.name)
    const why = [`Benötigt für dein Ziel „${analysis.goal.title}“ (Ziel: ${item.target} %, aktuell: ${item.current} %).`]
    if (dependents.length) why.push(`Voraussetzung für ${dependents.join(', ')}.`)
    let action
    if (item.reviewDue) action = { type: 'review', label: `${item.name} wiederholen`, minutes: 5 }
    else if (item.missingPrereqs.length) {
      const p = item.missingPrereqs[0]
      action = { type: 'lesson', skillId: p.id, label: `${p.name} lernen`, minutes: 12 }
      why.unshift(`${p.name} ist Voraussetzung für ${item.name}.`)
    } else if (us?.flag === 'reexplain') action = { type: 'lesson', label: `${item.name} erneut erklärt bekommen`, minutes: 10, mode: 'reexplain' }
    else if ((us?.self_level ?? 0) >= 35 && !us?.attempts) {
      action = { type: 'practice', label: `${item.name}: Stand prüfen`, minutes: 8 }
      why.push(`Du hast dich selbst eingeschätzt — ein kurzer Check misst deinen tatsächlichen Stand, damit du nichts wiederholst, was du schon kannst.`)
    }
    else if (openLesson) action = { type: 'open_lesson', lessonId: openLesson.id, label: openLesson.title, minutes: 12 }
    else if ((us?.knowledge ?? 0) < 35) action = { type: 'lesson', label: `${item.name} lernen`, minutes: 12 }
    else if ((us?.practice ?? 0) < 40) action = { type: 'practice', label: `${item.name} üben`, minutes: 10 }
    else action = { type: 'apply', label: `${item.name} in einem Projekt anwenden`, minutes: 45 }
    const key = `${action.type}:${action.skillId || item.skillId}`
    if (seen.has(key)) continue
    seen.add(key)
    steps.push({ skillId: action.skillId || item.skillId, skillName: item.name, goalId, goalTitle: analysis.goal.title, why: why.join(' '), ...action })
  }
  return steps
}

export function nextStep(userId) {
  for (const g of activeGoals(userId)) {
    const plan = learningPlan(userId, g.id)
    if (plan.length) return plan[0]
  }
  return null
}

export function dueReviews(userId) {
  return all('SELECT * FROM user_skills WHERE user_id = ? AND next_review_at IS NOT NULL AND next_review_at <= ? ORDER BY next_review_at', userId, nowIso())
    .map((us) => describeSkill(userId, us.skill_id, us))
    .filter(Boolean)
}

export function staleSkills(userId) {
  return all('SELECT * FROM user_skills WHERE user_id = ? AND last_used_at IS NOT NULL AND last_used_at < ?', userId, new Date(Date.now() - 30 * DAY).toISOString())
    .map((us) => describeSkill(userId, us.skill_id, us))
    .filter(Boolean)
}

/** Missions ranked by how many of the user's open gap skills they train. */
export function recommendedMissions(userId) {
  const gapSkills = new Set()
  for (const g of activeGoals(userId)) {
    for (const s of goalAnalysis(userId, g.id).skills) if (s.gap > 0) gapSkills.add(s.skillId)
  }
  const taken = new Set(all('SELECT mission_id FROM user_missions WHERE user_id = ?', userId).map((m) => m.mission_id))
  return MISSIONS.filter((m) => !taken.has(m.id))
    .map((m) => ({ ...m, matches: m.skills.filter((s) => gapSkills.has(s)) }))
    .filter((m) => m.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length)
}

export function activeProjectSummary(userId) {
  const p = one("SELECT * FROM projects WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1", userId)
  if (!p) return null
  return { ...p, ...projectProgress(p.id) }
}

export function projectProgress(projectId) {
  const tasks = all('SELECT * FROM project_tasks WHERE project_id = ? ORDER BY position, id', projectId)
  const done = tasks.filter((t) => t.status === 'done').length
  const next = tasks.find((t) => t.status !== 'done') || null
  return { taskCount: tasks.length, doneCount: done, progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0, nextTask: next }
}

/** Daily focus: max. one item per slot — no endless lists. */
export function daily(userId) {
  const step = nextStep(userId)
  const review = dueReviews(userId)[0] || null
  const project = activeProjectSummary(userId)
  const mission = recommendedMissions(userId)[0] || null
  return {
    task: step,
    review: review && { skillId: review.id, name: review.name, minutes: 5 },
    project: project && { id: project.id, title: project.title, progress: project.progress, nextTask: project.nextTask },
    recommendation: mission && { type: 'mission', id: mission.id, title: mission.title, reason: `Trainiert ${mission.matches.map((s) => skillInfo(userId, s)?.name).join(', ')}.` },
  }
}

/** Change in measured level per skill since a given date. */
export function skillDeltas(userId, sinceIso) {
  const rows = all('SELECT * FROM user_skills WHERE user_id = ?', userId)
  const out = []
  for (const us of rows) {
    const base = one(
      'SELECT knowledge, practice FROM skill_history WHERE user_id = ? AND skill_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT 1',
      userId, us.skill_id, sinceIso.replace('T', ' ').slice(0, 19),
    )
    const before = base ? Math.round(0.5 * base.knowledge + 0.5 * base.practice) : 0
    const now = measuredLevel(us)
    const changed = one('SELECT 1 FROM skill_history WHERE user_id = ? AND skill_id = ? AND created_at >= ? LIMIT 1', userId, us.skill_id, sinceIso.replace('T', ' ').slice(0, 19))
    if (changed && now !== before) out.push({ skillId: us.skill_id, name: skillInfo(userId, us.skill_id)?.name ?? us.skill_id, delta: now - before, level: now })
  }
  return out.sort((a, b) => b.delta - a.delta)
}

export function weeklyReview(userId) {
  const since = new Date(Date.now() - 7 * DAY).toISOString()
  const sinceSql = since.replace('T', ' ').slice(0, 19)
  const activity = all('SELECT * FROM activity WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC', userId, sinceSql)
  const sessions = all('SELECT skill_id, score FROM practice_sessions WHERE user_id = ? AND completed_at >= ?', userId, since)
  const difficulties = []
  const bySkill = new Map()
  for (const s of sessions) {
    if (!bySkill.has(s.skill_id)) bySkill.set(s.skill_id, [])
    bySkill.get(s.skill_id).push(s.score)
  }
  for (const [skillId, scores] of bySkill) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    if (avg < 0.6) difficulties.push({ skillId, name: skillInfo(userId, skillId)?.name ?? skillId, avgScore: Math.round(avg * 100) })
  }
  const projects = all(
    "SELECT DISTINCT p.id, p.title FROM activity a JOIN projects p ON p.id = a.ref_id WHERE a.user_id = ? AND a.type IN ('project_task', 'project_completed') AND a.created_at >= ?",
    userId, sinceSql,
  ).map((p) => ({ ...p, ...projectProgress(p.id) }))
  const nextWeek = []
  for (const g of activeGoals(userId)) nextWeek.push(...learningPlan(userId, g.id).slice(0, 2))
  return {
    since,
    learned: activity.filter((a) => ['lesson_completed', 'practice_completed', 'mission_step', 'review_completed'].includes(a.type)),
    minutes: activity.reduce((a, x) => a + (x.minutes || 0), 0),
    skillGains: skillDeltas(userId, since),
    projects,
    difficulties,
    nextWeek: nextWeek.slice(0, 4),
  }
}

/** Create reminder notifications for due reviews (deduplicated per skill and day). */
export function refreshNotifications(userId) {
  const today = new Date().toISOString().slice(0, 10)
  const due = dueReviews(userId)
  if (due.length) {
    notify(userId, 'review', due.length === 1 ? `Deine nächste Wiederholung ist bereit: ${due[0].name}.` : `${due.length} Wiederholungen sind bereit.`, {
      link: '/practice',
      dedupeKey: `review:${today}`,
    })
  }
}
