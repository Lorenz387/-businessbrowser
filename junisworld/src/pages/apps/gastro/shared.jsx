import { createContext, useContext } from 'react'
import { euro } from '../../../lib/format.js'

export const GastroCtx = createContext(null)
export const useGastro = () => useContext(GastroCtx)

export const eur = (n) => (n == null ? '–' : euro(n))
export const pct = (n) => (n == null ? '–' : `${n.toLocaleString('de-DE')} %`)
export const dayLabel = (d, opts = { weekday: 'short', day: '2-digit', month: '2-digit' }) => new Date(`${d}T12:00:00Z`).toLocaleDateString('de-DE', { timeZone: 'UTC', ...opts })
export const addDays = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) }
export const mondayOf = (d) => { const x = new Date(`${d}T12:00:00Z`); const wd = (x.getUTCDay() + 6) % 7; return addDays(d, -wd) }
export const parseNum = (v) => (v === '' || v == null ? '' : String(v).replace(',', '.'))

export const ROLE_LABEL = { owner: 'Inhaber/in', manager: 'Betriebsleitung', kitchen: 'Küche', service: 'Service' }
export const EMP_ROLE = { kitchen: 'Küche', service: 'Service', manager: 'Leitung', other: 'Sonstiges' }
export const TABLE_STATUS = { free: ['ok', 'Frei'], reserved: ['accent', 'Reserviert'], occupied: ['warn', 'Besetzt'], cleaning: ['neutral', 'Reinigung'] }
export const NEXT_STATUS = { free: 'reserved', reserved: 'occupied', occupied: 'cleaning', cleaning: 'free' }
export const RES_TONE = { confirmed: 'accent', seated: 'warn', completed: 'ok', cancelled: 'neutral', no_show: 'bad' }
export const WEEKDAYS = [[1, 'Mo'], [2, 'Di'], [3, 'Mi'], [4, 'Do'], [5, 'Fr'], [6, 'Sa'], [0, 'So']]

/** Food-cost tone: ≤ 30 % gut, ≤ 35 % beobachten, darüber prüfen (übliche Orientierungswerte, betriebsabhängig). */
export const costTone = (p) => (p == null ? 'neutral' : p <= 30 ? 'ok' : p <= 35 ? 'warn' : 'bad')

/** Print a Markdown/Text result in a clean window (→ „Als PDF speichern“ im Druckdialog). */
export function printText(title, html) {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title>
<style>body{font:15px/1.6 system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#111}h1{font-size:22px}h2{font-size:18px;margin-top:24px}h3{font-size:16px}ul,ol{padding-left:22px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}</style></head>
<body><h1>${title.replace(/</g, '&lt;')}</h1>${html}</body></html>`)
  w.document.close()
  w.focus()
  w.print()
  return true
}
