// Verbindung der Apps: Jede App beantwortet für den aktuellen Arbeitsbereich (privat oder Firma) und die Rolle der Person
// drei Fragen — Überblick (Cockpit), Suche und Kontext für Junis AI. Nichts verlässt dabei die Rechte der Person.
import { one, all } from '../db.js'
import { APPS, appEnabled, ORG_WRITE_ROLES } from './workspace.js'
import { contractOut, fmtDate } from '../apps/contracts/service.js'
import { membership, permissions, revenue } from '../apps/gastro/service.js'
import { projectOut } from '../apps/talent/service.js'

const todayIn = (tz) => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()) } catch { return new Date().toISOString().slice(0, 10) } }
const eur = (n) => (n == null ? '–' : n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }))
const like = (q) => `%${String(q).toLowerCase()}%`

/** Scope condition for tables with org_id + a creator column. */
const scopeWhere = (ctx, col = 'user_id', alias = '') => (ctx.type === 'org' ? [`${alias}org_id = ?`, [ctx.orgId]] : [`${alias}${col} = ? AND ${alias}org_id IS NULL`, [ctx.userId]])
const canManage = (ctx) => ctx.type === 'private' || ORG_WRITE_ROLES.includes(ctx.role)

// ---------- Fristen-Manager ----------
const contracts = {
  id: 'contracts',
  link: '/apps/contracts',
  list(ctx) {
    const [w, p] = scopeWhere(ctx)
    return all(`SELECT * FROM contracts WHERE ${w} AND status = 'active'`, ...p).map(contractOut)
  },
  summary(ctx) {
    const list = this.list(ctx)
    const items = list.filter((c) => ['missed', 'urgent', 'soon'].includes(c.urgency)).sort((a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9)).map((c) => ({
      title: `Kündigungsfrist: ${c.title}`,
      detail: c.urgency === 'missed' ? `Frist am ${fmtDate(c.cancelBy)} verpasst` : `bis ${fmtDate(c.cancelBy)} — noch ${c.daysLeft} Tage${c.annualCost ? ` · ${eur(c.annualCost)}/Jahr` : ''}`,
      link: `/apps/contracts/${c.id}`,
      urgency: c.urgency === 'soon' ? 'medium' : 'high',
      due: c.cancelBy,
    }))
    return {
      stats: [
        { label: 'Aktive Verträge', value: list.length },
        { label: 'Fristen ≤ 30 Tage', value: list.filter((c) => c.urgency === 'urgent' || c.urgency === 'missed').length },
        { label: 'Kosten pro Jahr', value: eur(list.reduce((s, c) => s + (c.annualCost || 0), 0)) },
      ],
      items,
    }
  },
  search(ctx, q) {
    const [w, p] = scopeWhere(ctx)
    return all(`SELECT id, title, counterparty FROM contracts WHERE ${w} AND (lower(title) LIKE ? OR lower(counterparty) LIKE ? OR lower(notes) LIKE ?) LIMIT 6`, ...p, like(q), like(q), like(q))
      .map((c) => ({ type: 'Vertrag', title: c.title, subtitle: c.counterparty, href: `/apps/contracts/${c.id}` }))
  },
  aiContext(ctx) {
    const list = this.list(ctx)
    if (!list.length) return ''
    return `Verträge (Fristen-Manager):\n${list.slice(0, 40).map((c) => `- ${c.title}${c.counterparty ? ` (${c.counterparty})` : ''}: ${c.cancelBy ? `kündigen bis ${fmtDate(c.cancelBy)} (noch ${c.daysLeft} Tage)` : 'Frist unbekannt'}${c.auto_renew ? `, verlängert sich um ${c.renewal_months} Monate` : ''}${c.annualCost ? `, ${eur(c.annualCost)}/Jahr` : ''}${c.owner ? `, zuständig: ${c.owner}` : ''}`).join('\n')}`
  },
}

// ---------- Barrierefreiheit-Scanner ----------
const accessibility = {
  id: 'accessibility',
  link: '/apps/accessibility',
  list(ctx) {
    const [w, p] = scopeWhere(ctx)
    return all(`SELECT s.*, (SELECT score FROM a11y_scans WHERE site_id = s.id AND status = 'done' ORDER BY id DESC LIMIT 1) AS score,
      (SELECT counts FROM a11y_scans WHERE site_id = s.id AND status = 'done' ORDER BY id DESC LIMIT 1) AS counts,
      (SELECT id FROM a11y_scans WHERE site_id = s.id AND status = 'done' ORDER BY id DESC LIMIT 1) AS scan_id
      FROM a11y_sites s WHERE ${w}`, ...p).map((s) => ({ ...s, counts: JSON.parse(s.counts || '{}') }))
  },
  summary(ctx) {
    const sites = this.list(ctx)
    const scored = sites.filter((s) => s.score != null)
    return {
      stats: [
        { label: 'Websites', value: sites.length },
        { label: 'Ø Score', value: scored.length ? Math.round(scored.reduce((a, s) => a + s.score, 0) / scored.length) : '–' },
        { label: 'Kritische Barrieren', value: sites.reduce((a, s) => a + (s.counts.critical || 0), 0) },
      ],
      items: sites.filter((s) => s.counts.critical).map((s) => ({ title: `${s.counts.critical} kritische Barriere(n): ${s.name}`, detail: `Score ${s.score}/100`, link: `/apps/accessibility/scans/${s.scan_id}`, urgency: 'medium' })),
    }
  },
  search(ctx, q) {
    const [w, p] = scopeWhere(ctx)
    return all(`SELECT id, name, url FROM a11y_sites WHERE ${w} AND (lower(name) LIKE ? OR lower(url) LIKE ?) LIMIT 5`, ...p, like(q), like(q))
      .map((s) => ({ type: 'Website', title: s.name, subtitle: s.url, href: `/apps/accessibility/sites/${s.id}` }))
  },
  aiContext(ctx) {
    const sites = this.list(ctx)
    if (!sites.length) return ''
    return `Websites (Barrierefreiheit-Scanner):\n${sites.map((s) => `- ${s.name} (${s.url}): ${s.score != null ? `Score ${s.score}/100, kritisch ${s.counts.critical || 0}, schwer ${s.counts.serious || 0}` : 'noch kein Scan'}`).join('\n')}`
  },
}

// ---------- GastroFlow ----------
const gastro = {
  id: 'gastro',
  link: '/apps/gastro',
  /** Restaurants the person can open in this workspace, with their GastroFlow role. */
  list(ctx) {
    const ids = ctx.type === 'org'
      ? all('SELECT id FROM gastro_restaurants WHERE org_id = ?', ctx.orgId)
      : all('SELECT r.id FROM gastro_restaurants r JOIN gastro_members m ON m.restaurant_id = r.id WHERE m.user_id = ? AND r.org_id IS NULL', ctx.userId)
    const out = []
    for (const { id } of ids) {
      try { out.push(membership(ctx.user, id)) } catch { /* no access */ }
    }
    return out
  },
  facts(m) {
    const r = m.restaurant
    const today = todayIn(r.timezone)
    const p = permissions(m.role)
    const res = one("SELECT COUNT(*) AS n, COALESCE(SUM(guests), 0) AS g FROM gastro_reservations WHERE restaurant_id = ? AND date = ? AND status IN ('confirmed','seated')", r.id, today)
    return {
      r, role: m.role, today, reservations: res.n, guests: res.g,
      reorder: p.kitchen.read ? all('SELECT name, stock, unit FROM gastro_ingredients WHERE restaurant_id = ? AND stock <= reorder_level ORDER BY name', r.id) : [],
      attention: p.floor.read ? one("SELECT COUNT(*) AS n FROM gastro_feedback WHERE restaurant_id = ? AND status = 'needs_attention'", r.id).n : 0,
      revenueToday: p.revenue.read ? revenue(r.id, today, today) : null,
    }
  },
  summary(ctx) {
    const facts = this.list(ctx).map((m) => this.facts(m))
    const items = []
    for (const f of facts) {
      const base = `/apps/gastro/${f.r.id}`
      if (f.reorder.length) items.push({ title: `${f.r.name}: ${f.reorder.length} Zutat(en) nachbestellen`, detail: f.reorder.slice(0, 4).map((i) => `${i.name} (${i.stock} ${i.unit})`).join(', '), link: `${base}/kitchen`, urgency: 'medium' })
      if (f.attention) items.push({ title: `${f.r.name}: ${f.attention} kritische Bewertung(en)`, detail: 'Antwort vorbereiten', link: `${base}/feedback`, urgency: 'medium' })
    }
    const rev = facts.filter((f) => f.revenueToday)
    return {
      stats: [
        { label: 'Restaurants', value: facts.length },
        { label: 'Gäste heute', value: facts.reduce((a, f) => a + f.guests, 0) },
        ...(rev.length ? [{ label: 'Umsatz heute', value: eur(rev.reduce((a, f) => a + f.revenueToday.gross, 0)) }] : []),
      ],
      items,
    }
  },
  search(ctx, q) {
    const out = []
    for (const m of this.list(ctx)) {
      if (m.restaurant.name.toLowerCase().includes(String(q).toLowerCase())) out.push({ type: 'Restaurant', title: m.restaurant.name, subtitle: m.restaurant.address, href: `/apps/gastro/${m.restaurant.id}` })
      for (const d of all('SELECT name, category FROM gastro_dishes WHERE restaurant_id = ? AND lower(name) LIKE ? LIMIT 3', m.restaurant.id, like(q))) out.push({ type: 'Gericht', title: d.name, subtitle: `${m.restaurant.name} · ${d.category}`, href: `/apps/gastro/${m.restaurant.id}/menu` })
    }
    return out.slice(0, 8)
  },
  aiContext(ctx) {
    const facts = this.list(ctx).map((m) => this.facts(m))
    if (!facts.length) return ''
    return `Restaurants (GastroFlow):\n${facts.map((f) => `- ${f.r.name} (deine Rolle: ${f.role}): heute ${f.reservations} Reservierungen, ${f.guests} Gäste${f.reorder.length ? `; nachbestellen: ${f.reorder.map((i) => i.name).join(', ')}` : ''}${f.attention ? `; ${f.attention} kritische Bewertungen offen` : ''}${f.revenueToday ? `; Umsatz heute ${eur(f.revenueToday.gross)} (${f.revenueToday.transactions} Belege)` : ''}`).join('\n')}`
  },
}

// ---------- Talent (Ausschreibungen) ----------
const talent = {
  id: 'talent',
  link: '/talent?side=company',
  list(ctx) {
    if (!canManage(ctx)) return []
    const [w, p] = scopeWhere(ctx, 'owner_id')
    return all(`SELECT * FROM talent_projects WHERE ${w} AND status = 'open' ORDER BY created_at DESC`, ...p).map((x) => ({
      ...projectOut(x),
      counts: Object.fromEntries(all('SELECT status, COUNT(*) AS n FROM talent_applications WHERE project_id = ? GROUP BY status', x.id).map((c) => [c.status, c.n])),
    }))
  },
  summary(ctx) {
    const list = this.list(ctx)
    return {
      stats: [
        { label: 'Offene Ausschreibungen', value: list.length },
        { label: 'Interessenten', value: list.reduce((a, p) => a + (p.counts.interested || 0), 0) },
        { label: 'Zusagen von Talenten', value: list.reduce((a, p) => a + (p.counts.accepted || 0), 0) },
      ],
      items: list.flatMap((p) => [
        ...(p.counts.interested ? [{ title: `${p.counts.interested} neue Interessent(en): ${p.title}`, detail: 'Profile prüfen und einladen', link: `/talent/projects/${p.id}`, urgency: 'medium' }] : []),
        ...(p.counts.accepted ? [{ title: `${p.counts.accepted} Talent(e) haben angenommen: ${p.title}`, detail: 'Kontaktdaten sind sichtbar — nächster Schritt: Gespräch', link: `/talent/projects/${p.id}`, urgency: 'high' }] : []),
      ]),
    }
  },
  search(ctx, q) {
    if (!canManage(ctx)) return []
    const [w, p] = scopeWhere(ctx, 'owner_id')
    return all(`SELECT id, title, company FROM talent_projects WHERE ${w} AND (lower(title) LIKE ? OR lower(description) LIKE ?) LIMIT 5`, ...p, like(q), like(q))
      .map((x) => ({ type: 'Ausschreibung', title: x.title, subtitle: x.company, href: `/talent/projects/${x.id}` }))
  },
  aiContext(ctx) {
    const list = this.list(ctx)
    if (!list.length) return ''
    return `Ausschreibungen (Talent):\n${list.map((p) => `- ${p.title} (${p.typeLabel}): ${p.counts.matched || 0} passende Talente, ${p.counts.interested || 0} Interessenten, ${p.counts.accepted || 0} angenommen`).join('\n')}`
  },
}

// ---------- Firmenwissen (nur im Firmenbereich) ----------
const knowledge = {
  id: 'knowledge',
  search(ctx, q) {
    if (ctx.type !== 'org') return []
    return all('SELECT id, title FROM org_knowledge WHERE org_id = ? AND (lower(title) LIKE ? OR lower(content) LIKE ?) LIMIT 5', ctx.orgId, like(q), like(q))
      .map((k) => ({ type: 'Firmenwissen', title: k.title, href: `/business/${ctx.orgId}?tab=knowledge` }))
  },
  aiContext(ctx, query = '') {
    if (ctx.type !== 'org') return ''
    const words = [...new Set(String(query).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || [])].slice(0, 8)
    const rows = all('SELECT title, content FROM org_knowledge WHERE org_id = ? ORDER BY created_at DESC LIMIT 50', ctx.orgId)
    if (!rows.length) return ''
    const scored = rows.map((k) => ({ ...k, s: words.filter((w) => `${k.title} ${k.content}`.toLowerCase().includes(w)).length })).sort((a, b) => b.s - a.s)
    return `Firmenwissen (${ctx.orgName}):\n${scored.slice(0, 5).map((k) => `### ${k.title}\n${k.content.slice(0, 1500)}`).join('\n\n')}`
  },
}

export const CONNECTORS = [contracts, accessibility, gastro, talent]

/** Workspace context for connectors. `ws` comes from resolveWorkspace(req). */
export const connectorContext = (req, ws) => ({ ...ws, userId: req.user.id, user: req.user })

const available = (ctx) => CONNECTORS.filter((c) => ctx.type === 'private' || appEnabled(ctx.orgId, c.id))

export function cockpit(ctx) {
  const sections = available(ctx).map((c) => ({ app: c.id, name: APPS[c.id].name, link: c.link, ...c.summary(ctx) }))
  const order = { high: 0, medium: 1, low: 2 }
  const tasks = sections.flatMap((s) => s.items.map((i) => ({ ...i, app: s.name })))
    .sort((a, b) => order[a.urgency] - order[b.urgency] || String(a.due || '9999').localeCompare(String(b.due || '9999')))
  return { sections, tasks }
}

export function searchApps(ctx, q) {
  return [...available(ctx), knowledge].flatMap((c) => c.search(ctx, q))
}

/** Compact, permission-filtered context of the current workspace for Junis AI (max ~12k characters). */
export function aiWorkspaceContext(ctx, query) {
  const parts = [...available(ctx).map((c) => c.aiContext(ctx)), knowledge.aiContext(ctx, query)].filter(Boolean)
  if (!parts.length) return ''
  const head = ctx.type === 'org'
    ? `Arbeitsbereich: Unternehmen „${ctx.orgName}“, Rolle der Person: ${ctx.role}. Nur diese Daten sind für sie freigegeben.`
    : 'Arbeitsbereich: privat. Die folgenden App-Daten gehören der Person selbst.'
  return `${head}\nHeute: ${new Date().toISOString().slice(0, 10)}.\n\n${parts.join('\n\n')}`.slice(0, 12000)
}
