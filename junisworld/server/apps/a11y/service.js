import { db, one, all, run, parseJSON } from '../../db.js'
import { safeFetch } from '../safeFetch.js'
import { checkHtml, extractLinks, IMPACT_WEIGHT } from './rules.js'
import { notify } from '../../lib/engine.js'

db.exec(`
CREATE TABLE IF NOT EXISTS a11y_sites (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  max_pages INTEGER NOT NULL DEFAULT 10,
  schedule TEXT NOT NULL DEFAULT 'weekly',
  last_scan_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS a11y_scans (
  id INTEGER PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES a11y_sites(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  pages TEXT NOT NULL DEFAULT '[]',
  score INTEGER,
  counts TEXT NOT NULL DEFAULT '{}',
  error TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);
CREATE TABLE IF NOT EXISTS a11y_issues (
  id INTEGER PRIMARY KEY,
  scan_id INTEGER NOT NULL REFERENCES a11y_scans(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  rule TEXT NOT NULL,
  impact TEXT NOT NULL,
  wcag TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  selector TEXT,
  snippet TEXT,
  fix TEXT,
  help TEXT
);
CREATE INDEX IF NOT EXISTS a11y_issues_scan ON a11y_issues(scan_id);
`)

const running = new Set()

/** Score 0–100: 100 minus the average weighted findings per page (a heuristic, not a conformance level). */
export function scoreFor(findings, pageCount) {
  const weight = findings.reduce((a, f) => a + (IMPACT_WEIGHT[f.impact] || 1), 0)
  return Math.max(0, Math.round(100 - weight / Math.max(1, pageCount)))
}

export async function runScan(siteId) {
  const site = one('SELECT * FROM a11y_sites WHERE id = ?', siteId)
  if (!site || running.has(siteId)) return null
  running.add(siteId)
  const scanId = Number(run('INSERT INTO a11y_scans (site_id) VALUES (?)', siteId).lastInsertRowid)
  const prevScan = one("SELECT * FROM a11y_scans WHERE site_id = ? AND status = 'done' AND id < ? ORDER BY id DESC LIMIT 1", siteId, scanId)
  try {
    const queue = [site.url]
    const seen = new Set()
    const pages = []
    const findings = []
    while (queue.length && pages.length < site.max_pages) {
      const url = queue.shift()
      if (seen.has(url)) continue
      seen.add(url)
      let page
      try {
        page = await safeFetch(url)
      } catch (e) {
        if (!pages.length) throw e
        pages.push({ url, status: 0, error: e.message })
        continue
      }
      seen.add(page.url)
      if (!page.contentType.includes('html')) continue
      const pf = checkHtml(page.body)
      pages.push({ url: page.url, status: page.status, issues: pf.length })
      for (const f of pf) findings.push({ ...f, page: page.url })
      for (const l of extractLinks(page.body, page.url)) if (!seen.has(l) && !queue.includes(l)) queue.push(l)
    }
    const counts = findings.reduce((a, f) => ({ ...a, [f.impact]: (a[f.impact] || 0) + 1 }), {})
    const okPages = pages.filter((p) => !p.error).length
    const score = scoreFor(findings, okPages)
    const ins = db.prepare('INSERT INTO a11y_issues (scan_id, page_url, rule, impact, wcag, title, message, selector, snippet, fix, help) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    db.exec('BEGIN')
    for (const f of findings) ins.run(scanId, f.page, f.rule, f.impact, f.wcag, f.title, f.message, f.selector, f.snippet, f.fix, f.help)
    run("UPDATE a11y_scans SET status = 'done', pages = ?, score = ?, counts = ?, finished_at = datetime('now') WHERE id = ?", JSON.stringify(pages), score, JSON.stringify(counts), scanId)
    run("UPDATE a11y_sites SET last_scan_at = datetime('now') WHERE id = ?", siteId)
    db.exec('COMMIT')
    const prevCritical = prevScan ? parseJSON(prevScan.counts, {}).critical || 0 : null
    if (prevCritical !== null && (counts.critical || 0) > prevCritical) {
      notify(site.user_id, 'a11y', `Barrierefreiheit: ${counts.critical - prevCritical} neue kritische Barriere(n) auf ${site.name}.`, { link: `/apps/accessibility/scans/${scanId}`, dedupeKey: `a11y:${scanId}` })
    }
    return scanId
  } catch (e) {
    try { db.exec('ROLLBACK') } catch { /* no open tx */ }
    run("UPDATE a11y_scans SET status = 'failed', error = ?, finished_at = datetime('now') WHERE id = ?", e.message, scanId)
    run("UPDATE a11y_sites SET last_scan_at = datetime('now') WHERE id = ?", siteId)
    return scanId
  } finally {
    running.delete(siteId)
  }
}

export const isRunning = (siteId) => running.has(siteId)

/** Called by the scheduler: rescan sites whose schedule is due. */
export async function runDueScans() {
  const due = all(`SELECT id FROM a11y_sites WHERE schedule != 'off' AND (last_scan_at IS NULL
    OR (schedule = 'daily' AND last_scan_at <= datetime('now', '-1 day'))
    OR (schedule = 'weekly' AND last_scan_at <= datetime('now', '-7 days')))`)
  for (const s of due) await runScan(s.id)
}
