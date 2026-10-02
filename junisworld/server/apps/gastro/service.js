// GastroFlow — Restaurant-Betriebssystem in JunisWorld: Datenmodell, Rollen und Berechnungen.
import { db, one, all } from '../../db.js'
import { badRequest, forbidden, notFound } from '../../lib/http.js'

db.exec(`
CREATE TABLE IF NOT EXISTS gastro_restaurants (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  concept TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',
  open_days TEXT NOT NULL DEFAULT '[1,2,3,4,5,6,0]',
  slot_minutes INTEGER NOT NULL DEFAULT 120,
  guests_per_service INTEGER NOT NULL DEFAULT 18,
  guests_per_kitchen INTEGER NOT NULL DEFAULT 22,
  pos_provider TEXT,
  pos_token TEXT UNIQUE,
  pos_last_sync TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS gastro_members (
  restaurant_id INTEGER NOT NULL REFERENCES gastro_restaurants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  PRIMARY KEY (restaurant_id, user_id)
);
CREATE TABLE IF NOT EXISTS gastro_invites (
  id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES gastro_restaurants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (restaurant_id, email)
);
CREATE TABLE IF NOT EXISTS gastro_tables (
  id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES gastro_restaurants(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  seats INTEGER NOT NULL,
  area TEXT,
  status TEXT NOT NULL DEFAULT 'free',
  UNIQUE (restaurant_id, number)
);
CREATE TABLE IF NOT EXISTS gastro_guests (
  id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES gastro_restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  allergies TEXT,
  notes TEXT,
  marketing_consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS gastro_reservations (
  id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES gastro_restaurants(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES gastro_guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  phone TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  guests INTEGER NOT NULL,
  table_id INTEGER REFERENCES gastro_tables(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gastro_res_date ON gastro_reservations(restaurant_id, date);
CREATE TABLE IF NOT EXISTS gastro_employees (
  id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES gastro_restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  contact TEXT,
  weekly_hours REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS gastro_shifts (
  id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES gastro_restaurants(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  role TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  planned INTEGER NOT NULL,
  employee_id INTEGER REFERENCES gastro_employees(id) ON DELETE SET NULL,
  note TEXT
);
CREATE TABLE IF NOT EXISTS gastro_ingredients (
  id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES gastro_restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  stock REAL NOT NULL DEFAULT 0,
  reorder_level REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  supplier TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS gastro_recipes (
  id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES gastro_restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  portions INTEGER NOT NULL DEFAULT 1,
  season TEXT,
  region TEXT,
  steps TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS gastro_recipe_items (
  recipe_id INTEGER NOT NULL REFERENCES gastro_recipes(id) ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL REFERENCES gastro_ingredients(id) ON DELETE CASCADE,
  quantity REAL NOT NULL,
  PRIMARY KEY (recipe_id, ingredient_id)
);
CREATE TABLE IF NOT EXISTS gastro_dishes (
  id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES gastro_restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Hauptgerichte',
  description TEXT,
  price REAL NOT NULL DEFAULT 0,
  vat REAL NOT NULL DEFAULT 7,
  recipe_id INTEGER REFERENCES gastro_recipes(id) ON DELETE SET NULL,
  allergens TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS gastro_receipts (
  id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES gastro_restaurants(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  day TEXT NOT NULL,
  gross REAL NOT NULL,
  net REAL,
  tip REAL NOT NULL DEFAULT 0,
  payment TEXT,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (restaurant_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_gastro_receipts_day ON gastro_receipts(restaurant_id, day);
CREATE TABLE IF NOT EXISTS gastro_feedback (
  id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES gastro_restaurants(id) ON DELETE CASCADE,
  guest_name TEXT,
  rating INTEGER NOT NULL,
  comment TEXT,
  channel TEXT NOT NULL DEFAULT 'vor_ort',
  status TEXT NOT NULL,
  response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS gastro_plans (
  id INTEGER PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES gastro_restaurants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  week_start TEXT,
  content TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

export const ROLES = { owner: 'Inhaber/in', manager: 'Betriebsleitung', kitchen: 'Küche', service: 'Service' }

// Who may change what. Reading the dashboard and the menu is open to all members.
const WRITE = {
  settings: ['owner', 'manager'],
  team: ['owner', 'manager'],
  floor: ['owner', 'manager', 'service'], // tables, reservations, guests, feedback
  kitchen: ['owner', 'manager', 'kitchen'], // inventory, recipes, menu, studio
  shifts: ['owner', 'manager'],
  revenue: ['owner', 'manager'],
}
const READ = { ...WRITE, shifts: ['owner', 'manager', 'kitchen', 'service'] }

export function membership(userId, restaurantId) {
  const r = one('SELECT * FROM gastro_restaurants WHERE id = ?', restaurantId)
  if (!r) throw notFound('Dieses Restaurant existiert nicht.')
  const m = one('SELECT role FROM gastro_members WHERE restaurant_id = ? AND user_id = ?', restaurantId, userId)
  if (!m) throw notFound('Dieses Restaurant existiert nicht.')
  return { restaurant: r, role: m.role }
}
export function need(ctx, area, mode = 'write') {
  if (!(mode === 'read' ? READ : WRITE)[area].includes(ctx.role)) throw forbidden(`Deine Rolle (${ROLES[ctx.role]}) hat hier keinen Zugriff.`)
}
export const permissions = (role) => Object.fromEntries(Object.keys(WRITE).map((a) => [a, { read: READ[a].includes(role), write: WRITE[a].includes(role) }]))

// 14 Hauptallergene nach LMIV (Anhang II, Verordnung (EU) Nr. 1169/2011).
export const ALLERGENS = ['Glutenhaltiges Getreide', 'Krebstiere', 'Eier', 'Fisch', 'Erdnüsse', 'Soja', 'Milch/Laktose', 'Schalenfrüchte', 'Sellerie', 'Senf', 'Sesam', 'Schwefeldioxid/Sulfite', 'Lupinen', 'Weichtiere']
export const RES_STATUS = { confirmed: 'Bestätigt', seated: 'Platziert', completed: 'Abgeschlossen', cancelled: 'Storniert', no_show: 'Nicht erschienen' }
export const TABLE_STATUS = ['free', 'reserved', 'occupied', 'cleaning']
export const CHANNELS = { vor_ort: 'Vor Ort', google: 'Google', email: 'E-Mail', telefon: 'Telefon', social: 'Social Media', sonstiges: 'Sonstiges' }

export const DATE = /^\d{4}-\d{2}-\d{2}$/
export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
export const assertDate = (v, field = 'Datum') => { if (!DATE.test(String(v || ''))) throw badRequest(`${field} im Format JJJJ-MM-TT angeben.`); return v }
export const assertTime = (v) => { if (!TIME.test(String(v || ''))) throw badRequest('Uhrzeit im Format HH:MM angeben.'); return v }
export const num = (v, field, { min = 0, max = 1e9 } = {}) => {
  const n = Number(typeof v === 'string' ? v.replace(',', '.') : v)
  if (!Number.isFinite(n) || n < min || n > max) throw badRequest(`${field} ist ungültig.`)
  return Math.round(n * 1000) / 1000
}
const round2 = (n) => Math.round(n * 100) / 100
const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

export function restaurantOut(r) {
  const { pos_token, ...rest } = r
  return { ...rest, open_days: JSON.parse(r.open_days), pos_connected: !!pos_token }
}

// ---------- Kalkulation ----------

export function recipeCost(recipeId) {
  const items = all(`SELECT ri.quantity, i.id, i.name, i.unit, i.unit_cost FROM gastro_recipe_items ri JOIN gastro_ingredients i ON i.id = ri.ingredient_id WHERE ri.recipe_id = ? ORDER BY i.name`, recipeId)
  const r = one('SELECT portions FROM gastro_recipes WHERE id = ?', recipeId)
  const total = items.reduce((s, x) => s + x.quantity * x.unit_cost, 0)
  return { items: items.map((x) => ({ ...x, cost: round2(x.quantity * x.unit_cost) })), total: round2(total), perPortion: round2(total / Math.max(1, r?.portions || 1)) }
}

/** Wareneinsatz und Deckungsbeitrag je Gericht. Speisekartenpreise sind Bruttopreise. */
export function dishOut(d) {
  const cost = d.recipe_id ? recipeCost(d.recipe_id).perPortion : null
  const net = round2(d.price / (1 + d.vat / 100))
  return {
    ...d,
    allergens: JSON.parse(d.allergens),
    active: !!d.active,
    netPrice: net,
    costPerPortion: cost,
    foodCostPct: cost != null && net > 0 ? Math.round((cost / net) * 1000) / 10 : null,
    contribution: cost != null ? round2(net - cost) : null,
  }
}

/** Tisch automatisch wählen: kleinster passender Tisch ohne überschneidende Reservierung. */
export function suggestTable(restaurant, { date, time, guests, excludeId = 0 }) {
  const slot = restaurant.slot_minutes
  const busy = new Set(all("SELECT table_id, time FROM gastro_reservations WHERE restaurant_id = ? AND date = ? AND table_id IS NOT NULL AND status IN ('confirmed','seated') AND id != ?", restaurant.id, date, excludeId)
    .filter((x) => Math.abs(minutes(x.time) - minutes(time)) < slot).map((x) => x.table_id))
  return all('SELECT * FROM gastro_tables WHERE restaurant_id = ? AND seats >= ? ORDER BY seats, number', restaurant.id, guests).find((t) => !busy.has(t.id)) || null
}

export function tableConflict(restaurant, { tableId, date, time, excludeId = 0 }) {
  return all("SELECT * FROM gastro_reservations WHERE restaurant_id = ? AND date = ? AND table_id = ? AND status IN ('confirmed','seated') AND id != ?", restaurant.id, date, tableId, excludeId)
    .find((x) => Math.abs(minutes(x.time) - minutes(time)) < restaurant.slot_minutes) || null
}

export function addDays(date, n) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Personalbedarf je Tag aus Reservierungen: aufgerundet Gäste ÷ Gäste pro Kraft, mindestens 1 an Öffnungstagen. */
export function staffing(restaurant, weekStart) {
  const open = JSON.parse(restaurant.open_days)
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
    const g = one("SELECT COALESCE(SUM(guests), 0) AS g, COUNT(*) AS n FROM gastro_reservations WHERE restaurant_id = ? AND date = ? AND status NOT IN ('cancelled','no_show')", restaurant.id, date)
    const isOpen = open.includes(weekday)
    return {
      date,
      open: isOpen,
      reservations: g.n,
      guests: g.g,
      service: isOpen ? Math.max(1, Math.ceil(g.g / restaurant.guests_per_service)) : 0,
      kitchen: isOpen ? Math.max(1, Math.ceil(g.g / restaurant.guests_per_kitchen)) : 0,
      note: !isOpen ? 'Ruhetag' : g.n ? `${g.n} Reservierung${g.n === 1 ? "" : "en"}` : 'Keine Reservierungen — Grundbesetzung, Laufkundschaft selbst einschätzen',
    }
  })
}

export function revenue(restaurantId, from, to) {
  const rows = all('SELECT day, COUNT(*) AS n, SUM(gross) AS gross, SUM(COALESCE(net, 0)) AS net, SUM(tip) AS tip FROM gastro_receipts WHERE restaurant_id = ? AND day BETWEEN ? AND ? GROUP BY day ORDER BY day', restaurantId, from, to)
  const sum = (k) => round2(rows.reduce((s, x) => s + (x[k] || 0), 0))
  const transactions = rows.reduce((s, x) => s + x.n, 0)
  const gross = sum('gross')
  const payments = all("SELECT COALESCE(payment, 'unbekannt') AS payment, COUNT(*) AS n, SUM(gross) AS gross FROM gastro_receipts WHERE restaurant_id = ? AND day BETWEEN ? AND ? GROUP BY 1 ORDER BY 3 DESC", restaurantId, from, to)
  return {
    from, to, transactions, gross, net: sum('net'), tips: sum('tip'),
    averageTicket: transactions ? round2(gross / transactions) : 0,
    daily: rows.map((x) => ({ date: x.day, gross: round2(x.gross), transactions: x.n })),
    payments: payments.map((p) => ({ ...p, gross: round2(p.gross) })),
  }
}

export function feedbackStatus(rating) {
  return rating <= 2 ? 'needs_attention' : 'open'
}
