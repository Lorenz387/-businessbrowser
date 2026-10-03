import { Router } from 'express'
import { one, all, run, tx, parseJSON } from '../db.js'
import { h, str, int, oneOf, badRequest, notFound, ApiError } from '../lib/http.js'
import { entitlements, requireFeature } from '../lib/auth.js'
import * as E from '../lib/engine.js'
import { SKILLS, CATEGORIES, GOAL_TEMPLATES, MISSIONS, getMission, getCatalogSkill } from '../lib/catalog.js'
import { createGoal, ensureCustomSkill } from '../lib/goals.js'
import { generateLesson, generateQuiz, gradeOpenAnswer, planProject, projectFeedback, aiAvailable } from '../lib/ai.js'
import { consumeDaily } from '../lib/usage.js'
import { FEATURE_LABELS } from '../lib/plans.js'

const r = Router()
const uid = (req) => req.user.id
const nowIso = () => new Date().toISOString()

// ---------------- Dashboard ----------------

r.get('/dashboard', h(async (req, res) => {
  const userId = uid(req)
  E.refreshNotifications(userId)
  const goals = E.activeGoals(userId).map((g) => {
    const a = E.goalAnalysis(userId, g.id)
    return { id: g.id, title: g.title, progress: a.progress, priority: g.priority }
  })
  const since = new Date(Date.now() - 7 * 864e5).toISOString()
  res.json({
    name: req.user.name,
    daily: E.daily(userId),
    goals,
    project: E.activeProjectSummary(userId),
    skillDevelopment: E.skillDeltas(userId, since).slice(0, 4),
    reviewsDue: E.dueReviews(userId).length,
    staleSkills: E.staleSkills(userId).slice(0, 3).map((s) => ({ id: s.id, name: s.name })),
  })
}))

r.get('/daily', h(async (req, res) => res.json(E.daily(uid(req)))))
r.get('/weekly', h(async (req, res) => res.json(E.weeklyReview(uid(req)))))

// ---------------- Catalog ----------------

r.get('/catalog', h(async (req, res) => {
  res.json({
    skills: E.skillCatalog(uid(req)),
    categories: CATEGORIES,
    goalTemplates: GOAL_TEMPLATES.map((t) => ({ ...t, skills: t.skills.map(([id, target]) => ({ id, name: getCatalogSkill(id)?.name, target })) })),
    missions: MISSIONS,
  })
}))

// ---------------- Goals ----------------

const PRIORITIES = ['high', 'medium', 'low']

r.get('/goals', h(async (req, res) => {
  const userId = uid(req)
  const goals = all('SELECT * FROM goals WHERE user_id = ? ORDER BY status, created_at DESC', userId).map((g) => {
    const a = E.goalAnalysis(userId, g.id)
    return { ...g, progress: a.progress, skillCount: a.skills.length, openGaps: a.skills.filter((s) => s.gap > 0).length }
  })
  res.json({ goals, limit: entitlements(userId).limits.goals })
}))

r.post('/goals', h(async (req, res) => {
  const b = req.body
  const result = await createGoal(uid(req), {
    templateId: str(b.templateId, { max: 60 }),
    title: str(b.title, { max: 160, field: 'Titel' }),
    description: str(b.description, { max: 4000 }),
    targetState: str(b.targetState, { max: 1000 }),
    currentState: str(b.currentState, { max: 1000 }),
    timeframeWeeks: int(b.timeframeWeeks, { min: 1, max: 520 }),
    priority: oneOf(b.priority, PRIORITIES, { fallback: 'medium' }),
    skills: Array.isArray(b.skills) ? b.skills : undefined,
  })
  res.status(201).json(result)
}))

function ownGoal(req) {
  const g = one('SELECT * FROM goals WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!g) throw notFound('Dieses Ziel existiert nicht oder gehört nicht zu deinem Konto.')
  return g
}

r.get('/goals/:id', h(async (req, res) => {
  const userId = uid(req)
  const g = ownGoal(req)
  const a = E.goalAnalysis(userId, g.id)
  const plan = entitlements(userId)
  const fullGap = plan.flags.fullGap
  const skills = fullGap ? a.skills : a.skills.slice(0, 3)
  res.json({
    ...a,
    skills,
    hiddenSkillCount: a.skills.length - skills.length,
    plan: E.learningPlan(userId, g.id),
    projects: all('SELECT id, title, status FROM projects WHERE goal_id = ? AND user_id = ?', g.id, userId),
    missions: E.recommendedMissions(userId).filter((m) => m.skills.some((s) => a.skills.some((x) => x.skillId === s))).slice(0, 3),
    lessons: all('SELECT id, title, skill_id, status FROM lessons WHERE goal_id = ? AND user_id = ? ORDER BY id DESC LIMIT 20', g.id, userId),
  })
}))

r.patch('/goals/:id', h(async (req, res) => {
  const g = ownGoal(req)
  const b = req.body
  const status = oneOf(b.status, ['active', 'paused', 'completed', 'archived'], { fallback: g.status })
  run(
    `UPDATE goals SET title = ?, description = ?, target_state = ?, current_state = ?, timeframe_weeks = ?, priority = ?, status = ?,
     completed_at = CASE WHEN ? = 'completed' AND completed_at IS NULL THEN ? ELSE completed_at END WHERE id = ?`,
    str(b.title, { max: 160 }) ?? g.title,
    b.description !== undefined ? str(b.description, { max: 4000 }) : g.description,
    b.targetState !== undefined ? str(b.targetState, { max: 1000 }) : g.target_state,
    b.currentState !== undefined ? str(b.currentState, { max: 1000 }) : g.current_state,
    b.timeframeWeeks !== undefined ? int(b.timeframeWeeks, { min: 1, max: 520 }) : g.timeframe_weeks,
    oneOf(b.priority, PRIORITIES, { fallback: g.priority }),
    status, status, nowIso(), g.id,
  )
  if (status === 'active' && g.status !== 'active') {
    const plan = entitlements(uid(req))
    const count = one("SELECT COUNT(*) AS n FROM goals WHERE user_id = ? AND status = 'active'", uid(req)).n
    if (count > plan.limits.goals) {
      run('UPDATE goals SET status = ? WHERE id = ?', g.status, g.id)
      throw new ApiError(402, 'plan_limit', `Dein Tarif ${plan.name} erlaubt ${plan.limits.goals} aktive Ziele.`, { feature: 'goals' })
    }
  }
  if (status === 'completed' && g.status !== 'completed') E.logActivity(uid(req), 'goal_completed', g.title, { refId: g.id })
  res.json({ ok: true })
}))

r.delete('/goals/:id', h(async (req, res) => {
  const g = ownGoal(req)
  run('DELETE FROM goals WHERE id = ?', g.id)
  res.json({ ok: true })
}))

r.post('/goals/:id/skills', h(async (req, res) => {
  const g = ownGoal(req)
  const userId = uid(req)
  let skillId = str(req.body.skillId, { max: 80 })
  if (!skillId && req.body.name) skillId = ensureCustomSkill(userId, str(req.body.name, { max: 80, required: true, field: 'Skillname' }))
  if (!skillId || !E.skillInfo(userId, skillId)) throw badRequest('Unbekannter Skill.')
  const target = int(req.body.target, { min: 10, max: 100, fallback: 60 })
  run('INSERT INTO goal_skills (goal_id, skill_id, target_level) VALUES (?, ?, ?) ON CONFLICT(goal_id, skill_id) DO UPDATE SET target_level = excluded.target_level', g.id, skillId, target)
  E.ensureUserSkill(userId, skillId)
  res.json({ ok: true })
}))

r.delete('/goals/:id/skills/:skillId', h(async (req, res) => {
  const g = ownGoal(req)
  run('DELETE FROM goal_skills WHERE goal_id = ? AND skill_id = ?', g.id, req.params.skillId)
  res.json({ ok: true })
}))

r.post('/goals/:id/milestones', h(async (req, res) => {
  const g = ownGoal(req)
  const title = str(req.body.title, { required: true, max: 200, field: 'Meilenstein' })
  const pos = one('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM milestones WHERE goal_id = ?', g.id).p
  run('INSERT INTO milestones (goal_id, title, position) VALUES (?, ?, ?)', g.id, title, pos)
  res.json({ ok: true })
}))

r.patch('/milestones/:id', h(async (req, res) => {
  const m = one('SELECT m.* FROM milestones m JOIN goals g ON g.id = m.goal_id WHERE m.id = ? AND g.user_id = ?', Number(req.params.id), uid(req))
  if (!m) throw notFound()
  const done = !!req.body.done
  run('UPDATE milestones SET done_at = ? WHERE id = ?', done ? nowIso() : null, m.id)
  if (done && !m.done_at) E.logActivity(uid(req), 'milestone', m.title, { refId: m.goal_id })
  res.json({ ok: true })
}))

r.delete('/milestones/:id', h(async (req, res) => {
  const m = one('SELECT m.id FROM milestones m JOIN goals g ON g.id = m.goal_id WHERE m.id = ? AND g.user_id = ?', Number(req.params.id), uid(req))
  if (!m) throw notFound()
  run('DELETE FROM milestones WHERE id = ?', m.id)
  res.json({ ok: true })
}))

// ---------------- Skills ----------------

r.get('/skills', h(async (req, res) => {
  const userId = uid(req)
  const skills = E.userSkills(userId)
  const tracked = new Set(skills.map((s) => s.id))
  const edges = []
  for (const s of skills) for (const req2 of s.requires || []) if (tracked.has(req2)) edges.push({ from: req2, to: s.id })
  res.json({ skills, edges })
}))

r.get('/skills/:id', h(async (req, res) => {
  const userId = uid(req)
  const id = req.params.id
  const info = E.skillInfo(userId, id)
  if (!info) throw notFound('Diesen Skill gibt es nicht.')
  const skill = E.describeSkill(userId, id)
  const neededBy = SKILLS.filter((s) => s.requires.includes(id)).map((s) => ({ id: s.id, name: s.name }))
  res.json({
    skill,
    requires: (info.requires || []).map((p) => E.describeSkill(userId, p)),
    neededBy,
    evidence: E.evidenceFor(userId, id),
    history: all('SELECT knowledge, practice, source, created_at FROM skill_history WHERE user_id = ? AND skill_id = ? ORDER BY created_at', userId, id),
    goals: all('SELECT g.id, g.title, gs.target_level FROM goal_skills gs JOIN goals g ON g.id = gs.goal_id WHERE gs.skill_id = ? AND g.user_id = ?', id, userId),
    projects: all('SELECT p.id, p.title, p.status FROM project_skills ps JOIN projects p ON p.id = ps.project_id WHERE ps.skill_id = ? AND p.user_id = ?', id, userId),
    lessons: all('SELECT id, title, status, created_at FROM lessons WHERE user_id = ? AND skill_id = ? ORDER BY id DESC', userId, id),
    sessions: all('SELECT id, kind, difficulty, score, completed_at FROM practice_sessions WHERE user_id = ? AND skill_id = ? AND completed_at IS NOT NULL ORDER BY id DESC LIMIT 20', userId, id),
    missions: MISSIONS.filter((m) => m.skills.includes(id)).map((m) => ({ id: m.id, title: m.title })),
  })
}))

r.post('/skills', h(async (req, res) => {
  const userId = uid(req)
  let skillId = str(req.body.skillId, { max: 80 })
  if (!skillId) skillId = ensureCustomSkill(userId, str(req.body.name, { required: true, max: 80, field: 'Skillname' }), str(req.body.category, { max: 60 }) || 'Eigene Skills')
  if (!E.skillInfo(userId, skillId)) throw badRequest('Unbekannter Skill.')
  E.ensureUserSkill(userId, skillId)
  if (req.body.selfLevel != null) run('UPDATE user_skills SET self_level = ? WHERE user_id = ? AND skill_id = ?', int(req.body.selfLevel, { min: 0, max: 100 }), userId, skillId)
  res.status(201).json({ skillId })
}))

r.patch('/skills/:id', h(async (req, res) => {
  const userId = uid(req)
  const us = one('SELECT * FROM user_skills WHERE user_id = ? AND skill_id = ?', userId, req.params.id)
  if (!us) throw notFound()
  run('UPDATE user_skills SET self_level = ? WHERE user_id = ? AND skill_id = ?', int(req.body.selfLevel, { min: 0, max: 100 }), userId, req.params.id)
  res.json({ ok: true })
}))

r.delete('/skills/:id', h(async (req, res) => {
  const userId = uid(req)
  run('DELETE FROM user_skills WHERE user_id = ? AND skill_id = ?', userId, req.params.id)
  run('DELETE FROM skill_history WHERE user_id = ? AND skill_id = ?', userId, req.params.id)
  res.json({ ok: true })
}))

// ---------------- Learn ----------------

r.get('/learn', h(async (req, res) => {
  const userId = uid(req)
  const plans = E.activeGoals(userId).map((g) => ({ goalId: g.id, goalTitle: g.title, steps: E.learningPlan(userId, g.id) }))
  res.json({
    plans,
    lessons: all('SELECT id, title, skill_id, status, mode, created_at, completed_at FROM lessons WHERE user_id = ? ORDER BY id DESC LIMIT 50', userId)
      .map((l) => ({ ...l, skillName: E.skillInfo(userId, l.skill_id)?.name })),
    reviews: E.dueReviews(userId),
    stale: E.staleSkills(userId),
    aiAvailable: aiAvailable(),
  })
}))

r.post('/lessons', h(async (req, res) => {
  const userId = uid(req)
  const skillId = str(req.body.skillId, { required: true, max: 80, field: 'Skill' })
  if (!E.skillInfo(userId, skillId)) throw badRequest('Unbekannter Skill.')
  const plan = entitlements(userId)
  let mode = oneOf(req.body.mode, ['normal', 'reexplain', 'simplify', 'compress', 'short', 'deep'], { fallback: null })
  const us = E.ensureUserSkill(userId, skillId)
  if (!mode) mode = plan.flags.adaptive && us.flag ? us.flag : 'normal'
  const goalId = int(req.body.goalId) ?? null
  const goal = goalId ? one('SELECT * FROM goals WHERE id = ? AND user_id = ?', goalId, userId) : null
  consumeDaily(userId, 'lessons')
  const level = E.measuredLevel(us)
  const content = await generateLesson(userId, { skillId, level, mode, goalTitle: goal?.title })
  const r2 = run('INSERT INTO lessons (user_id, skill_id, goal_id, title, level, mode, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
    userId, skillId, goal?.id ?? null, content.title, level, mode, JSON.stringify(content))
  res.status(201).json({ id: Number(r2.lastInsertRowid) })
}))

function ownLesson(req) {
  const l = one('SELECT * FROM lessons WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!l) throw notFound('Diese Lektion existiert nicht.')
  return l
}

r.get('/lessons/:id', h(async (req, res) => {
  const userId = uid(req)
  const l = ownLesson(req)
  const goal = l.goal_id ? one('SELECT id, title FROM goals WHERE id = ?', l.goal_id) : null
  res.json({ ...l, content: parseJSON(l.content, {}), skill: E.describeSkill(userId, l.skill_id), goal })
}))

r.post('/lessons/:id/complete', h(async (req, res) => {
  const userId = uid(req)
  const l = ownLesson(req)
  const minutes = int(req.body.minutes, { min: 0, max: 600, fallback: 0 })
  if (l.status !== 'done') {
    run("UPDATE lessons SET status = 'done', completed_at = ? WHERE id = ?", nowIso(), l.id)
    E.applyLessonCompleted(userId, l.skill_id)
    E.logActivity(userId, 'lesson_completed', l.title, { skillId: l.skill_id, refId: l.id, minutes })
  }
  res.json({ ok: true, next: E.nextStep(userId) })
}))

r.delete('/lessons/:id', h(async (req, res) => {
  const l = ownLesson(req)
  run('DELETE FROM lessons WHERE id = ?', l.id)
  res.json({ ok: true })
}))

// ---------------- Practice ----------------

const PRACTICE_KINDS = ['quiz', 'mc', 'open', 'numeric', 'code', 'order', 'case', 'exam']

/** Strip solutions before sending questions to the client. */
function publicQuestion(q) {
  const base = { id: q.id, type: q.type, prompt: q.prompt, code: q.code || '' }
  if (q.type === 'mc') base.options = q.options
  if (q.type === 'order') {
    // deterministic shuffle so reloads keep the same order
    base.items = q.items.map((t, i) => ({ t, k: (i * 7 + 3) % (q.items.length + 1) })).sort((a, b) => a.k - b.k).map((x) => x.t)
  }
  return base
}

r.get('/practice', h(async (req, res) => {
  const userId = uid(req)
  res.json({
    reviews: E.dueReviews(userId),
    sessions: all('SELECT id, skill_id, kind, difficulty, score, started_at, completed_at FROM practice_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 30', userId)
      .map((s) => ({ ...s, skillName: E.skillInfo(userId, s.skill_id)?.name })),
    skills: E.userSkills(userId).map((s) => ({ id: s.id, name: s.name, difficulty: s.difficulty, level: s.level, reviewDue: s.reviewDue })),
    aiAvailable: aiAvailable(),
  })
}))

r.post('/practice', h(async (req, res) => {
  const userId = uid(req)
  const skillId = str(req.body.skillId, { required: true, max: 80, field: 'Skill' })
  if (!E.skillInfo(userId, skillId)) throw badRequest('Unbekannter Skill.')
  const kind = oneOf(req.body.kind, PRACTICE_KINDS, { fallback: 'quiz' })
  const us = E.ensureUserSkill(userId, skillId)
  const plan = entitlements(userId)
  const pref = one('SELECT difficulty_pref FROM profiles WHERE user_id = ?', userId)?.difficulty_pref
  const shift = pref === 'easier' ? -1 : pref === 'harder' ? 1 : 0
  const difficulty = int(req.body.difficulty, { min: 1, max: 5 }) ?? Math.min(5, Math.max(1, (plan.flags.adaptive ? us.difficulty : 2) + shift))
  const count = kind === 'exam' ? 10 : int(req.body.count, { min: 3, max: 10, fallback: 5 })
  const lesson = req.body.lessonId ? one('SELECT * FROM lessons WHERE id = ? AND user_id = ?', Number(req.body.lessonId), userId) : null
  consumeDaily(userId, 'ai_messages')
  const questions = await generateQuiz(userId, { skillId, difficulty, count, kind, lessonContent: lesson?.content })
  const r2 = run('INSERT INTO practice_sessions (user_id, skill_id, lesson_id, kind, difficulty, questions) VALUES (?, ?, ?, ?, ?, ?)',
    userId, skillId, lesson?.id ?? null, req.body.review ? 'review' : kind, difficulty, JSON.stringify(questions))
  res.status(201).json({ id: Number(r2.lastInsertRowid) })
}))

function ownSession(req) {
  const s = one('SELECT * FROM practice_sessions WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!s) throw notFound('Diese Übung existiert nicht.')
  return s
}

r.get('/practice/:id', h(async (req, res) => {
  const userId = uid(req)
  const s = ownSession(req)
  const questions = parseJSON(s.questions, [])
  const done = !!s.completed_at
  res.json({
    id: s.id,
    kind: s.kind,
    skill: E.describeSkill(userId, s.skill_id),
    difficulty: s.difficulty,
    completed: done,
    score: s.score,
    questions: done ? questions : questions.map(publicQuestion),
    answers: parseJSON(s.answers, null),
    results: parseJSON(s.results, null),
    startedAt: s.started_at,
  })
}))

const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

r.post('/practice/:id/submit', h(async (req, res) => {
  const userId = uid(req)
  const s = ownSession(req)
  if (s.completed_at) throw badRequest('Diese Übung wurde bereits abgegeben.')
  const questions = parseJSON(s.questions, [])
  const answers = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {}
  const results = []
  for (const q of questions) {
    const a = answers[q.id]
    let correct = false
    let score = 0
    let feedback = ''
    let misconception = ''
    if (q.type === 'mc') {
      correct = Number(a) === q.correctIndex
      score = correct ? 1 : 0
    } else if (q.type === 'numeric') {
      const n = Number(String(a ?? '').replace(',', '.'))
      correct = Number.isFinite(n) && Math.abs(n - q.numericAnswer) <= Math.max(q.tolerance || 0, 1e-9)
      score = correct ? 1 : 0
    } else if (q.type === 'order') {
      const given = Array.isArray(a) ? a : []
      const hits = q.items.filter((it, i) => given[i] === it).length
      score = q.items.length ? hits / q.items.length : 0
      correct = score === 1
    } else {
      // open & code: exact match first, otherwise graded by Junis AI
      if (q.acceptedAnswers?.some((x) => norm(x) === norm(a))) {
        score = 1
      } else if (!norm(a)) {
        score = 0
        feedback = 'Keine Antwort abgegeben.'
      } else {
        const g = await gradeOpenAnswer(q, String(a).slice(0, 8000))
        score = g.score
        feedback = g.feedback
        misconception = g.misconception
      }
      correct = score >= 0.75
    }
    results.push({ id: q.id, correct, score, feedback, misconception, concept: q.concept })
  }
  const total = results.length
  const correctCount = results.filter((x) => x.correct).length
  const score = total ? results.reduce((a, x) => a + x.score, 0) / total : 0
  const durationMs = Math.max(0, Date.now() - new Date(s.started_at.replace(' ', 'T') + 'Z').getTime())
  const secondsPerQuestion = total ? durationMs / 1000 / total : null
  const skill = E.skillInfo(userId, s.skill_id)
  const plan = entitlements(userId)
  const isReview = s.kind === 'review'
  const adaptation = tx(() => {
    run('UPDATE practice_sessions SET answers = ?, results = ?, score = ?, completed_at = ?, duration_ms = ? WHERE id = ?',
      JSON.stringify(answers), JSON.stringify(results), score, nowIso(), durationMs, s.id)
    const out = E.applyPracticeResult(userId, s.skill_id, {
      score, difficulty: s.difficulty, correct: correctCount, total, secondsPerQuestion,
      adaptive: plan.flags.adaptive, title: `${isReview ? 'Wiederholung' : 'Übung'}: ${skill.name} (Stufe ${s.difficulty})`, sessionId: s.id, isReview,
    })
    E.logActivity(userId, isReview ? 'review_completed' : 'practice_completed', `${skill.name}: ${Math.round(score * 100)} %`, {
      skillId: s.skill_id, refId: s.id, minutes: Math.round(durationMs / 60000),
    })
    const wrongConcepts = results.filter((x) => !x.correct && x.concept).map((x) => x.concept)
    if (wrongConcepts.length >= 2) {
      run("INSERT INTO memories (user_id, kind, content, source) VALUES (?, 'Häufige Fehler', ?, 'practice')", userId, `${skill.name}: ${[...new Set(wrongConcepts)].slice(0, 4).join(', ')}`)
    }
    return out
  })
  res.json({ score, correct: correctCount, total, results, adaptation, skill: E.describeSkill(userId, s.skill_id), next: E.nextStep(userId) })
}))

// ---------------- Missions ----------------

r.get('/missions', h(async (req, res) => {
  const userId = uid(req)
  const mine = all('SELECT * FROM user_missions WHERE user_id = ? ORDER BY started_at DESC', userId).map((um) => {
    const m = getMission(um.mission_id)
    const done = parseJSON(um.steps_done, [])
    return { ...um, mission: m, stepsDone: done, progress: m ? Math.round((done.length / m.steps.length) * 100) : 0 }
  })
  const recommended = new Set(E.recommendedMissions(userId).map((m) => m.id))
  res.json({
    mine,
    catalog: MISSIONS.map((m) => ({ ...m, recommended: recommended.has(m.id), skillNames: m.skills.map((s) => getCatalogSkill(s)?.name) })),
    limit: entitlements(userId).limits.activeMissions,
  })
}))

r.post('/missions/:missionId/start', h(async (req, res) => {
  const userId = uid(req)
  const m = getMission(req.params.missionId)
  if (!m) throw notFound('Diese Mission gibt es nicht.')
  const plan = entitlements(userId)
  const active = one("SELECT COUNT(*) AS n FROM user_missions WHERE user_id = ? AND status = 'active'", userId).n
  if (active >= plan.limits.activeMissions) throw new ApiError(402, 'plan_limit', `Dein Tarif ${plan.name} erlaubt ${plan.limits.activeMissions} aktive Mission(en). Schließe zuerst eine Mission ab oder wechsle den Tarif.`, { feature: 'missions' })
  if (one("SELECT 1 FROM user_missions WHERE user_id = ? AND mission_id = ? AND status = 'active'", userId, m.id)) throw badRequest('Diese Mission läuft bereits.')
  const id = tx(() => {
    const p = run("INSERT INTO projects (user_id, title, objective, description, mission_id) VALUES (?, ?, ?, ?, ?)", userId, m.title, m.result, m.summary, m.id)
    const projectId = Number(p.lastInsertRowid)
    m.steps.forEach((s, i) => run('INSERT INTO project_tasks (project_id, title, position) VALUES (?, ?, ?)', projectId, s.title, i))
    for (const s of m.skills) {
      run('INSERT OR IGNORE INTO project_skills (project_id, skill_id) VALUES (?, ?)', projectId, s)
      E.ensureUserSkill(userId, s)
    }
    const um = run('INSERT INTO user_missions (user_id, mission_id, project_id) VALUES (?, ?, ?)', userId, m.id, projectId)
    E.logActivity(userId, 'mission_started', m.title, { refId: projectId })
    return Number(um.lastInsertRowid)
  })
  res.status(201).json({ id })
}))

function ownMission(req) {
  const um = one('SELECT * FROM user_missions WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req))
  if (!um) throw notFound('Diese Mission existiert nicht.')
  return um
}

r.get('/user-missions/:id', h(async (req, res) => {
  const userId = uid(req)
  const um = ownMission(req)
  const m = getMission(um.mission_id)
  res.json({
    ...um,
    mission: { ...m, skillDetails: m.skills.map((s) => E.describeSkill(userId, s)) },
    stepsDone: parseJSON(um.steps_done, []),
    project: um.project_id ? one('SELECT id, title, result, result_url FROM projects WHERE id = ?', um.project_id) : null,
  })
}))

r.post('/user-missions/:id/steps/:index', h(async (req, res) => {
  const userId = uid(req)
  const um = ownMission(req)
  const m = getMission(um.mission_id)
  const idx = Number(req.params.index)
  if (!Number.isInteger(idx) || idx < 0 || idx >= m.steps.length) throw badRequest('Ungültiger Schritt.')
  const done = new Set(parseJSON(um.steps_done, []))
  const mark = req.body.done !== false
  if (mark) done.add(idx)
  else done.delete(idx)
  const list = [...done].sort((a, b) => a - b)
  run('UPDATE user_missions SET steps_done = ? WHERE id = ?', JSON.stringify(list), um.id)
  if (um.project_id) {
    const task = one('SELECT id FROM project_tasks WHERE project_id = ? AND position = ?', um.project_id, idx)
    if (task) run('UPDATE project_tasks SET status = ? WHERE id = ?', mark ? 'done' : 'todo', task.id)
  }
  if (mark) E.logActivity(userId, 'mission_step', `${m.title}: ${m.steps[idx].title}`, { refId: um.project_id })
  res.json({ stepsDone: list })
}))

r.post('/user-missions/:id/complete', h(async (req, res) => {
  const userId = uid(req)
  const um = ownMission(req)
  if (um.status === 'completed') throw badRequest('Diese Mission ist bereits abgeschlossen.')
  const m = getMission(um.mission_id)
  const done = parseJSON(um.steps_done, [])
  if (done.length < m.steps.length) throw badRequest('Schließe zuerst alle Schritte der Mission ab.')
  const result = str(req.body.result, { required: true, max: 5000, field: 'Ergebnisbeschreibung' })
  const resultUrl = str(req.body.resultUrl, { max: 500 })
  tx(() => {
    run("UPDATE user_missions SET status = 'completed', completed_at = ? WHERE id = ?", nowIso(), um.id)
    if (um.project_id) run("UPDATE projects SET status = 'completed', result = ?, result_url = ?, completed_at = ? WHERE id = ?", result, resultUrl, nowIso(), um.project_id)
    E.applyAppliedWork(userId, m.skills, { type: 'mission', refId: um.project_id, title: `Mission: ${m.title}` })
    E.logActivity(userId, 'mission_completed', m.title, { refId: um.project_id })
    E.notify(userId, 'project', `Du hast die Mission „${m.title}“ abgeschlossen.`, { link: `/portfolio`, dedupeKey: `mission:${um.id}` })
  })
  res.json({ ok: true, next: E.recommendedMissions(userId)[0] || null })
}))

r.delete('/user-missions/:id', h(async (req, res) => {
  const um = ownMission(req)
  run("UPDATE user_missions SET status = 'abandoned' WHERE id = ?", um.id)
  if (um.project_id) run("UPDATE projects SET status = 'archived' WHERE id = ? AND status = 'active'", um.project_id)
  res.json({ ok: true })
}))

// ---------------- Projects ----------------

r.get('/projects', h(async (req, res) => {
  const userId = uid(req)
  const projects = all('SELECT * FROM projects WHERE user_id = ? ORDER BY status, created_at DESC', userId).map((p) => ({
    ...p,
    ...E.projectProgress(p.id),
    skills: all('SELECT skill_id FROM project_skills WHERE project_id = ?', p.id).map((s) => ({ id: s.skill_id, name: E.skillInfo(userId, s.skill_id)?.name })),
  }))
  res.json({ projects, limit: entitlements(userId).limits.projects, aiAvailable: aiAvailable() })
}))

r.post('/projects', h(async (req, res) => {
  const userId = uid(req)
  const plan = entitlements(userId)
  const active = one("SELECT COUNT(*) AS n FROM projects WHERE user_id = ? AND status = 'active'", userId).n
  if (active >= plan.limits.projects) throw new ApiError(402, 'plan_limit', `Dein Tarif ${plan.name} erlaubt ${plan.limits.projects} aktive Projekte.`, { feature: 'projects' })
  const title = str(req.body.title, { required: true, max: 160, field: 'Titel' })
  const objective = str(req.body.objective, { max: 1000 })
  const description = str(req.body.description, { max: 5000 })
  const goalId = int(req.body.goalId)
  if (goalId && !one('SELECT 1 FROM goals WHERE id = ? AND user_id = ?', goalId, userId)) throw badRequest('Unbekanntes Ziel.')
  let tasks = Array.isArray(req.body.tasks) ? req.body.tasks.map((t) => String(t).trim()).filter(Boolean).slice(0, 30) : []
  let skills = Array.isArray(req.body.skills) ? req.body.skills.filter((s) => E.skillInfo(userId, s)) : []
  let planned = false
  if (req.body.planWithAi) {
    const p = await planProject(userId, { title, objective, description })
    tasks = tasks.length ? tasks : p.tasks
    skills = [...new Set([...skills, ...p.skills.filter((s) => getCatalogSkill(s))])]
    planned = true
  }
  const id = tx(() => {
    const r2 = run('INSERT INTO projects (user_id, goal_id, title, objective, description) VALUES (?, ?, ?, ?, ?)', userId, goalId, title, objective, description)
    const projectId = Number(r2.lastInsertRowid)
    tasks.forEach((t, i) => run('INSERT INTO project_tasks (project_id, title, position) VALUES (?, ?, ?)', projectId, t.slice(0, 300), i))
    for (const s of skills) {
      run('INSERT OR IGNORE INTO project_skills (project_id, skill_id) VALUES (?, ?)', projectId, s)
      E.ensureUserSkill(userId, s)
    }
    E.logActivity(userId, 'project_created', title, { refId: projectId })
    return projectId
  })
  res.status(201).json({ id, planned })
}))

function ownProject(req, id = req.params.id) {
  const p = one('SELECT * FROM projects WHERE id = ? AND user_id = ?', Number(id), uid(req))
  if (!p) throw notFound('Dieses Projekt existiert nicht.')
  return p
}

r.get('/projects/:id', h(async (req, res) => {
  const userId = uid(req)
  const p = ownProject(req)
  res.json({
    ...p,
    ...E.projectProgress(p.id),
    tasks: all('SELECT * FROM project_tasks WHERE project_id = ? ORDER BY position, id', p.id),
    skills: all('SELECT skill_id FROM project_skills WHERE project_id = ?', p.id).map((s) => E.describeSkill(userId, s.skill_id)).filter(Boolean),
    feedback: all('SELECT * FROM project_feedback WHERE project_id = ? ORDER BY created_at DESC', p.id),
    files: all('SELECT id, filename, mime, size, created_at, summary IS NOT NULL AS analyzed FROM documents WHERE project_id = ? AND user_id = ?', p.id, userId),
    goal: p.goal_id ? one('SELECT id, title FROM goals WHERE id = ?', p.goal_id) : null,
    mission: p.mission_id ? one('SELECT id FROM user_missions WHERE project_id = ?', p.id) : null,
    aiAvailable: aiAvailable(),
  })
}))

r.patch('/projects/:id', h(async (req, res) => {
  const p = ownProject(req)
  const b = req.body
  run('UPDATE projects SET title = ?, objective = ?, description = ?, result = ?, result_url = ?, goal_id = ? WHERE id = ?',
    str(b.title, { max: 160 }) ?? p.title,
    b.objective !== undefined ? str(b.objective, { max: 1000 }) : p.objective,
    b.description !== undefined ? str(b.description, { max: 5000 }) : p.description,
    b.result !== undefined ? str(b.result, { max: 5000 }) : p.result,
    b.resultUrl !== undefined ? str(b.resultUrl, { max: 500 }) : p.result_url,
    b.goalId !== undefined ? (int(b.goalId) && one('SELECT 1 FROM goals WHERE id = ? AND user_id = ?', int(b.goalId), uid(req)) ? int(b.goalId) : null) : p.goal_id,
    p.id)
  if (Array.isArray(b.skills)) {
    run('DELETE FROM project_skills WHERE project_id = ?', p.id)
    for (const s of b.skills) if (E.skillInfo(uid(req), s)) run('INSERT OR IGNORE INTO project_skills (project_id, skill_id) VALUES (?, ?)', p.id, s)
  }
  res.json({ ok: true })
}))

r.post('/projects/:id/tasks', h(async (req, res) => {
  const p = ownProject(req)
  const title = str(req.body.title, { required: true, max: 300, field: 'Aufgabe' })
  const pos = one('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM project_tasks WHERE project_id = ?', p.id).p
  run('INSERT INTO project_tasks (project_id, title, position) VALUES (?, ?, ?)', p.id, title, pos)
  res.status(201).json({ ok: true })
}))

r.patch('/tasks/:id', h(async (req, res) => {
  const t = one('SELECT t.*, p.title AS project_title, p.id AS pid FROM project_tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = ? AND p.user_id = ?', Number(req.params.id), uid(req))
  if (!t) throw notFound()
  const status = oneOf(req.body.status, ['todo', 'doing', 'done'], { fallback: t.status })
  run('UPDATE project_tasks SET status = ?, title = ? WHERE id = ?', status, str(req.body.title, { max: 300 }) ?? t.title, t.id)
  if (status === 'done' && t.status !== 'done') E.logActivity(uid(req), 'project_task', `${t.project_title}: ${t.title}`, { refId: t.pid })
  res.json({ ok: true })
}))

r.delete('/tasks/:id', h(async (req, res) => {
  const t = one('SELECT t.id FROM project_tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = ? AND p.user_id = ?', Number(req.params.id), uid(req))
  if (!t) throw notFound()
  run('DELETE FROM project_tasks WHERE id = ?', t.id)
  res.json({ ok: true })
}))

r.post('/projects/:id/feedback', h(async (req, res) => {
  const userId = uid(req)
  const p = ownProject(req)
  if (req.body.content) {
    run("INSERT INTO project_feedback (project_id, source, content) VALUES (?, 'user', ?)", p.id, str(req.body.content, { max: 5000 }))
    return res.status(201).json({ ok: true })
  }
  consumeDaily(userId, 'ai_messages')
  const text = await projectFeedback(userId, p, all('SELECT * FROM project_tasks WHERE project_id = ? ORDER BY position', p.id))
  run("INSERT INTO project_feedback (project_id, source, content) VALUES (?, 'junis', ?)", p.id, text)
  res.status(201).json({ ok: true })
}))

r.post('/projects/:id/complete', h(async (req, res) => {
  const userId = uid(req)
  const p = ownProject(req)
  if (p.status === 'completed') throw badRequest('Dieses Projekt ist bereits abgeschlossen.')
  if (p.mission_id) throw badRequest('Dieses Projekt gehört zu einer Mission. Schließe es über die Mission ab.')
  const result = str(req.body.result, { required: true, max: 5000, field: 'Ergebnisbeschreibung' })
  const skills = all('SELECT skill_id FROM project_skills WHERE project_id = ?', p.id).map((s) => s.skill_id)
  if (!skills.length) throw badRequest('Ordne dem Projekt mindestens einen Skill zu, damit es als Nachweis zählt.')
  tx(() => {
    run("UPDATE projects SET status = 'completed', result = ?, result_url = ?, completed_at = ? WHERE id = ?", result, str(req.body.resultUrl, { max: 500 }), nowIso(), p.id)
    E.applyAppliedWork(userId, skills, { type: 'project', refId: p.id, title: `Projekt: ${p.title}` })
    E.logActivity(userId, 'project_completed', p.title, { refId: p.id })
    E.notify(userId, 'project', `Du hast dein Projekt „${p.title}“ abgeschlossen.`, { link: `/projects/${p.id}`, dedupeKey: `project:${p.id}` })
  })
  res.json({ ok: true, next: E.recommendedMissions(userId)[0] || null })
}))

r.post('/projects/:id/archive', h(async (req, res) => {
  const p = ownProject(req)
  run("UPDATE projects SET status = CASE WHEN status = 'archived' THEN 'active' ELSE 'archived' END WHERE id = ?", p.id)
  res.json({ ok: true })
}))

r.delete('/projects/:id', h(async (req, res) => {
  const p = ownProject(req)
  run('DELETE FROM projects WHERE id = ?', p.id)
  res.json({ ok: true })
}))

// ---------------- Portfolio ----------------

r.get('/portfolio', h(async (req, res) => {
  const userId = uid(req)
  requireFeature(userId, 'portfolio', FEATURE_LABELS.portfolio)
  const skills = E.userSkills(userId).filter((s) => s.evidenceCount > 0).sort((a, b) => b.level - a.level)
  res.json({
    name: req.user.name,
    skills: skills.map((s) => ({ ...s, evidence: E.evidenceFor(userId, s.id) })),
    projects: all("SELECT id, title, objective, result, result_url, completed_at, mission_id FROM projects WHERE user_id = ? AND status = 'completed' ORDER BY completed_at DESC", userId)
      .map((p) => ({ ...p, skills: all('SELECT skill_id FROM project_skills WHERE project_id = ?', p.id).map((s) => E.skillInfo(userId, s.skill_id)?.name) })),
    tests: all('SELECT id, skill_id, kind, difficulty, score, completed_at FROM practice_sessions WHERE user_id = ? AND completed_at IS NOT NULL AND score >= 0.8 AND difficulty >= 3 ORDER BY completed_at DESC LIMIT 30', userId)
      .map((t) => ({ ...t, skillName: E.skillInfo(userId, t.skill_id)?.name })),
    feedback: all("SELECT f.content, f.created_at, p.title FROM project_feedback f JOIN projects p ON p.id = f.project_id WHERE p.user_id = ? AND f.source = 'junis' ORDER BY f.created_at DESC LIMIT 5", userId),
    timeline: all("SELECT type, title, created_at FROM activity WHERE user_id = ? AND type IN ('project_completed', 'mission_completed', 'goal_completed', 'milestone') ORDER BY created_at DESC LIMIT 30", userId),
  })
}))

export default r
