// Contract lifecycle: deadline calculation, reminders (in-app, Slack webhook) and AI extraction.
import { db, one, all, run, parseJSON } from '../../db.js'
import { recipientsFor, addOrgColumn } from '../../lib/workspace.js'
import { seal, unseal, isSealed } from '../../lib/secrets.js'
import { notify } from '../../lib/engine.js'

db.exec(`
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  counterparty TEXT,
  category TEXT NOT NULL DEFAULT 'sonstiges',
  start_date TEXT,
  term_end TEXT,
  notice_value INTEGER,
  notice_unit TEXT NOT NULL DEFAULT 'months',
  auto_renew INTEGER NOT NULL DEFAULT 1,
  renewal_months INTEGER NOT NULL DEFAULT 12,
  cost_amount REAL,
  cost_interval TEXT NOT NULL DEFAULT 'monthly',
  owner TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  extraction TEXT,
  reminder_days TEXT NOT NULL DEFAULT '[90,30,7]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS contract_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  slack_webhook TEXT
);
CREATE TABLE IF NOT EXISTS contract_reminders (
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  deadline TEXT NOT NULL,
  days_before INTEGER NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (contract_id, deadline, days_before)
);
`)
addOrgColumn('contracts')
for (const x of all('SELECT user_id, slack_webhook FROM contract_settings WHERE slack_webhook IS NOT NULL')) {
  if (!isSealed(x.slack_webhook)) run('UPDATE contract_settings SET slack_webhook = ? WHERE user_id = ?', seal(x.slack_webhook), x.user_id)
}

export const CATEGORIES = { miete: 'Miete & Immobilien', software: 'Software & Lizenzen', leasing: 'Leasing', versicherung: 'Versicherung', telekom: 'Telekommunikation', energie: 'Energie', dienstleistung: 'Dienstleistung', sonstiges: 'Sonstiges' }

const d = (s) => (s ? new Date(`${s}T00:00:00Z`) : null)
const iso = (dt) => dt.toISOString().slice(0, 10)
function addMonths(dt, m) {
  const x = new Date(dt)
  const day = x.getUTCDate()
  x.setUTCDate(1)
  x.setUTCMonth(x.getUTCMonth() + m)
  const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate()
  x.setUTCDate(Math.min(day, last))
  return x
}
const todayUtc = () => d(new Date().toISOString().slice(0, 10))

/**
 * Compute the current term end (rolling forward automatic renewals) and the last day to cancel.
 * Returns nulls when data is missing — never guesses.
 */
export function deadlines(c, today = todayUtc()) {
  let termEnd = d(c.term_end)
  if (!termEnd) return { termEnd: null, cancelBy: null, daysLeft: null, rolled: 0 }
  let rolled = 0
  const noticeOf = (end) => {
    if (c.notice_value == null) return null
    let x
    if (c.notice_unit === 'days') x = new Date(end.getTime() - c.notice_value * 864e5)
    else if (c.notice_unit === 'weeks') x = new Date(end.getTime() - c.notice_value * 7 * 864e5)
    else x = addMonths(end, -c.notice_value)
    return x
  }
  while (c.auto_renew && c.renewal_months > 0 && (noticeOf(termEnd) ?? termEnd) < today && rolled < 600) {
    termEnd = addMonths(termEnd, c.renewal_months)
    rolled++
  }
  const cancelBy = noticeOf(termEnd)
  const ref = cancelBy ?? termEnd
  return { termEnd: iso(termEnd), cancelBy: cancelBy ? iso(cancelBy) : null, daysLeft: Math.round((ref - today) / 864e5), rolled }
}

export function annualCost(c) {
  if (c.cost_amount == null) return null
  return { monthly: 12, quarterly: 4, yearly: 1, once: 0 }[c.cost_interval] * c.cost_amount
}

export function contractOut(c) {
  const dl = deadlines(c)
  let urgency = 'none'
  if (c.status !== 'active') urgency = 'inactive'
  else if (dl.daysLeft == null) urgency = 'incomplete'
  else if (dl.daysLeft < 0) urgency = 'missed'
  else if (dl.daysLeft <= 30) urgency = 'urgent'
  else if (dl.daysLeft <= 90) urgency = 'soon'
  return { ...c, reminder_days: parseJSON(c.reminder_days, []), extraction: parseJSON(c.extraction, null), ...dl, annualCost: annualCost(c), urgency, categoryLabel: CATEGORIES[c.category] ?? c.category }
}

async function postSlack(webhook, text) {
  try {
    const res = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(10000) })
    return res.ok
  } catch {
    return false
  }
}

export const fmtDate = (s) => (s ? new Date(`${s}T00:00:00Z`).toLocaleDateString('de-DE', { timeZone: 'UTC' }) : '–')

/** Daily job: send reminders at the configured offsets before each cancellation deadline (once per offset). */
export async function sendDueReminders(today = todayUtc()) {
  let sent = 0
  for (const c of all("SELECT * FROM contracts WHERE status = 'active'")) {
    const dl = deadlines(c, today)
    if (!dl.cancelBy || dl.daysLeft < 0) continue
    const offsets = parseJSON(c.reminder_days, []).filter((x) => dl.daysLeft <= x).sort((a, b) => a - b)
    if (!offsets.length) continue
    const offset = offsets[0]
    if (one('SELECT 1 FROM contract_reminders WHERE contract_id = ? AND deadline = ? AND days_before = ?', c.id, dl.cancelBy, offset)) continue
    run('INSERT INTO contract_reminders (contract_id, deadline, days_before) VALUES (?, ?, ?)', c.id, dl.cancelBy, offset)
    const cost = annualCost(c)
    const text = `Kündigungsfrist: „${c.title}“${c.counterparty ? ` (${c.counterparty})` : ''} muss bis ${fmtDate(dl.cancelBy)} gekündigt werden — noch ${dl.daysLeft} Tage.${c.auto_renew ? ` Sonst Verlängerung um ${c.renewal_months} Monate${cost ? ` (ca. ${cost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} pro Jahr)` : ''}.` : ''}`
    const recipients = recipientsFor(c)
    const hooks = new Set()
    for (const userId of recipients) {
      notify(userId, 'contract', c.org_id ? `[Firma] ${text}` : text, { link: `/apps/contracts/${c.id}${c.org_id ? `?ws=org:${c.org_id}` : ''}`, dedupeKey: `contract:${c.id}:${dl.cancelBy}:${offset}` })
      const settings = one('SELECT slack_webhook FROM contract_settings WHERE user_id = ?', userId)
      if (settings?.slack_webhook) hooks.add(unseal(settings.slack_webhook))
    }
    for (const hook of hooks) await postSlack(hook, text)
    sent++
  }
  return sent
}

/** iCalendar feed of cancellation deadlines. */
export function icsFor(where, params) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JunisWorld//Fristen//DE', 'CALSCALE:GREGORIAN']
  const esc = (s) => String(s).replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n')
  for (const c of all(`SELECT * FROM contracts WHERE ${where} AND status = 'active'`, ...params)) {
    const dl = deadlines(c)
    if (!dl.cancelBy) continue
    const day = dl.cancelBy.replace(/-/g, '')
    lines.push('BEGIN:VEVENT', `UID:contract-${c.id}-${day}@junisworld`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART;VALUE=DATE:${day}`, `SUMMARY:${esc(`Kündigungsfrist: ${c.title}`)}`, `DESCRIPTION:${esc(`${c.counterparty || ''} — Laufzeitende ${fmtDate(dl.termEnd)}`)}`,
      'BEGIN:VALARM', 'TRIGGER:-P14D', 'ACTION:DISPLAY', `DESCRIPTION:${esc(c.title)}`, 'END:VALARM', 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
