const toDate = (v) => (v ? new Date(/Z$|[+-]\d\d:\d\d$/.test(v) ? v : `${v.replace(' ', 'T')}Z`) : null)

export function formatDate(v, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  const d = toDate(v)
  return d ? d.toLocaleDateString('de-DE', opts) : '–'
}

export function formatDateTime(v) {
  const d = toDate(v)
  return d ? d.toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–'
}

export function relative(v) {
  const d = toDate(v)
  if (!d) return '–'
  const diff = (Date.now() - d.getTime()) / 1000
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat('de', { numeric: 'auto' })
  if (abs < 60) return 'gerade eben'
  if (abs < 3600) return rtf.format(-Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(-Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(-Math.round(diff / 86400), 'day')
  return formatDate(v)
}

export const euro = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

export function greeting() {
  const h = new Date().getHours()
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export const PRIORITY_LABELS = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' }
export const GOAL_STATUS = { active: 'Aktiv', paused: 'Pausiert', completed: 'Erreicht', archived: 'Archiviert' }
export const PROJECT_STATUS = { active: 'Aktiv', completed: 'Abgeschlossen', archived: 'Archiviert' }
export const EVIDENCE_LABELS = { test: 'Test', project: 'Projekt', mission: 'Mission', challenge: 'Challenge', task: 'Aufgabe', interview: 'Interview', expert: 'Expertenbewertung' }
export const LEARNING_STYLES = { reading: 'Lesen & Erklärungen', examples: 'Beispiele', practice: 'Üben & Ausprobieren', visual: 'Visuell', mixed: 'Gemischt' }
export const PRACTICE_KINDS = {
  quiz: 'Gemischtes Quiz',
  mc: 'Multiple Choice',
  open: 'Offene Fragen',
  numeric: 'Rechenaufgaben',
  code: 'Coding Challenge',
  order: 'Reihenfolge-Aufgaben',
  case: 'Fallstudie',
  exam: 'Prüfungssimulation',
  review: 'Wiederholung',
}
export const DECISION_TEXT = {
  harder: 'Das lief sehr gut. Die nächste Übung wird eine Stufe anspruchsvoller.',
  compress: 'Du verstehst das schnell. Junis komprimiert die nächsten Inhalte und erhöht die Schwierigkeit.',
  reexplain: 'Hier gibt es noch Lücken. Junis erklärt das Konzept erneut aus einem anderen Blickwinkel und senkt die Schwierigkeit.',
  simplify: 'Das hat länger gedauert. Die nächste Erklärung wird einfacher und kleinschrittiger.',
  keep: 'Die Schwierigkeit bleibt gleich — festige diesen Stand mit einer weiteren Übung.',
}
