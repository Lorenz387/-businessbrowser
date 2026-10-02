// Öffentlicher Kassen-Webhook: Das POS sendet Belege an /api/gastro/pos/<token>. Kein Login, das Token ist das Geheimnis.
import { Router } from 'express'
import { one, run, tx } from '../../db.js'
import { h, badRequest, notFound } from '../../lib/http.js'

const r = Router()
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/
const money = (v, field, required = false) => {
  if (v === undefined || v === null || v === '') {
    if (required) throw badRequest(`${field} fehlt.`)
    return null
  }
  const n = Number(v)
  if (!Number.isFinite(n) || Math.abs(n) > 1e7) throw badRequest(`${field} ist ungültig.`)
  return Math.round(n * 100) / 100
}

r.post('/gastro/pos/:token', h(async (req, res) => {
  const restaurant = /^[a-f0-9]{48}$/.test(req.params.token) ? one('SELECT id FROM gastro_restaurants WHERE pos_token = ?', req.params.token) : null
  if (!restaurant) throw notFound('Unbekannter Webhook.')
  const list = Array.isArray(req.body?.receipts) ? req.body.receipts : [req.body]
  if (!list.length || list.length > 500) throw badRequest('Zwischen 1 und 500 Belege pro Aufruf senden.')
  const rows = list.map((x, i) => {
    const externalId = String(x?.externalId ?? '').trim()
    if (!externalId || externalId.length > 120) throw badRequest(`Beleg ${i + 1}: externalId fehlt.`)
    if (!ISO.test(String(x.timestamp || ''))) throw badRequest(`Beleg ${i + 1}: timestamp im ISO-Format (Ortszeit des Restaurants) angeben.`)
    return {
      externalId, ts: x.timestamp, day: x.timestamp.slice(0, 10),
      gross: money(x.gross, `Beleg ${i + 1}: gross`, true), net: money(x.net, `Beleg ${i + 1}: net`), tip: money(x.tip, `Beleg ${i + 1}: tip`) ?? 0,
      payment: x.paymentMethod ? String(x.paymentMethod).slice(0, 40) : null,
    }
  })
  let accepted = 0
  tx(() => {
    for (const x of rows) {
      const result = run("INSERT INTO gastro_receipts (restaurant_id, external_id, ts, day, gross, net, tip, payment, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pos') ON CONFLICT(restaurant_id, external_id) DO NOTHING",
        restaurant.id, x.externalId, x.ts, x.day, x.gross, x.net, x.tip, x.payment)
      accepted += Number(result.changes)
    }
    run("UPDATE gastro_restaurants SET pos_last_sync = datetime('now') WHERE id = ?", restaurant.id)
  })
  res.json({ accepted, duplicates: rows.length - accepted })
}))

export default r
