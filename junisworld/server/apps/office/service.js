// Büro-Assistent: Aufgaben & Wiedervorlagen, Posteingang (Dokumente mit KI-Einordnung), Briefvorlagen.
import { db, one, all, run, parseJSON } from '../../db.js'
import { notify } from '../../lib/engine.js'
import { addOrgColumn, ORG_WRITE_ROLES, orgRole } from '../../lib/workspace.js'

db.exec(`
CREATE TABLE IF NOT EXISTS office_tasks (
  id INTEGER PRIMARY KEY,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  owner_private INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  due_date TEXT,
  kind TEXT NOT NULL DEFAULT 'task',
  inbox_id INTEGER,
  done_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS office_inbox (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  owner_private INTEGER REFERENCES users(id) ON DELETE CASCADE,
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  sender TEXT,
  category TEXT NOT NULL DEFAULT 'sonstiges',
  summary TEXT,
  reference TEXT,
  deadline TEXT,
  amount REAL,
  status TEXT NOT NULL DEFAULT 'new',
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  extraction TEXT,
  contract_id INTEGER,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS office_templates (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  owner_private INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS office_reminders (
  task_id INTEGER NOT NULL REFERENCES office_tasks(id) ON DELETE CASCADE,
  due_date TEXT NOT NULL,
  kind TEXT NOT NULL,
  PRIMARY KEY (task_id, due_date, kind)
);
`)
for (const t of ['office_tasks', 'office_inbox', 'office_templates']) addOrgColumn(t)

export const TASK_STATUS = { open: 'Offen', in_progress: 'In Arbeit', waiting: 'Wartet', done: 'Erledigt' }
export const PRIORITY = { high: 'Hoch', normal: 'Normal', low: 'Niedrig' }
export const KIND = { task: 'Aufgabe', followup: 'Wiedervorlage' }
export const CATEGORIES = { rechnung: 'Rechnung', mahnung: 'Mahnung', vertrag: 'Vertrag', angebot: 'Angebot', behoerde: 'Behörde / Amt', bewerbung: 'Bewerbung', kunde: 'Kundenanfrage', bank: 'Bank / Versicherung', sonstiges: 'Sonstiges' }
export const INBOX_STATUS = { new: 'Neu', assigned: 'Zugewiesen', done: 'Erledigt', archived: 'Archiviert' }

/**
 * Scope for office records. Private: owner_private = user. Company: org_id.
 * (The creator column alone can't define privacy because company records survive a person's account.)
 */
export const officeWhere = (sc, alias = '') => (sc.type === 'org' ? [`${alias}org_id = ?`, [sc.orgId]] : [`${alias}owner_private = ? AND ${alias}org_id IS NULL`, [sc.userId]])

export const todayUtc = () => new Date().toISOString().slice(0, 10)
export const addDays = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) }

const nameOf = (id) => (id ? one('SELECT name FROM users WHERE id = ?', id)?.name ?? null : null)

export function taskOut(t, today = todayUtc()) {
  const overdue = t.status !== 'done' && t.due_date && t.due_date < today
  return { ...t, assignee_name: nameOf(t.assignee_id), creator_name: nameOf(t.created_by), overdue, dueToday: t.status !== 'done' && t.due_date === today }
}

export function inboxOut(i) {
  return { ...i, extraction: parseJSON(i.extraction, null), assignee_name: nameOf(i.assignee_id), categoryLabel: CATEGORIES[i.category] || i.category }
}

/** May this person change the record? Private: always. Company: managers, the creator, or the assignee. */
export function canEdit(sc, rec, creatorCol = 'created_by') {
  if (sc.type === 'private') return true
  return ORG_WRITE_ROLES.includes(sc.role) || rec[creatorCol] === sc.userId || rec.assignee_id === sc.userId
}

/** People who can be assigned: the person (private) or members of the company. */
export function assignees(sc) {
  if (sc.type === 'private') return [{ id: sc.userId, name: nameOf(sc.userId) }]
  return all('SELECT u.id, u.name FROM org_members m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? ORDER BY u.name', sc.orgId)
}

export function assertAssignee(sc, userId) {
  if (userId == null) return null
  const ok = sc.type === 'private' ? userId === sc.userId : !!orgRole(sc.orgId, userId)
  return ok ? userId : null
}

const taskLink = (t) => `/apps/office?tab=tasks&task=${t.id}${t.org_id ? `&ws=org:${t.org_id}` : ''}`

export function notifyAssignment(t, byUserId) {
  if (!t.assignee_id || t.assignee_id === byUserId) return
  notify(t.assignee_id, 'office', `${nameOf(byUserId) || 'Jemand'} hat dir eine ${KIND[t.kind] || 'Aufgabe'} zugewiesen: „${t.title}“${t.due_date ? ` (fällig ${fmt(t.due_date)})` : ''}.`, { link: taskLink(t), dedupeKey: `office-assign:${t.id}:${t.assignee_id}` })
}

export const fmt = (d) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('de-DE', { timeZone: 'UTC' }) : '')

/** Hourly job: remind about tasks and follow-ups that are due today or overdue (once per due date). */
export function sendTaskReminders(today = todayUtc()) {
  let sent = 0
  for (const t of all("SELECT * FROM office_tasks WHERE status != 'done' AND due_date IS NOT NULL AND due_date <= ?", today)) {
    const kind = t.due_date < today ? 'overdue' : 'due'
    if (one('SELECT 1 FROM office_reminders WHERE task_id = ? AND due_date = ? AND kind = ?', t.id, t.due_date, kind)) continue
    run('INSERT INTO office_reminders (task_id, due_date, kind) VALUES (?, ?, ?)', t.id, t.due_date, kind)
    const to = t.assignee_id || t.created_by || t.owner_private
    if (!to) continue
    const what = t.kind === 'followup' ? 'Wiedervorlage' : 'Aufgabe'
    notify(to, 'office', kind === 'due' ? `${what} heute fällig: „${t.title}“` : `${what} überfällig seit ${fmt(t.due_date)}: „${t.title}“`, { link: taskLink(t), dedupeKey: `office-due:${t.id}:${t.due_date}:${kind}` })
    sent++
  }
  return sent
}

// ---------- Briefvorlagen (Startvorlagen, DIN-5008-orientiert) ----------
export const BUILTIN_TEMPLATES = [
  {
    key: 'zahlungserinnerung', name: 'Zahlungserinnerung', subject: 'Zahlungserinnerung — Rechnung {{rechnungsnummer}} vom {{rechnungsdatum}}',
    body: 'Sehr geehrte Damen und Herren,\n\nsicher ist es im Tagesgeschäft untergegangen: Für unsere Rechnung Nr. {{rechnungsnummer}} vom {{rechnungsdatum}} über {{betrag}} konnten wir noch keinen Zahlungseingang feststellen.\n\nWir bitten Sie, den Betrag bis zum {{frist}} auf das in der Rechnung genannte Konto zu überweisen. Sollte sich Ihre Zahlung mit diesem Schreiben überschnitten haben, betrachten Sie es bitte als gegenstandslos.\n\nMit freundlichen Grüßen',
  },
  {
    key: 'terminbestaetigung', name: 'Terminbestätigung', subject: 'Bestätigung unseres Termins am {{termin}}',
    body: 'Sehr geehrte/r {{anrede_name}},\n\nvielen Dank für Ihre Terminanfrage. Gern bestätigen wir den Termin am {{termin}} in {{ort}}.\n\nSollten Sie verhindert sein, geben Sie uns bitte rechtzeitig Bescheid.\n\nMit freundlichen Grüßen',
  },
  {
    key: 'kuendigung', name: 'Kündigung eines Vertrags', subject: 'Kündigung des Vertrags {{vertragsnummer}}',
    body: 'Sehr geehrte Damen und Herren,\n\nhiermit kündigen wir den oben genannten Vertrag fristgerecht zum {{kuendigungsdatum}}, hilfsweise zum nächstmöglichen Zeitpunkt.\n\nBitte bestätigen Sie uns den Eingang dieser Kündigung sowie das Vertragsende schriftlich.\n\nMit freundlichen Grüßen',
  },
  {
    key: 'angebotsanfrage', name: 'Angebotsanfrage', subject: 'Anfrage: {{leistung}}',
    body: 'Sehr geehrte Damen und Herren,\n\nwir interessieren uns für {{leistung}} und bitten um ein unverbindliches Angebot.\n\nBenötigt werden: {{umfang}}\nGewünschter Zeitraum: {{zeitraum}}\n\nBitte senden Sie uns Ihr Angebot bis zum {{frist}}.\n\nMit freundlichen Grüßen',
  },
  {
    key: 'absage_bewerbung', name: 'Absage auf eine Bewerbung', subject: 'Ihre Bewerbung als {{position}}',
    body: 'Sehr geehrte/r {{anrede_name}},\n\nvielen Dank für Ihre Bewerbung und Ihr Interesse an unserem Unternehmen. Nach sorgfältiger Prüfung haben wir uns für eine andere Person entschieden.\n\nDiese Entscheidung ist keine Bewertung Ihrer Person. Ihre Unterlagen löschen wir entsprechend unserer Datenschutzhinweise.\n\nWir wünschen Ihnen für Ihren weiteren Weg alles Gute.\n\nMit freundlichen Grüßen',
  },
]

export const placeholders = (text) => [...new Set([...String(text).matchAll(/\{\{\s*([a-z0-9_äöüß]+)\s*\}\}/gi)].map((m) => m[1]))]
export const fill = (text, values) => String(text).replace(/\{\{\s*([a-z0-9_äöüß]+)\s*\}\}/gi, (all2, k) => (values[k] != null && values[k] !== '' ? values[k] : all2))
