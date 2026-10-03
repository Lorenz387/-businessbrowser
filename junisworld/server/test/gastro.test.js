import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'junis-gastro-'))
process.env.JUNIS_DATA_DIR = dir
const { createApp } = await import('../app.js')

let server, base
before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }) })

function client() {
  let cookie = ''
  return async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', cookie }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]
    return { status: res.status, data: await res.json() }
  }
}
const register = async (c, email, name) => c('POST', '/api/auth/register', { email, name, password: 'sehr-sicheres-passwort', acceptTerms: true })

test('GastroFlow: restaurant, roles, reservations, costing, POS webhook, staffing', async () => {
  const owner = client()
  const koch = client()
  const fremd = client()
  await register(owner, 'chefin@example.org', 'Chefin')
  await register(koch, 'koch@example.org', 'Koch')
  await register(fremd, 'fremd@example.org', 'Fremd')

  let r = await owner('POST', '/api/apps/gastro', { name: 'Zur Linde', concept: 'Regionale Küche, 40 Plätze' })
  assert.equal(r.status, 201)
  const R = `/api/apps/gastro/r/${r.data.id}`

  // Strangers cannot see the restaurant.
  r = await fremd('GET', R)
  assert.equal(r.status, 404)

  // Invite the cook with the kitchen role.
  r = await owner('POST', `${R}/team/invite`, { email: 'Koch@example.org', role: 'kitchen' })
  assert.equal(r.data.registered, true)
  r = await koch('GET', '/api/apps/gastro')
  assert.equal(r.data.invites.length, 1)
  await koch('POST', `/api/apps/gastro/invites/${r.data.invites[0].id}/accept`)
  r = await koch('GET', R)
  assert.equal(r.data.role, 'kitchen')
  assert.equal(r.data.permissions.kitchen.write, true)
  assert.equal(r.data.permissions.revenue.read, false)
  r = await koch('GET', `${R}/revenue`)
  assert.equal(r.status, 403, 'kitchen staff cannot see revenue')
  r = await koch('POST', `${R}/team/invite`, { email: 'x@example.org', role: 'owner' })
  assert.equal(r.status, 403)

  // Tables & reservations with conflict detection and auto-assignment.
  r = await owner('POST', `${R}/tables`, { count: 2, seats: 2 })
  r = await owner('POST', `${R}/tables`, { count: 1, seats: 6 })
  assert.equal(r.data.length, 3)
  const [t1, , t6] = r.data
  r = await owner('POST', `${R}/reservations`, { guestName: 'Familie Berger', date: '2026-10-09', time: '19:00', guests: 5, autoAssign: true, saveGuest: true, phone: '0151 123' })
  assert.equal(r.data.table_id, t6.id, 'smallest fitting table')
  assert.ok(r.data.guest_id)
  r = await owner('POST', `${R}/reservations`, { guestName: 'Herr Kurz', date: '2026-10-09', time: '20:00', guests: 2, tableId: t6.id })
  assert.equal(r.status, 409, 'overlapping slot on the same table')
  r = await owner('POST', `${R}/reservations`, { guestName: 'Herr Kurz', date: '2026-10-09', time: '20:00', guests: 6, autoAssign: true })
  assert.equal(r.data.table_id, null)
  assert.match(r.data.warning, /Kein passender/)
  r = await owner('POST', `${R}/reservations`, { guestName: 'Paar Ali', date: '2026-10-09', time: '19:30', guests: 2, autoAssign: true })
  assert.equal(r.data.table_id, t1.id)
  r = await owner('PATCH', `${R}/reservations/${r.data.id}`, { status: 'seated' })
  r = await owner('GET', `${R}/tables`)
  assert.equal(r.data.find((t) => t.id === t1.id).status, 'occupied')

  // Inventory → recipe → dish: food cost on the net price (7 % VAT on food).
  r = await koch('POST', `${R}/inventory`, { name: 'Kartoffeln', unit: 'kg', stock: 10, reorderLevel: 3, unitCost: '1,20' })
  const kart = r.data
  r = await koch('POST', `${R}/inventory`, { name: 'Butter', unit: 'kg', stock: 1, reorderLevel: 2, unitCost: 8 })
  const butter = r.data
  assert.equal(butter.needsReorder, true)
  r = await koch('POST', `${R}/recipes`, { name: 'Kartoffelpüree', portions: 10, items: [{ ingredientId: kart.id, quantity: 2.5 }, { ingredientId: butter.id, quantity: 0.25 }] })
  assert.equal(r.data.total, 5)
  assert.equal(r.data.perPortion, 0.5)
  const recipe = r.data
  r = await koch('POST', `${R}/dishes`, { name: 'Püree mit Ei', category: 'Hauptgerichte', price: '10,70', vat: 7, recipeId: recipe.id, allergens: ['Milch/Laktose', 'Eier', 'Unsinn'] })
  assert.equal(r.data.netPrice, 10)
  assert.equal(r.data.foodCostPct, 5)
  assert.equal(r.data.contribution, 9.5)
  assert.deepEqual(r.data.allergens, ['Milch/Laktose', 'Eier'])
  r = await koch('POST', `${R}/recipes/${recipe.id}/produce`, { portions: 20 })
  assert.equal(r.data.inventory.find((i) => i.id === kart.id).stock, 5)
  assert.equal(r.data.inventory.find((i) => i.id === butter.id).stock, 0.5)

  // POS webhook: idempotent, public with token only.
  r = await owner('POST', `${R}/pos`, { provider: 'ready2order' })
  const hook = r.data.webhookPath
  const anon = client()
  r = await anon('POST', hook, { receipts: [
    { externalId: 'A-1', timestamp: '2026-10-09T19:40:00', gross: 53.5, net: 50, tip: 4, paymentMethod: 'karte' },
    { externalId: 'A-2', timestamp: '2026-10-09T20:10:00', gross: 21.4, net: 20, paymentMethod: 'bar' },
  ] })
  assert.deepEqual(r.data, { accepted: 2, duplicates: 0 })
  r = await anon('POST', hook, { externalId: 'A-1', timestamp: '2026-10-09T19:40:00', gross: 53.5 })
  assert.deepEqual(r.data, { accepted: 0, duplicates: 1 })
  r = await anon('POST', '/api/gastro/pos/' + 'f'.repeat(48), { externalId: 'x', timestamp: '2026-10-09T19:40:00', gross: 1 })
  assert.equal(r.status, 404)
  r = await owner('GET', `${R}/revenue?from=2026-10-09&to=2026-10-09`)
  assert.equal(r.data.transactions, 2)
  assert.equal(r.data.gross, 74.9)
  assert.equal(r.data.tips, 4)
  assert.equal(r.data.averageTicket, 37.45)

  // Staffing from reservations: 7 guests on 2026-10-09 → 1 service, 1 kitchen; generate shifts.
  r = await owner('GET', `${R}/shifts?weekStart=2026-10-05`)
  const fri = r.data.days.find((d) => d.date === '2026-10-09')
  assert.equal(fri.guests, 13)
  assert.equal(fri.service, 1)
  await owner('PUT', R, { guestsPerService: 6, openDays: [1, 2, 3, 4, 5] })
  r = await owner('GET', `${R}/shifts?weekStart=2026-10-05`)
  assert.equal(r.data.days.find((d) => d.date === '2026-10-09').service, 3)
  assert.equal(r.data.days.find((d) => d.date === '2026-10-10').open, false)
  r = await owner('POST', `${R}/shifts/generate`, { weekStart: '2026-10-05' })
  assert.equal(r.data.filter((s) => s.date === '2026-10-09' && s.role === 'service').length, 3)
  assert.equal(r.data.filter((s) => s.date === '2026-10-10').length, 0)

  // Feedback: low ratings need attention.
  r = await owner('POST', `${R}/feedback`, { guestName: 'Gast', rating: 2, comment: 'Lange Wartezeit', channel: 'google' })
  assert.equal(r.data.status, 'needs_attention')

  // The last owner cannot leave; deleting the restaurant removes everything.
  r = await owner('DELETE', `${R}/team/members/${(await owner('GET', `${R}/team`)).data.members.find((m) => m.role === 'owner').user_id}`)
  assert.equal(r.status, 400)
  r = await koch('DELETE', R)
  assert.equal(r.status, 403)
  r = await owner('DELETE', R)
  assert.equal(r.status, 200)
  r = await anon('POST', hook, { externalId: 'A-3', timestamp: '2026-10-09T21:00:00', gross: 5 })
  assert.equal(r.status, 404)
})
