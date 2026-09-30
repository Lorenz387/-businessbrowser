import { Router } from 'express'
import { one, all, run, parseJSON } from '../../db.js'
import { h, str, int, oneOf, badRequest, notFound } from '../../lib/http.js'
import { runScan, isRunning } from './service.js'
import { RULES, IMPACT_LABEL } from './rules.js'

const r = Router()
const uid = (req) => req.user.id

function ownSite(req, id = req.params.id) {
  const s = one('SELECT * FROM a11y_sites WHERE id = ? AND user_id = ?', Number(id), uid(req))
  if (!s) throw notFound('Diese Website existiert nicht.')
  return s
}
const scanOut = (s) => ({ ...s, pages: parseJSON(s.pages, []), counts: parseJSON(s.counts, {}) })

r.get('/apps/a11y/sites', h(async (req, res) => {
  const sites = all('SELECT * FROM a11y_sites WHERE user_id = ? ORDER BY created_at DESC', uid(req)).map((s) => {
    const last = one("SELECT * FROM a11y_scans WHERE site_id = ? ORDER BY id DESC LIMIT 1", s.id)
    return { ...s, running: isRunning(s.id), lastScan: last ? scanOut(last) : null }
  })
  res.json({ sites, rules: RULES, impactLabels: IMPACT_LABEL })
}))

r.post('/apps/a11y/sites', h(async (req, res) => {
  let url = str(req.body.url, { required: true, max: 500, field: 'Adresse' })
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  try { url = new URL(url).toString() } catch { throw badRequest('Bitte gib eine gültige Web-Adresse ein.') }
  const name = str(req.body.name, { max: 100 }) || new URL(url).hostname
  const id = Number(run('INSERT INTO a11y_sites (user_id, name, url, max_pages, schedule) VALUES (?, ?, ?, ?, ?)', uid(req), name, url,
    int(req.body.maxPages, { min: 1, max: 25, fallback: 10 }), oneOf(req.body.schedule, ['off', 'daily', 'weekly'], { fallback: 'weekly' })).lastInsertRowid)
  runScan(id) // first scan starts immediately in the background
  res.status(201).json({ id })
}))

r.patch('/apps/a11y/sites/:id', h(async (req, res) => {
  const s = ownSite(req)
  run('UPDATE a11y_sites SET name = ?, max_pages = ?, schedule = ? WHERE id = ?', str(req.body.name, { max: 100 }) ?? s.name,
    int(req.body.maxPages, { min: 1, max: 25, fallback: s.max_pages }), oneOf(req.body.schedule, ['off', 'daily', 'weekly'], { fallback: s.schedule }), s.id)
  res.json({ ok: true })
}))

r.delete('/apps/a11y/sites/:id', h(async (req, res) => {
  const s = ownSite(req)
  run('DELETE FROM a11y_sites WHERE id = ?', s.id)
  res.json({ ok: true })
}))

r.post('/apps/a11y/sites/:id/scan', h(async (req, res) => {
  const s = ownSite(req)
  if (isRunning(s.id)) throw badRequest('Für diese Website läuft bereits ein Scan.')
  const wait = req.body.wait === true
  const p = runScan(s.id)
  if (wait) await p
  res.status(202).json({ ok: true })
}))

r.get('/apps/a11y/sites/:id', h(async (req, res) => {
  const s = ownSite(req)
  res.json({ ...s, running: isRunning(s.id), scans: all('SELECT * FROM a11y_scans WHERE site_id = ? ORDER BY id DESC LIMIT 30', s.id).map(scanOut) })
}))

function ownScan(req) {
  const sc = one('SELECT sc.*, s.user_id, s.name AS site_name, s.url AS site_url, s.id AS sid FROM a11y_scans sc JOIN a11y_sites s ON s.id = sc.site_id WHERE sc.id = ? AND s.user_id = ?', Number(req.params.scanId), uid(req))
  if (!sc) throw notFound('Dieser Scan existiert nicht.')
  return sc
}

r.get('/apps/a11y/scans/:scanId', h(async (req, res) => {
  const sc = ownScan(req)
  const issues = all('SELECT * FROM a11y_issues WHERE scan_id = ? ORDER BY CASE impact WHEN \'critical\' THEN 0 WHEN \'serious\' THEN 1 WHEN \'moderate\' THEN 2 ELSE 3 END, rule, page_url', sc.id)
  const prev = one("SELECT id FROM a11y_scans WHERE site_id = ? AND status = 'done' AND id < ? ORDER BY id DESC LIMIT 1", sc.site_id, sc.id)
  let diff = null
  if (prev) {
    const key = (i) => `${i.page_url}|${i.rule}|${i.selector}`
    const before = new Set(all('SELECT page_url, rule, selector FROM a11y_issues WHERE scan_id = ?', prev.id).map(key))
    const now = new Set(issues.map(key))
    diff = { newCount: [...now].filter((k) => !before.has(k)).length, fixedCount: [...before].filter((k) => !now.has(k)).length }
  }
  res.json({ ...scanOut(sc), siteId: sc.sid, siteName: sc.site_name, siteUrl: sc.site_url, issues, diff, impactLabels: IMPACT_LABEL })
}))

r.get('/apps/a11y/scans/:scanId/export.csv', h(async (req, res) => {
  const sc = ownScan(req)
  const rows = all('SELECT page_url, impact, wcag, title, message, selector, snippet, fix FROM a11y_issues WHERE scan_id = ?', sc.id)
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = ['Seite;Schwere;WCAG;Problem;Beschreibung;Selektor;Code;Korrektur', ...rows.map((r2) => [r2.page_url, IMPACT_LABEL[r2.impact], r2.wcag, r2.title, r2.message, r2.selector, r2.snippet, r2.fix].map(esc).join(';'))].join('\r\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="barrierefreiheit-${sc.id}.csv"`)
  res.send(`﻿${csv}`)
}))

export default r
