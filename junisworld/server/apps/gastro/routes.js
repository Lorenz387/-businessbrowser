import { Router } from 'express'
import crypto from 'node:crypto'
import { one, all, run, tx } from '../../db.js'
import { h, str, int, oneOf, badRequest, notFound, forbidden, ApiError } from '../../lib/http.js'
import { aiAvailable } from '../../lib/ai.js'
import { consumeDaily } from '../../lib/usage.js'
import { notify } from '../../lib/engine.js'
import {
  ROLES, ALLERGENS, RES_STATUS, TABLE_STATUS, CHANNELS, membership, need, permissions, restaurantOut, recipeCost, dishOut,
  suggestTable, tableConflict, staffing, revenue, feedbackStatus, assertDate, assertTime, num, addDays,
} from './service.js'
import { gastroAi, feedbackReply, AI_MODES } from './ai.js'
import { appScope } from '../../lib/workspace.js'

const r = Router()
const uid = (req) => req.user.id
const base = '/apps/gastro/r/:rid'

export function todayIn(tz) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()) } catch { return new Date().toISOString().slice(0, 10) }
}
const validTz = (tz) => { try { new Intl.DateTimeFormat('de-DE', { timeZone: tz }); return true } catch { return false } }

// ---------- Restaurants & Einladungen ----------

r.get('/apps/gastro', h(async (req, res) => {
  const sc = appScope(req, 'gastro')
  const ids = sc.type === 'org'
    ? all(`SELECT id FROM gastro_restaurants WHERE org_id = ? AND (id IN (SELECT restaurant_id FROM gastro_members WHERE user_id = ?) OR ?)`, sc.orgId, uid(req), sc.canWrite ? 1 : 0)
    : all('SELECT r.id FROM gastro_restaurants r JOIN gastro_members m ON m.restaurant_id = r.id WHERE m.user_id = ? AND r.org_id IS NULL', uid(req))
  const restaurants = ids.map(({ id }) => { const x = membership(req.user, id); return { ...restaurantOut(x.restaurant), role: x.role } }).sort((a, b) => a.name.localeCompare(b.name))
  const invites = all('SELECT i.id, i.role, r.name FROM gastro_invites i JOIN gastro_restaurants r ON r.id = i.restaurant_id WHERE lower(i.email) = lower(?)', req.user.email)
  res.json({ restaurants, invites, roles: ROLES, canCreate: sc.canWrite, workspace: { type: sc.type, name: sc.orgName || null } })
}))

r.post('/apps/gastro', h(async (req, res) => {
  const sc = appScope(req, 'gastro')
  sc.requireWrite()
  const name = str(req.body.name, { required: true, max: 120, field: 'Name' })
  const id = tx(() => {
    const rid = Number(run('INSERT INTO gastro_restaurants (owner_id, org_id, name, address, concept) VALUES (?, ?, ?, ?, ?)', uid(req), sc.orgId, name, str(req.body.address, { max: 200 }), str(req.body.concept, { max: 2000 })).lastInsertRowid)
    run("INSERT INTO gastro_members (restaurant_id, user_id, role) VALUES (?, ?, 'owner')", rid, uid(req))
    return rid
  })
  res.status(201).json({ id })
}))

r.post('/apps/gastro/invites/:id/:action', h(async (req, res) => {
  const inv = one('SELECT * FROM gastro_invites WHERE id = ? AND lower(email) = lower(?)', Number(req.params.id), req.user.email)
  if (!inv) throw notFound('Diese Einladung existiert nicht.')
  const action = oneOf(req.params.action, ['accept', 'decline'], { field: 'Aktion' })
  tx(() => {
    if (action === 'accept') run('INSERT INTO gastro_members (restaurant_id, user_id, role) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', inv.restaurant_id, uid(req), inv.role)
    run('DELETE FROM gastro_invites WHERE id = ?', inv.id)
  })
  res.json({ ok: true, restaurantId: inv.restaurant_id })
}))

// Every route below works inside one restaurant the user is a member of.
r.use(base, (req, _res, next) => {
  try {
    req.g = membership(req.user, Number(req.params.rid))
    next()
  } catch (e) { next(e) }
})
const rid = (req) => req.g.restaurant.id
const own = (table, req, id) => {
  const row = one(`SELECT * FROM ${table} WHERE id = ? AND restaurant_id = ?`, Number(id), rid(req))
  if (!row) throw notFound('Dieser Eintrag existiert nicht.')
  return row
}

r.get(base, h(async (req, res) => {
  const { restaurant, role } = req.g
  res.json({
    restaurant: restaurantOut(restaurant), role, roles: ROLES, permissions: permissions(role), today: todayIn(restaurant.timezone),
    allergens: ALLERGENS, reservationStatus: RES_STATUS, channels: CHANNELS, aiAvailable: aiAvailable(), aiModes: AI_MODES,
  })
}))

r.put(base, h(async (req, res) => {
  need(req.g, 'settings')
  const b = req.body
  const cur = req.g.restaurant
  if (b.timezone !== undefined && !validTz(b.timezone)) throw badRequest('Unbekannte Zeitzone (z. B. Europe/Berlin).')
  const openDays = b.openDays !== undefined ? [...new Set((Array.isArray(b.openDays) ? b.openDays : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : JSON.parse(cur.open_days)
  run(`UPDATE gastro_restaurants SET name = ?, address = ?, concept = ?, timezone = ?, open_days = ?, slot_minutes = ?, guests_per_service = ?, guests_per_kitchen = ? WHERE id = ?`,
    str(b.name, { max: 120, field: 'Name' }) ?? cur.name,
    b.address !== undefined ? str(b.address, { max: 200 }) : cur.address,
    b.concept !== undefined ? str(b.concept, { max: 2000 }) : cur.concept,
    b.timezone ?? cur.timezone,
    JSON.stringify(openDays),
    int(b.slotMinutes, { min: 30, max: 480, fallback: cur.slot_minutes }),
    int(b.guestsPerService, { min: 1, max: 200, fallback: cur.guests_per_service }),
    int(b.guestsPerKitchen, { min: 1, max: 200, fallback: cur.guests_per_kitchen }),
    cur.id)
  res.json(restaurantOut(one('SELECT * FROM gastro_restaurants WHERE id = ?', cur.id)))
}))

r.delete(base, h(async (req, res) => {
  if (req.g.role !== 'owner') throw forbidden('Nur Inhaber/innen können das Restaurant löschen.')
  run('DELETE FROM gastro_restaurants WHERE id = ?', rid(req))
  res.json({ ok: true })
}))

// ---------- Dashboard ----------

r.get(`${base}/dashboard`, h(async (req, res) => {
  const { restaurant, role } = req.g
  const today = todayIn(restaurant.timezone)
  const resToday = all("SELECT r.*, g.allergies FROM gastro_reservations r LEFT JOIN gastro_guests g ON g.id = r.guest_id WHERE r.restaurant_id = ? AND r.date = ? AND r.status IN ('confirmed','seated') ORDER BY r.time", restaurant.id, today)
  const tables = one('SELECT COUNT(*) AS n, COALESCE(SUM(seats), 0) AS seats, COALESCE(SUM(CASE WHEN status != \'free\' THEN seats END), 0) AS used FROM gastro_tables WHERE restaurant_id = ?', restaurant.id)
  const perms = permissions(role)
  const dishes = all('SELECT * FROM gastro_dishes WHERE restaurant_id = ? AND active = 1', restaurant.id).map(dishOut).filter((d) => d.foodCostPct != null)
  res.json({
    today,
    reservations: resToday,
    expectedGuests: resToday.reduce((s, x) => s + x.guests, 0),
    tables,
    reorder: all('SELECT id, name, stock, unit, reorder_level FROM gastro_ingredients WHERE restaurant_id = ? AND stock <= reorder_level ORDER BY name', restaurant.id),
    openFeedback: all("SELECT * FROM gastro_feedback WHERE restaurant_id = ? AND status != 'handled' ORDER BY status = 'needs_attention' DESC, created_at DESC LIMIT 5", restaurant.id),
    revenueToday: perms.revenue.read ? revenue(restaurant.id, today, today) : null,
    revenueWeek: perms.revenue.read ? revenue(restaurant.id, addDays(today, -6), today) : null,
    avgFoodCost: dishes.length ? Math.round((dishes.reduce((s, d) => s + d.foodCostPct, 0) / dishes.length) * 10) / 10 : null,
    counts: one(`SELECT (SELECT COUNT(*) FROM gastro_guests WHERE restaurant_id = ?) AS guests, (SELECT COUNT(*) FROM gastro_employees WHERE restaurant_id = ?) AS employees,
      (SELECT COUNT(*) FROM gastro_dishes WHERE restaurant_id = ? AND active = 1) AS dishes`, restaurant.id, restaurant.id, restaurant.id),
  })
}))

// ---------- Team ----------

r.get(`${base}/team`, h(async (req, res) => {
  res.json({
    members: all('SELECT m.user_id, m.role, u.name, u.email FROM gastro_members m JOIN users u ON u.id = m.user_id WHERE m.restaurant_id = ? ORDER BY u.name', rid(req)),
    invites: permissions(req.g.role).team.read ? all('SELECT * FROM gastro_invites WHERE restaurant_id = ? ORDER BY created_at DESC', rid(req)) : [],
    employees: all('SELECT * FROM gastro_employees WHERE restaurant_id = ? ORDER BY name', rid(req)),
  })
}))

const assignableRole = (req, role) => {
  const r2 = oneOf(role, Object.keys(ROLES), { field: 'Rolle' })
  if (r2 === 'owner' && req.g.role !== 'owner') throw forbidden('Nur Inhaber/innen können weitere Inhaber/innen ernennen.')
  return r2
}

r.post(`${base}/team/invite`, h(async (req, res) => {
  need(req.g, 'team')
  const email = str(req.body.email, { required: true, max: 200, field: 'E-Mail' }).toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw badRequest('Bitte eine gültige E-Mail-Adresse angeben.')
  const role = assignableRole(req, req.body.role)
  const user = one('SELECT id FROM users WHERE lower(email) = ?', email)
  if (user && one('SELECT 1 FROM gastro_members WHERE restaurant_id = ? AND user_id = ?', rid(req), user.id)) throw badRequest('Diese Person gehört bereits zum Team.')
  run('INSERT INTO gastro_invites (restaurant_id, email, role) VALUES (?, ?, ?) ON CONFLICT(restaurant_id, email) DO UPDATE SET role = excluded.role', rid(req), email, role)
  if (user) notify(user.id, 'gastro', `Einladung ins Team von „${req.g.restaurant.name}“ (${ROLES[role]}).`, { link: '/apps/gastro', dedupeKey: `gastro-invite:${rid(req)}:${user.id}` })
  res.status(201).json({ ok: true, registered: !!user })
}))

r.delete(`${base}/team/invites/:id`, h(async (req, res) => {
  need(req.g, 'team')
  run('DELETE FROM gastro_invites WHERE id = ? AND restaurant_id = ?', Number(req.params.id), rid(req))
  res.json({ ok: true })
}))

const ownerCount = (restaurantId) => one("SELECT COUNT(*) AS n FROM gastro_members WHERE restaurant_id = ? AND role = 'owner'", restaurantId).n

r.patch(`${base}/team/members/:userId`, h(async (req, res) => {
  need(req.g, 'team')
  const target = one('SELECT * FROM gastro_members WHERE restaurant_id = ? AND user_id = ?', rid(req), Number(req.params.userId))
  if (!target) throw notFound('Dieses Teammitglied existiert nicht.')
  const role = assignableRole(req, req.body.role)
  if (target.role === 'owner' && req.g.role !== 'owner') throw forbidden('Nur Inhaber/innen können Inhaber/innen ändern.')
  if (target.role === 'owner' && role !== 'owner' && ownerCount(rid(req)) === 1) throw badRequest('Das Restaurant braucht mindestens eine/n Inhaber/in.')
  run('UPDATE gastro_members SET role = ? WHERE restaurant_id = ? AND user_id = ?', role, rid(req), target.user_id)
  res.json({ ok: true })
}))

r.delete(`${base}/team/members/:userId`, h(async (req, res) => {
  const targetId = Number(req.params.userId)
  if (targetId !== uid(req)) need(req.g, 'team')
  const target = one('SELECT * FROM gastro_members WHERE restaurant_id = ? AND user_id = ?', rid(req), targetId)
  if (!target) throw notFound('Dieses Teammitglied existiert nicht.')
  if (target.role === 'owner' && targetId !== uid(req) && req.g.role !== 'owner') throw forbidden('Nur Inhaber/innen können Inhaber/innen entfernen.')
  if (target.role === 'owner' && ownerCount(rid(req)) === 1) throw badRequest('Das Restaurant braucht mindestens eine/n Inhaber/in. Lösche es stattdessen oder ernenne zuerst eine weitere Person.')
  run('DELETE FROM gastro_members WHERE restaurant_id = ? AND user_id = ?', rid(req), targetId)
  res.json({ ok: true })
}))

function readEmployee(b, cur = {}) {
  return {
    name: str(b.name, { max: 120, field: 'Name' }) ?? cur.name,
    role: oneOf(b.role, ['kitchen', 'service', 'manager', 'other'], { field: 'Rolle', fallback: cur.role ?? 'service' }),
    contact: b.contact !== undefined ? str(b.contact, { max: 200 }) : cur.contact ?? null,
    weekly_hours: b.weeklyHours !== undefined ? (b.weeklyHours === '' || b.weeklyHours === null ? null : num(b.weeklyHours, 'Wochenstunden', { max: 80 })) : cur.weekly_hours ?? null,
  }
}
r.post(`${base}/employees`, h(async (req, res) => {
  need(req.g, 'team')
  const e = readEmployee(req.body)
  if (!e.name) throw badRequest('Name darf nicht leer sein.')
  const id = Number(run('INSERT INTO gastro_employees (restaurant_id, name, role, contact, weekly_hours) VALUES (?, ?, ?, ?, ?)', rid(req), e.name, e.role, e.contact, e.weekly_hours).lastInsertRowid)
  res.status(201).json(one('SELECT * FROM gastro_employees WHERE id = ?', id))
}))
r.patch(`${base}/employees/:id`, h(async (req, res) => {
  need(req.g, 'team')
  const e = readEmployee(req.body, own('gastro_employees', req, req.params.id))
  run('UPDATE gastro_employees SET name = ?, role = ?, contact = ?, weekly_hours = ? WHERE id = ?', e.name, e.role, e.contact, e.weekly_hours, Number(req.params.id))
  res.json(one('SELECT * FROM gastro_employees WHERE id = ?', Number(req.params.id)))
}))
r.delete(`${base}/employees/:id`, h(async (req, res) => {
  need(req.g, 'team')
  own('gastro_employees', req, req.params.id)
  run('DELETE FROM gastro_employees WHERE id = ?', Number(req.params.id))
  res.json({ ok: true })
}))

// ---------- Tische ----------

r.get(`${base}/tables`, h(async (req, res) => res.json(all('SELECT * FROM gastro_tables WHERE restaurant_id = ? ORDER BY number', rid(req)))))

r.post(`${base}/tables`, h(async (req, res) => {
  need(req.g, 'floor')
  const count = int(req.body.count, { min: 1, max: 60, fallback: 1 })
  const seats = int(req.body.seats, { min: 1, max: 40, fallback: 2 })
  const area = str(req.body.area, { max: 60 })
  if (one('SELECT COUNT(*) AS n FROM gastro_tables WHERE restaurant_id = ?', rid(req)).n + count > 200) throw badRequest('Maximal 200 Tische je Restaurant.')
  const start = one('SELECT COALESCE(MAX(number), 0) AS n FROM gastro_tables WHERE restaurant_id = ?', rid(req)).n + 1
  tx(() => { for (let i = 0; i < count; i++) run('INSERT INTO gastro_tables (restaurant_id, number, seats, area) VALUES (?, ?, ?, ?)', rid(req), start + i, seats, area) })
  res.status(201).json(all('SELECT * FROM gastro_tables WHERE restaurant_id = ? ORDER BY number', rid(req)))
}))

r.patch(`${base}/tables/:id`, h(async (req, res) => {
  need(req.g, 'floor')
  const t = own('gastro_tables', req, req.params.id)
  run('UPDATE gastro_tables SET status = ?, seats = ?, area = ? WHERE id = ?',
    oneOf(req.body.status, TABLE_STATUS, { field: 'Status', fallback: t.status }),
    int(req.body.seats, { min: 1, max: 40, fallback: t.seats }),
    req.body.area !== undefined ? str(req.body.area, { max: 60 }) : t.area, t.id)
  res.json(one('SELECT * FROM gastro_tables WHERE id = ?', t.id))
}))

r.delete(`${base}/tables/:id`, h(async (req, res) => {
  need(req.g, 'floor')
  own('gastro_tables', req, req.params.id)
  run('DELETE FROM gastro_tables WHERE id = ?', Number(req.params.id))
  res.json({ ok: true })
}))

// ---------- Reservierungen ----------

const reservationQuery = `SELECT r.*, t.number AS table_number, g.allergies AS guest_allergies FROM gastro_reservations r
  LEFT JOIN gastro_tables t ON t.id = r.table_id LEFT JOIN gastro_guests g ON g.id = r.guest_id`

r.get(`${base}/reservations`, h(async (req, res) => {
  const today = todayIn(req.g.restaurant.timezone)
  const from = req.query.from ? assertDate(req.query.from) : today
  const to = req.query.to ? assertDate(req.query.to) : addDays(from, 30)
  res.json(all(`${reservationQuery} WHERE r.restaurant_id = ? AND r.date BETWEEN ? AND ? ORDER BY r.date, r.time`, rid(req), from, to))
}))

function saveReservation(req, cur = null) {
  const b = req.body
  const restaurant = req.g.restaurant
  const v = {
    guest_name: str(b.guestName, { max: 120, field: 'Gastname' }) ?? cur?.guest_name,
    phone: b.phone !== undefined ? str(b.phone, { max: 60 }) : cur?.phone ?? null,
    date: b.date !== undefined ? assertDate(b.date) : cur?.date,
    time: b.time !== undefined ? assertTime(b.time) : cur?.time,
    guests: int(b.guests, { min: 1, max: 500, fallback: cur?.guests ?? null }),
    status: oneOf(b.status, Object.keys(RES_STATUS), { field: 'Status', fallback: cur?.status ?? 'confirmed' }),
    note: b.note !== undefined ? str(b.note, { max: 1000 }) : cur?.note ?? null,
    guest_id: b.guestId !== undefined ? (b.guestId ? own('gastro_guests', req, b.guestId).id : null) : cur?.guest_id ?? null,
    table_id: cur?.table_id ?? null,
  }
  if (!v.guest_name || !v.date || !v.time || !v.guests) throw badRequest('Gastname, Datum, Uhrzeit und Personenzahl werden benötigt.')
  let warning = null
  if (b.tableId !== undefined) v.table_id = b.tableId ? own('gastro_tables', req, b.tableId).id : null
  if (b.autoAssign) {
    const t = suggestTable(restaurant, { date: v.date, time: v.time, guests: v.guests, excludeId: cur?.id || 0 })
    v.table_id = t?.id ?? null
    if (!t) warning = 'Kein passender freier Tisch in diesem Zeitfenster — Reservierung ohne Tisch gespeichert.'
  }
  if (v.table_id && ['confirmed', 'seated'].includes(v.status)) {
    const t = one('SELECT * FROM gastro_tables WHERE id = ?', v.table_id)
    const clash = tableConflict(restaurant, { tableId: v.table_id, date: v.date, time: v.time, excludeId: cur?.id || 0 })
    if (clash) throw new ApiError(409, 'conflict', `Tisch ${t.number} ist um ${clash.time} Uhr bereits für ${clash.guest_name} reserviert (Zeitfenster ${restaurant.slot_minutes} Min.).`)
    if (t.seats < v.guests) warning = `Achtung: Tisch ${t.number} hat nur ${t.seats} Plätze.`
  }
  if (!v.guest_id && b.saveGuest) {
    const existing = one('SELECT id FROM gastro_guests WHERE restaurant_id = ? AND lower(name) = lower(?) AND COALESCE(phone, \'\') = COALESCE(?, \'\')', restaurant.id, v.guest_name, v.phone)
    v.guest_id = existing?.id ?? Number(run('INSERT INTO gastro_guests (restaurant_id, name, phone) VALUES (?, ?, ?)', restaurant.id, v.guest_name, v.phone).lastInsertRowid)
  }
  return { v, warning }
}

r.post(`${base}/reservations`, h(async (req, res) => {
  need(req.g, 'floor')
  const { v, warning } = tx(() => saveReservation(req))
  const id = Number(run('INSERT INTO gastro_reservations (restaurant_id, guest_id, guest_name, phone, date, time, guests, table_id, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    rid(req), v.guest_id, v.guest_name, v.phone, v.date, v.time, v.guests, v.table_id, v.status, v.note).lastInsertRowid)
  res.status(201).json({ ...one(`${reservationQuery} WHERE r.id = ?`, id), warning })
}))

r.patch(`${base}/reservations/:id`, h(async (req, res) => {
  need(req.g, 'floor')
  const cur = own('gastro_reservations', req, req.params.id)
  const { v, warning } = saveReservation(req, cur)
  run('UPDATE gastro_reservations SET guest_id = ?, guest_name = ?, phone = ?, date = ?, time = ?, guests = ?, table_id = ?, status = ?, note = ? WHERE id = ?',
    v.guest_id, v.guest_name, v.phone, v.date, v.time, v.guests, v.table_id, v.status, v.note, cur.id)
  // Platzieren belegt den Tisch, Abschließen gibt ihn zur Reinigung frei.
  if (v.table_id && req.body.status === 'seated') run("UPDATE gastro_tables SET status = 'occupied' WHERE id = ?", v.table_id)
  if (v.table_id && req.body.status === 'completed') run("UPDATE gastro_tables SET status = 'cleaning' WHERE id = ?", v.table_id)
  res.json({ ...one(`${reservationQuery} WHERE r.id = ?`, cur.id), warning })
}))

r.delete(`${base}/reservations/:id`, h(async (req, res) => {
  need(req.g, 'floor')
  own('gastro_reservations', req, req.params.id)
  run('DELETE FROM gastro_reservations WHERE id = ?', Number(req.params.id))
  res.json({ ok: true })
}))

// ---------- Gäste ----------

const guestQuery = `SELECT g.*, (SELECT COUNT(*) FROM gastro_reservations r WHERE r.guest_id = g.id AND r.status IN ('seated','completed')) AS visits,
  (SELECT COUNT(*) FROM gastro_reservations r WHERE r.guest_id = g.id AND r.status = 'no_show') AS no_shows,
  (SELECT MAX(date) FROM gastro_reservations r WHERE r.guest_id = g.id AND r.status IN ('seated','completed')) AS last_visit FROM gastro_guests g`

r.get(`${base}/guests`, h(async (req, res) => {
  need(req.g, 'floor', 'read')
  const q = str(req.query.q, { max: 100 })
  res.json(q
    ? all(`${guestQuery} WHERE g.restaurant_id = ? AND (lower(g.name) LIKE ? OR g.phone LIKE ? OR lower(g.email) LIKE ?) ORDER BY g.name LIMIT 200`, rid(req), `%${q.toLowerCase()}%`, `%${q}%`, `%${q.toLowerCase()}%`)
    : all(`${guestQuery} WHERE g.restaurant_id = ? ORDER BY g.name LIMIT 500`, rid(req)))
}))

function readGuest(b, cur = {}) {
  return {
    name: str(b.name, { max: 120, field: 'Name' }) ?? cur.name,
    phone: b.phone !== undefined ? str(b.phone, { max: 60 }) : cur.phone ?? null,
    email: b.email !== undefined ? str(b.email, { max: 200 }) : cur.email ?? null,
    allergies: b.allergies !== undefined ? str(b.allergies, { max: 500 }) : cur.allergies ?? null,
    notes: b.notes !== undefined ? str(b.notes, { max: 2000 }) : cur.notes ?? null,
    marketing_consent: b.marketingConsent !== undefined ? (b.marketingConsent ? 1 : 0) : cur.marketing_consent ?? 0,
  }
}
r.post(`${base}/guests`, h(async (req, res) => {
  need(req.g, 'floor')
  const g = readGuest(req.body)
  if (!g.name) throw badRequest('Name darf nicht leer sein.')
  const id = Number(run('INSERT INTO gastro_guests (restaurant_id, name, phone, email, allergies, notes, marketing_consent) VALUES (?, ?, ?, ?, ?, ?, ?)', rid(req), g.name, g.phone, g.email, g.allergies, g.notes, g.marketing_consent).lastInsertRowid)
  res.status(201).json(one(`${guestQuery} WHERE g.id = ?`, id))
}))
r.patch(`${base}/guests/:id`, h(async (req, res) => {
  need(req.g, 'floor')
  const g = readGuest(req.body, own('gastro_guests', req, req.params.id))
  run('UPDATE gastro_guests SET name = ?, phone = ?, email = ?, allergies = ?, notes = ?, marketing_consent = ? WHERE id = ?', g.name, g.phone, g.email, g.allergies, g.notes, g.marketing_consent, Number(req.params.id))
  res.json(one(`${guestQuery} WHERE g.id = ?`, Number(req.params.id)))
}))
r.delete(`${base}/guests/:id`, h(async (req, res) => {
  need(req.g, 'floor')
  own('gastro_guests', req, req.params.id)
  run('DELETE FROM gastro_guests WHERE id = ?', Number(req.params.id))
  res.json({ ok: true })
}))

// ---------- Personal & Schichten ----------

r.get(`${base}/shifts`, h(async (req, res) => {
  need(req.g, 'shifts', 'read')
  const weekStart = assertDate(req.query.weekStart, 'Wochenstart')
  res.json({
    days: staffing(req.g.restaurant, weekStart),
    shifts: all('SELECT s.*, e.name AS employee_name FROM gastro_shifts s LEFT JOIN gastro_employees e ON e.id = s.employee_id WHERE s.restaurant_id = ? AND s.date BETWEEN ? AND ? ORDER BY s.date, s.role, s.start_time', rid(req), weekStart, addDays(weekStart, 6)),
    employees: all('SELECT id, name, role FROM gastro_employees WHERE restaurant_id = ? ORDER BY name', rid(req)),
  })
}))

r.post(`${base}/shifts/generate`, h(async (req, res) => {
  need(req.g, 'shifts')
  const b = req.body
  const weekStart = assertDate(b.weekStart, 'Wochenstart')
  const times = { service: [assertTime(b.serviceStart || '11:00'), assertTime(b.serviceEnd || '22:00')], kitchen: [assertTime(b.kitchenStart || '10:00'), assertTime(b.kitchenEnd || '21:30')] }
  const days = staffing(req.g.restaurant, weekStart)
  tx(() => {
    run('DELETE FROM gastro_shifts WHERE restaurant_id = ? AND date BETWEEN ? AND ?', rid(req), weekStart, addDays(weekStart, 6))
    for (const d of days) {
      if (!d.open) continue
      for (const role of ['service', 'kitchen']) {
        for (let i = 0; i < d[role]; i++) run('INSERT INTO gastro_shifts (restaurant_id, date, role, start_time, end_time, planned, note) VALUES (?, ?, ?, ?, ?, 1, ?)', rid(req), d.date, role, times[role][0], times[role][1], d.note)
      }
    }
  })
  res.status(201).json(all('SELECT * FROM gastro_shifts WHERE restaurant_id = ? AND date BETWEEN ? AND ? ORDER BY date, role', rid(req), weekStart, addDays(weekStart, 6)))
}))

r.patch(`${base}/shifts/:id`, h(async (req, res) => {
  need(req.g, 'shifts')
  const s = own('gastro_shifts', req, req.params.id)
  run('UPDATE gastro_shifts SET employee_id = ?, start_time = ?, end_time = ?, note = ? WHERE id = ?',
    req.body.employeeId !== undefined ? (req.body.employeeId ? own('gastro_employees', req, req.body.employeeId).id : null) : s.employee_id,
    req.body.startTime !== undefined ? assertTime(req.body.startTime) : s.start_time,
    req.body.endTime !== undefined ? assertTime(req.body.endTime) : s.end_time,
    req.body.note !== undefined ? str(req.body.note, { max: 300 }) : s.note, s.id)
  res.json(one('SELECT s.*, e.name AS employee_name FROM gastro_shifts s LEFT JOIN gastro_employees e ON e.id = s.employee_id WHERE s.id = ?', s.id))
}))

r.delete(`${base}/shifts/:id`, h(async (req, res) => {
  need(req.g, 'shifts')
  own('gastro_shifts', req, req.params.id)
  run('DELETE FROM gastro_shifts WHERE id = ?', Number(req.params.id))
  res.json({ ok: true })
}))

// ---------- Lager ----------

const ingredientOut = (i) => ({ ...i, needsReorder: i.stock <= i.reorder_level })
r.get(`${base}/inventory`, h(async (req, res) => {
  need(req.g, 'kitchen', 'read')
  res.json(all('SELECT * FROM gastro_ingredients WHERE restaurant_id = ? ORDER BY name', rid(req)).map(ingredientOut))
}))

function readIngredient(b, cur = {}) {
  const n = (v, field, c) => (v === undefined || v === '' ? c : num(v, field))
  return {
    name: str(b.name, { max: 120, field: 'Name' }) ?? cur.name,
    unit: str(b.unit, { max: 20, field: 'Einheit' }) ?? cur.unit ?? 'kg',
    stock: n(b.stock, 'Bestand', cur.stock ?? 0),
    reorder_level: n(b.reorderLevel, 'Meldebestand', cur.reorder_level ?? 0),
    unit_cost: n(b.unitCost, 'Preis je Einheit', cur.unit_cost ?? 0),
    supplier: b.supplier !== undefined ? str(b.supplier, { max: 120 }) : cur.supplier ?? null,
  }
}
r.post(`${base}/inventory`, h(async (req, res) => {
  need(req.g, 'kitchen')
  const i = readIngredient(req.body)
  if (!i.name) throw badRequest('Name darf nicht leer sein.')
  const id = Number(run('INSERT INTO gastro_ingredients (restaurant_id, name, unit, stock, reorder_level, unit_cost, supplier) VALUES (?, ?, ?, ?, ?, ?, ?)', rid(req), i.name, i.unit, i.stock, i.reorder_level, i.unit_cost, i.supplier).lastInsertRowid)
  res.status(201).json(ingredientOut(one('SELECT * FROM gastro_ingredients WHERE id = ?', id)))
}))
r.patch(`${base}/inventory/:id`, h(async (req, res) => {
  need(req.g, 'kitchen')
  const cur = own('gastro_ingredients', req, req.params.id)
  const i = readIngredient(req.body, cur)
  if (req.body.delta !== undefined) i.stock = Math.max(0, Math.round((cur.stock + num(req.body.delta, 'Änderung', { min: -1e9 })) * 1000) / 1000)
  run("UPDATE gastro_ingredients SET name = ?, unit = ?, stock = ?, reorder_level = ?, unit_cost = ?, supplier = ?, updated_at = datetime('now') WHERE id = ?", i.name, i.unit, i.stock, i.reorder_level, i.unit_cost, i.supplier, cur.id)
  res.json(ingredientOut(one('SELECT * FROM gastro_ingredients WHERE id = ?', cur.id)))
}))
r.delete(`${base}/inventory/:id`, h(async (req, res) => {
  need(req.g, 'kitchen')
  own('gastro_ingredients', req, req.params.id)
  run('DELETE FROM gastro_ingredients WHERE id = ?', Number(req.params.id))
  res.json({ ok: true })
}))

// ---------- Rezepte ----------

const recipeOut = (x) => ({ ...x, ...recipeCost(x.id) })
r.get(`${base}/recipes`, h(async (req, res) => {
  need(req.g, 'kitchen', 'read')
  res.json(all('SELECT * FROM gastro_recipes WHERE restaurant_id = ? ORDER BY name', rid(req)).map(recipeOut))
}))

function writeRecipe(req, cur = null) {
  const b = req.body
  const name = str(b.name, { max: 120, field: 'Name' }) ?? cur?.name
  if (!name) throw badRequest('Name darf nicht leer sein.')
  const values = [name, int(b.portions, { min: 1, max: 1000, fallback: cur?.portions ?? 1 }),
    b.season !== undefined ? str(b.season, { max: 60 }) : cur?.season ?? null,
    b.region !== undefined ? str(b.region, { max: 60 }) : cur?.region ?? null,
    b.steps !== undefined ? str(b.steps, { max: 8000 }) : cur?.steps ?? null]
  return tx(() => {
    const id = cur ? (run('UPDATE gastro_recipes SET name = ?, portions = ?, season = ?, region = ?, steps = ? WHERE id = ?', ...values, cur.id), cur.id)
      : Number(run('INSERT INTO gastro_recipes (restaurant_id, name, portions, season, region, steps) VALUES (?, ?, ?, ?, ?, ?)', rid(req), ...values).lastInsertRowid)
    if (Array.isArray(b.items)) {
      run('DELETE FROM gastro_recipe_items WHERE recipe_id = ?', id)
      for (const it of b.items.slice(0, 80)) {
        if (!it?.ingredientId) continue
        const ing = own('gastro_ingredients', req, it.ingredientId)
        const q = num(it.quantity, `Menge (${ing.name})`)
        if (q > 0) run('INSERT INTO gastro_recipe_items (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?) ON CONFLICT DO UPDATE SET quantity = excluded.quantity', id, ing.id, q)
      }
    }
    return id
  })
}
r.post(`${base}/recipes`, h(async (req, res) => {
  need(req.g, 'kitchen')
  res.status(201).json(recipeOut(one('SELECT * FROM gastro_recipes WHERE id = ?', writeRecipe(req))))
}))
r.patch(`${base}/recipes/:id`, h(async (req, res) => {
  need(req.g, 'kitchen')
  res.json(recipeOut(one('SELECT * FROM gastro_recipes WHERE id = ?', writeRecipe(req, own('gastro_recipes', req, req.params.id)))))
}))
r.delete(`${base}/recipes/:id`, h(async (req, res) => {
  need(req.g, 'kitchen')
  own('gastro_recipes', req, req.params.id)
  run('DELETE FROM gastro_recipes WHERE id = ?', Number(req.params.id))
  res.json({ ok: true })
}))
// Produktion buchen: zieht die Zutaten für n Portionen vom Lager ab.
r.post(`${base}/recipes/:id/produce`, h(async (req, res) => {
  need(req.g, 'kitchen')
  const recipe = own('gastro_recipes', req, req.params.id)
  const portions = num(req.body.portions, 'Portionen', { min: 0.001, max: 100000 })
  const factor = portions / recipe.portions
  const items = all('SELECT ingredient_id, quantity FROM gastro_recipe_items WHERE recipe_id = ?', recipe.id)
  if (!items.length) throw badRequest('Das Rezept hat noch keine Zutaten.')
  tx(() => { for (const it of items) run("UPDATE gastro_ingredients SET stock = MAX(0, ROUND(stock - ?, 3)), updated_at = datetime('now') WHERE id = ?", it.quantity * factor, it.ingredient_id) })
  res.json({ ok: true, inventory: all('SELECT * FROM gastro_ingredients WHERE restaurant_id = ? ORDER BY name', rid(req)).map(ingredientOut) })
}))

// ---------- Speisekarte ----------

r.get(`${base}/dishes`, h(async (req, res) => {
  res.json(all('SELECT * FROM gastro_dishes WHERE restaurant_id = ? ORDER BY category, position, name', rid(req)).map(dishOut))
}))
function readDish(req, cur = {}) {
  const b = req.body
  return {
    name: str(b.name, { max: 120, field: 'Name' }) ?? cur.name,
    category: str(b.category, { max: 60, field: 'Kategorie' }) ?? cur.category ?? 'Hauptgerichte',
    description: b.description !== undefined ? str(b.description, { max: 500 }) : cur.description ?? null,
    price: b.price !== undefined ? num(b.price, 'Preis', { max: 10000 }) : cur.price ?? 0,
    vat: b.vat !== undefined ? Number(oneOf(Number(b.vat), [7, 19, 0], { field: 'Steuersatz' })) : cur.vat ?? 7,
    recipe_id: b.recipeId !== undefined ? (b.recipeId ? own('gastro_recipes', req, b.recipeId).id : null) : cur.recipe_id ?? null,
    allergens: b.allergens !== undefined ? JSON.stringify((Array.isArray(b.allergens) ? b.allergens : []).filter((a) => ALLERGENS.includes(a))) : cur.allergens ?? '[]',
    active: b.active !== undefined ? (b.active ? 1 : 0) : cur.active ?? 1,
  }
}
r.post(`${base}/dishes`, h(async (req, res) => {
  need(req.g, 'kitchen')
  const d = readDish(req)
  if (!d.name) throw badRequest('Name darf nicht leer sein.')
  const id = Number(run('INSERT INTO gastro_dishes (restaurant_id, name, category, description, price, vat, recipe_id, allergens, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', rid(req), d.name, d.category, d.description, d.price, d.vat, d.recipe_id, d.allergens, d.active).lastInsertRowid)
  res.status(201).json(dishOut(one('SELECT * FROM gastro_dishes WHERE id = ?', id)))
}))
r.patch(`${base}/dishes/:id`, h(async (req, res) => {
  need(req.g, 'kitchen')
  const cur = own('gastro_dishes', req, req.params.id)
  const d = readDish(req, cur)
  run('UPDATE gastro_dishes SET name = ?, category = ?, description = ?, price = ?, vat = ?, recipe_id = ?, allergens = ?, active = ? WHERE id = ?', d.name, d.category, d.description, d.price, d.vat, d.recipe_id, d.allergens, d.active, cur.id)
  res.json(dishOut(one('SELECT * FROM gastro_dishes WHERE id = ?', cur.id)))
}))
r.delete(`${base}/dishes/:id`, h(async (req, res) => {
  need(req.g, 'kitchen')
  own('gastro_dishes', req, req.params.id)
  run('DELETE FROM gastro_dishes WHERE id = ?', Number(req.params.id))
  res.json({ ok: true })
}))

// ---------- Kasse & Umsatz ----------

r.get(`${base}/revenue`, h(async (req, res) => {
  need(req.g, 'revenue', 'read')
  const today = todayIn(req.g.restaurant.timezone)
  const from = req.query.from ? assertDate(req.query.from) : today
  const to = req.query.to ? assertDate(req.query.to) : from
  if (to < from) throw badRequest('Das Enddatum liegt vor dem Startdatum.')
  res.json({
    ...revenue(rid(req), from, to),
    receipts: all('SELECT * FROM gastro_receipts WHERE restaurant_id = ? AND day BETWEEN ? AND ? ORDER BY ts DESC LIMIT 200', rid(req), from, to),
  })
}))

r.get(`${base}/pos`, h(async (req, res) => {
  need(req.g, 'revenue', 'read')
  const x = req.g.restaurant
  res.json({ provider: x.pos_provider, connected: !!x.pos_token, lastSync: x.pos_last_sync, webhookPath: x.pos_token ? `/api/gastro/pos/${x.pos_token}` : null })
}))

r.post(`${base}/pos`, h(async (req, res) => {
  need(req.g, 'revenue')
  const token = crypto.randomBytes(24).toString('hex')
  run('UPDATE gastro_restaurants SET pos_provider = ?, pos_token = ? WHERE id = ?', str(req.body.provider, { max: 80 }) || 'Generischer Webhook', token, rid(req))
  res.json({ connected: true, webhookPath: `/api/gastro/pos/${token}` })
}))

r.delete(`${base}/pos`, h(async (req, res) => {
  need(req.g, 'revenue')
  run('UPDATE gastro_restaurants SET pos_token = NULL WHERE id = ?', rid(req))
  res.json({ ok: true })
}))

r.post(`${base}/receipts`, h(async (req, res) => {
  need(req.g, 'revenue')
  const b = req.body
  const day = assertDate(b.date)
  const gross = num(b.gross, 'Bruttoumsatz', { max: 1e7 })
  const id = Number(run("INSERT INTO gastro_receipts (restaurant_id, external_id, ts, day, gross, net, tip, payment, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual')",
    rid(req), `manual-${crypto.randomUUID()}`, `${day}T${b.time && /^\d{2}:\d{2}$/.test(b.time) ? b.time : '23:59'}:00`, day, gross,
    b.net === undefined || b.net === '' ? null : num(b.net, 'Nettoumsatz', { max: 1e7 }), b.tip ? num(b.tip, 'Trinkgeld', { max: 1e6 }) : 0,
    oneOf(b.payment, ['bar', 'karte', 'sonstiges'], { field: 'Zahlungsart', fallback: 'sonstiges' })).lastInsertRowid)
  res.status(201).json(one('SELECT * FROM gastro_receipts WHERE id = ?', id))
}))

r.delete(`${base}/receipts/:id`, h(async (req, res) => {
  need(req.g, 'revenue')
  const x = own('gastro_receipts', req, req.params.id)
  if (x.source !== 'manual') throw badRequest('Belege aus der Kasse können nur im Kassensystem storniert werden.')
  run('DELETE FROM gastro_receipts WHERE id = ?', x.id)
  res.json({ ok: true })
}))

// ---------- Gäste-Feedback ----------

r.get(`${base}/feedback`, h(async (req, res) => {
  need(req.g, 'floor', 'read')
  res.json(all("SELECT * FROM gastro_feedback WHERE restaurant_id = ? ORDER BY status = 'handled', status = 'open', created_at DESC", rid(req)))
}))
r.post(`${base}/feedback`, h(async (req, res) => {
  need(req.g, 'floor')
  const rating = int(req.body.rating, { min: 1, max: 5 })
  if (!rating) throw badRequest('Bitte eine Bewertung von 1 bis 5 Sternen angeben.')
  const id = Number(run('INSERT INTO gastro_feedback (restaurant_id, guest_name, rating, comment, channel, status) VALUES (?, ?, ?, ?, ?, ?)',
    rid(req), str(req.body.guestName, { max: 120 }), rating, str(req.body.comment, { max: 3000 }), oneOf(req.body.channel, Object.keys(CHANNELS), { field: 'Kanal', fallback: 'vor_ort' }), feedbackStatus(rating)).lastInsertRowid)
  res.status(201).json(one('SELECT * FROM gastro_feedback WHERE id = ?', id))
}))
r.patch(`${base}/feedback/:id`, h(async (req, res) => {
  need(req.g, 'floor')
  const f = own('gastro_feedback', req, req.params.id)
  run('UPDATE gastro_feedback SET status = ?, response = ? WHERE id = ?',
    oneOf(req.body.status, ['open', 'needs_attention', 'handled'], { field: 'Status', fallback: f.status }),
    req.body.response !== undefined ? str(req.body.response, { max: 3000 }) : f.response, f.id)
  res.json(one('SELECT * FROM gastro_feedback WHERE id = ?', f.id))
}))
r.post(`${base}/feedback/:id/draft`, h(async (req, res) => {
  need(req.g, 'floor')
  const f = own('gastro_feedback', req, req.params.id)
  consumeDaily(uid(req), 'ai_messages')
  res.json({ response: await feedbackReply(req.g.restaurant, f) })
}))
r.delete(`${base}/feedback/:id`, h(async (req, res) => {
  need(req.g, 'floor')
  own('gastro_feedback', req, req.params.id)
  run('DELETE FROM gastro_feedback WHERE id = ?', Number(req.params.id))
  res.json({ ok: true })
}))

// ---------- KI & gespeicherte Pläne ----------

r.post(`${base}/ai`, h(async (req, res) => {
  need(req.g, 'kitchen')
  const mode = oneOf(req.body.mode, AI_MODES, { field: 'Modus', fallback: 'general' })
  const prompt = str(req.body.prompt, { max: 4000 })
  const context = req.body.context && typeof req.body.context === 'object' ? Object.fromEntries(Object.entries(req.body.context).slice(0, 12).map(([k, v]) => [String(k).slice(0, 40), String(v ?? '').slice(0, 500)])) : {}
  if (mode === 'general' && !prompt) throw badRequest('Beschreibe zuerst deine Aufgabe.')
  consumeDaily(uid(req), 'ai_messages')
  res.json({ text: await gastroAi(req.g.restaurant, { mode, prompt, context }) })
}))

r.get(`${base}/plans`, h(async (req, res) => {
  need(req.g, 'kitchen', 'read')
  res.json(all('SELECT p.*, u.name AS author FROM gastro_plans p LEFT JOIN users u ON u.id = p.created_by WHERE p.restaurant_id = ? ORDER BY p.created_at DESC LIMIT 100', rid(req)))
}))
r.post(`${base}/plans`, h(async (req, res) => {
  need(req.g, 'kitchen')
  const id = Number(run('INSERT INTO gastro_plans (restaurant_id, kind, title, week_start, content, created_by) VALUES (?, ?, ?, ?, ?, ?)', rid(req),
    oneOf(req.body.kind, AI_MODES, { field: 'Art', fallback: 'general' }), str(req.body.title, { required: true, max: 160, field: 'Titel' }),
    req.body.weekStart ? assertDate(req.body.weekStart, 'Wochenstart') : null, str(req.body.content, { required: true, max: 60000, field: 'Inhalt' }), uid(req)).lastInsertRowid)
  res.status(201).json(one('SELECT * FROM gastro_plans WHERE id = ?', id))
}))
r.delete(`${base}/plans/:id`, h(async (req, res) => {
  need(req.g, 'kitchen')
  own('gastro_plans', req, req.params.id)
  run('DELETE FROM gastro_plans WHERE id = ?', Number(req.params.id))
  res.json({ ok: true })
}))

export default r
