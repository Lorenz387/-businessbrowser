// Junis Talent: profiles, interviews, projects and explainable matching.
import { db, one, all, run, parseJSON } from '../../db.js'
import { notify, userSkills, skillCatalog } from '../../lib/engine.js'

db.exec(`
CREATE TABLE IF NOT EXISTS talent_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline TEXT,
  summary TEXT,
  location TEXT,
  domains TEXT NOT NULL DEFAULT '[]',
  skills TEXT NOT NULL DEFAULT '[]',
  experience TEXT NOT NULL DEFAULT '[]',
  education TEXT NOT NULL DEFAULT '[]',
  languages TEXT NOT NULL DEFAULT '[]',
  hourly_rate REAL,
  hours_per_week INTEGER,
  availability TEXT NOT NULL DEFAULT 'available',
  interests TEXT NOT NULL DEFAULT '[]',
  in_pool INTEGER NOT NULL DEFAULT 0,
  share_junis_skills INTEGER NOT NULL DEFAULT 1,
  cv_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS talent_interviews (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  turns TEXT NOT NULL DEFAULT '[]',
  plan TEXT NOT NULL DEFAULT '[]',
  next_index INTEGER NOT NULL DEFAULT 0,
  followups INTEGER NOT NULL DEFAULT 0,
  evaluation TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS talent_projects (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'freelance',
  domains TEXT NOT NULL DEFAULT '[]',
  skills TEXT NOT NULL DEFAULT '[]',
  seniority TEXT NOT NULL DEFAULT 'mid',
  languages TEXT NOT NULL DEFAULT '[]',
  rate_min REAL,
  rate_max REAL,
  hours_per_week INTEGER,
  remote INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS talent_applications (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES talent_projects(id) ON DELETE CASCADE,
  talent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  score INTEGER,
  detail TEXT,
  motivation TEXT,
  company_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (project_id, talent_id)
);
`)

export const TYPES = { expert_ai_training: 'KI-Training (Experten)', freelance: 'Freelance-Projekt', employment: 'Festanstellung' }
export const SENIORITY = { junior: 'Junior', mid: 'Erfahren', senior: 'Senior', expert: 'Experte' }
export const MATCH_THRESHOLD = 55

const J = (v, f = []) => parseJSON(v, f)
export function profileOut(p) {
  if (!p) return null
  return { ...p, domains: J(p.domains), skills: J(p.skills), experience: J(p.experience), education: J(p.education), languages: J(p.languages), interests: J(p.interests), in_pool: !!p.in_pool, share_junis_skills: !!p.share_junis_skills }
}
export function projectOut(p) {
  return { ...p, domains: J(p.domains), skills: J(p.skills), languages: J(p.languages), remote: !!p.remote, typeLabel: TYPES[p.type], seniorityLabel: SENIORITY[p.seniority] }
}
export const latestInterview = (userId) => one("SELECT * FROM talent_interviews WHERE user_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1", userId)

// ---------- matching ----------

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}+#. ]/gu, ' ').replace(/\s+/g, ' ').trim()
const tokens = (s) => new Set(norm(s).split(' ').filter((t) => t.length > 1))
export function similar(a, b) {
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return 0
  if (na === nb || na.includes(nb) || nb.includes(na)) return 1
  const ta = tokens(a)
  const tb = tokens(b)
  const inter = [...ta].filter((t) => tb.has(t)).length
  return inter / Math.max(1, Math.min(ta.size, tb.size)) >= 0.5 ? 0.7 : 0
}

/** Skills a talent can show: CV skills, interview-proven skills and (optionally) JunisWorld-verified skills. */
export function talentEvidence(userId, profile) {
  const interview = latestInterview(userId)
  const evaluation = J(interview?.evaluation, null)
  const junis = profile.share_junis_skills
    ? userSkills(userId).filter((s) => s.status === 'verified' || s.status === 'evidenced').map((s) => ({ name: s.name, level: s.level, verified: s.status === 'verified' }))
    : []
  return { cv: profile.skills, interview: evaluation?.skills || [], junis, evaluation }
}

/** Explainable match score 0–100 with its components. */
export function matchScore(project, userId, profile) {
  const ev = talentEvidence(userId, profile)
  const req = project.skills.length ? project.skills : project.domains.map((d) => ({ name: d, importance: 'must' }))
  let got = 0
  let total = 0
  const skillHits = []
  for (const r of req) {
    const w = r.importance === 'must' ? 2 : 1
    total += w
    const verified = ev.junis.find((s) => s.verified && similar(s.name, r.name))
    const inInterview = ev.interview.find((s) => similar(s.name, r.name))
    const inCv = ev.cv.find((s) => similar(s.name, r.name)) || ev.junis.find((s) => similar(s.name, r.name))
    const value = verified ? 1 : inInterview ? 0.9 : inCv ? 0.6 : 0
    got += w * value
    skillHits.push({ skill: r.name, importance: r.importance, source: verified ? 'verified' : inInterview ? 'interview' : inCv ? 'cv' : null })
  }
  const skillScore = total ? got / total : 0
  const domainScore = project.domains.length ? (project.domains.some((d) => profile.domains.some((x) => similar(x, d))) ? 1 : 0) : 0.5
  const interviewScore = (ev.evaluation?.overall ?? 0) / 100
  const availabilityScore = { available: 1, limited: 0.6, unavailable: 0 }[profile.availability] ?? 0.5
  let rateScore = 0.7
  if (profile.hourly_rate != null && project.rate_max != null) rateScore = profile.hourly_rate <= project.rate_max ? 1 : profile.hourly_rate <= project.rate_max * 1.2 ? 0.5 : 0
  const mustMissing = skillHits.filter((h) => h.importance === 'must' && !h.source).length
  let score = Math.round(100 * (0.45 * skillScore + 0.25 * interviewScore + 0.15 * domainScore + 0.1 * availabilityScore + 0.05 * rateScore))
  if (mustMissing) score = Math.min(score, 70 - 10 * (mustMissing - 1))
  return {
    score: Math.max(0, score),
    detail: {
      skills: skillHits,
      components: { skills: Math.round(skillScore * 100), interview: Math.round(interviewScore * 100), domain: Math.round(domainScore * 100), availability: Math.round(availabilityScore * 100), rate: Math.round(rateScore * 100) },
      mustMissing,
    },
  }
}

const eligibleTalents = () => all('SELECT * FROM talent_profiles WHERE in_pool = 1').map(profileOut).filter((p) => latestInterview(p.user_id))

function upsertMatch(project, talentId, m) {
  const existing = one('SELECT * FROM talent_applications WHERE project_id = ? AND talent_id = ?', project.id, talentId)
  if (existing) {
    run("UPDATE talent_applications SET score = ?, detail = ?, updated_at = datetime('now') WHERE id = ?", m.score, JSON.stringify(m.detail), existing.id)
    return false
  }
  run("INSERT INTO talent_applications (project_id, talent_id, source, status, score, detail) VALUES (?, ?, 'match', 'matched', ?, ?)", project.id, talentId, m.score, JSON.stringify(m.detail))
  notify(talentId, 'talent', `Neues passendes Projekt: ${project.title} (${project.company}) — Match ${m.score} %.`, { link: '/talent?tab=offers', dedupeKey: `talent-match:${project.id}:${talentId}` })
  return true
}

/** Match one open project against the whole pool. */
export function matchProject(projectRow) {
  const project = projectOut(projectRow)
  if (project.status !== 'open') return 0
  let created = 0
  for (const p of eligibleTalents()) {
    if (p.user_id === project.owner_id) continue
    const m = matchScore(project, p.user_id, p)
    if (m.score >= MATCH_THRESHOLD && upsertMatch(project, p.user_id, m)) created++
  }
  return created
}

/** Match one talent against all open projects (after interview or profile update). */
export function matchTalent(userId) {
  const p = profileOut(one('SELECT * FROM talent_profiles WHERE user_id = ?', userId))
  if (!p?.in_pool || !latestInterview(userId)) return 0
  let created = 0
  for (const row of all("SELECT * FROM talent_projects WHERE status = 'open' AND owner_id != ?", userId)) {
    const project = projectOut(row)
    const m = matchScore(project, userId, p)
    if (m.score >= MATCH_THRESHOLD && upsertMatch(project, userId, m)) created++
  }
  return created
}

/** Demand per domain from real open projects on this platform. */
export function demandByDomain() {
  const counts = new Map()
  for (const p of all("SELECT domains FROM talent_projects WHERE status = 'open'")) for (const d of J(p.domains)) counts.set(d, (counts.get(d) || 0) + 1)
  return [...counts.entries()].map(([domain, open]) => ({ domain, open })).sort((a, b) => b.open - a.open)
}

/** What a company may see about a talent: anonymous until the talent accepted an invitation. */
export function talentCard(app, revealIdentity) {
  const p = profileOut(one('SELECT * FROM talent_profiles WHERE user_id = ?', app.talent_id))
  const ev = talentEvidence(app.talent_id, p)
  const card = {
    applicationId: app.id,
    alias: `Talent #${String(app.talent_id).padStart(4, '0')}`,
    headline: p.headline,
    domains: p.domains,
    skills: p.skills,
    languages: p.languages,
    availability: p.availability,
    hoursPerWeek: p.hours_per_week,
    hourlyRate: p.hourly_rate,
    interview: ev.evaluation ? { overall: ev.evaluation.overall, dimensions: ev.evaluation.dimensions.map(({ name, score }) => ({ name, score })), skills: ev.evaluation.skills } : null,
    verifiedSkills: ev.junis.filter((s) => s.verified).map((s) => s.name),
    status: app.status,
    source: app.source,
    score: app.score,
    detail: J(app.detail, null),
    motivation: app.motivation,
    companyNote: app.company_note,
  }
  if (revealIdentity) {
    const u = one('SELECT name, email FROM users WHERE id = ?', app.talent_id)
    Object.assign(card, { name: u.name, email: u.email, summary: p.summary, experience: p.experience, education: p.education, location: p.location })
  }
  return card
}

/** Compact status for JunisWorld core pages (Home, Career, Skills): stage, open offers and market-based skill gaps. */
export function talentSummary(userId) {
  const profile = profileOut(one('SELECT * FROM talent_profiles WHERE user_id = ?', userId))
  const interview = latestInterview(userId)
  const evaluation = J(interview?.evaluation, null)
  const inProgress = !!one("SELECT id FROM talent_interviews WHERE user_id = ? AND status = 'in_progress'", userId)
  const stage = !profile?.headline || !profile.skills.length ? 'profile' : !interview ? 'interview' : !profile.in_pool ? 'pool' : 'ready'
  const apps = all(`SELECT a.id, a.status, a.score, p.id AS project_id, p.title, p.company FROM talent_applications a JOIN talent_projects p ON p.id = a.project_id
    WHERE a.talent_id = ? AND p.status = 'open' ORDER BY a.score DESC`, userId)
  const offers = apps.filter((a) => ['matched', 'invited'].includes(a.status)).slice(0, 3)

  // Skill gaps: requirements of open projects in the talent's fields that the talent cannot show yet.
  const gaps = new Map()
  if (profile) {
    const rows = all("SELECT * FROM talent_projects WHERE status = 'open' AND owner_id != ? ORDER BY created_at DESC LIMIT 100", userId).map(projectOut)
    const relevant = profile.domains.length ? rows.filter((p) => !p.domains.length || p.domains.some((d) => profile.domains.some((x) => similar(x, d)))) : rows
    for (const p of relevant) {
      for (const h of matchScore(p, userId, profile).detail.skills) {
        if (h.source) continue
        const key = norm(h.skill)
        const g = gaps.get(key) || { name: h.skill, projects: 0, must: 0 }
        g.projects++
        if (h.importance === 'must') g.must++
        gaps.set(key, g)
      }
    }
  }
  const catalog = gaps.size ? skillCatalog(userId) : []
  const skillGaps = [...gaps.values()].sort((a, b) => b.must - a.must || b.projects - a.projects).slice(0, 5)
    .map((g) => ({ ...g, skillId: catalog.find((s) => similar(s.name, g.name))?.id ?? null }))

  const company = one(`SELECT COUNT(*) AS projects,
      (SELECT COUNT(*) FROM talent_applications a JOIN talent_projects p ON p.id = a.project_id WHERE p.owner_id = ? AND p.status = 'open' AND a.status = 'interested') AS interested,
      (SELECT COUNT(*) FROM talent_applications a JOIN talent_projects p ON p.id = a.project_id WHERE p.owner_id = ? AND p.status = 'open' AND a.status = 'accepted') AS accepted
    FROM talent_projects WHERE owner_id = ? AND status = 'open'`, userId, userId, userId)

  return {
    stage,
    inPool: !!profile?.in_pool,
    interview: interview ? { overall: evaluation?.overall ?? null, completedAt: interview.completed_at, weaknesses: evaluation?.weaknesses?.slice(0, 3) || [] } : null,
    interviewInProgress: inProgress,
    invited: apps.filter((a) => a.status === 'invited').length,
    matched: apps.filter((a) => a.status === 'matched').length,
    offers,
    skillGaps,
    company,
  }
}
