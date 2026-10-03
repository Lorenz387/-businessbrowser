// Arbeitsbereiche: Jede Anfrage läuft entweder im privaten Bereich der Person oder im Bereich eines Unternehmens
// (Header „X-Junis-Workspace: private | org:<id>“). Firmendaten gehören dem Unternehmen, private Daten bleiben privat.
import { db, one, all, run, addColumn } from '../db.js'
import { ApiError, forbidden } from './http.js'

db.exec(`
CREATE TABLE IF NOT EXISTS org_apps (
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, app_id)
);
`)
addColumn('organizations', 'require_2fa', 'INTEGER NOT NULL DEFAULT 0')

/** Apps of the ecosystem. `org`: usable in a company workspace; private-only apps stay with the person. */
export const APPS = {
  contracts: { name: 'Fristen- & Kündigungsmanager', org: true },
  accessibility: { name: 'Barrierefreiheit-Scanner', org: true },
  gastro: { name: 'GastroFlow', org: true },
  talent: { name: 'Talent (Ausschreibungen)', org: true },
  'personal-ai': { name: 'PersonalAI', org: false },
}

export const ORG_WRITE_ROLES = ['owner', 'admin', 'manager']

export function appEnabled(orgId, appId) {
  const row = one('SELECT enabled FROM org_apps WHERE org_id = ? AND app_id = ?', orgId, appId)
  return row ? !!row.enabled : true
}

export function orgAppList(orgId) {
  return Object.entries(APPS).map(([id, a]) => ({ id, name: a.name, orgCapable: a.org, enabled: a.org ? appEnabled(orgId, id) : false }))
}

/** Resolves the workspace of the request. Throws when the user is not a member or the org policy is not met. */
export function resolveWorkspace(req) {
  if (req._ws) return req._ws
  // Header for API calls; `ws` query parameter only for plain GET downloads (e.g. calendar files).
  const raw = String(req.headers['x-junis-workspace'] || (req.method === 'GET' ? req.query.ws : '') || 'private')
  const m = /^org:(\d+)$/.exec(raw)
  if (!m) return (req._ws = { type: 'private', orgId: null, role: null })
  const org = one('SELECT o.id, o.name, o.kind, o.require_2fa, om.role FROM org_members om JOIN organizations o ON o.id = om.org_id WHERE om.org_id = ? AND om.user_id = ?', Number(m[1]), req.user.id)
  if (!org) throw new ApiError(403, 'workspace_forbidden', 'Du gehörst diesem Unternehmen nicht (mehr) an. Wechsle in einen anderen Arbeitsbereich.')
  if (org.require_2fa && !req.user.totp_enabled) {
    throw new ApiError(403, 'two_factor_required', `„${org.name}“ verlangt die Zwei-Faktor-Anmeldung. Richte sie unter Account → Sicherheit ein.`)
  }
  return (req._ws = { type: 'org', orgId: org.id, orgName: org.name, role: org.role })
}

/**
 * Workspace scope for an app. `where(alias)` returns a SQL condition + params that selects exactly the records
 * of the current workspace; `orgId` goes into new records; `canWrite` reflects the role.
 */
export function appScope(req, appId) {
  const ws = resolveWorkspace(req)
  if (ws.type === 'org') {
    if (!APPS[appId]?.org) throw new ApiError(400, 'private_only', `${APPS[appId]?.name || 'Diese App'} ist nur im privaten Bereich verfügbar.`)
    if (!appEnabled(ws.orgId, appId)) throw new ApiError(403, 'app_disabled', `${APPS[appId].name} ist für „${ws.orgName}“ nicht freigegeben. Admins können die App unter Business → Verwaltung freischalten.`)
  }
  const uid = req.user.id
  return {
    ...ws,
    canWrite: ws.type === 'private' || ORG_WRITE_ROLES.includes(ws.role),
    where: (alias = '', userCol = 'user_id') => (ws.type === 'org' ? [`${alias}org_id = ?`, [ws.orgId]] : [`${alias}${userCol} = ? AND ${alias}org_id IS NULL`, [uid]]),
    requireWrite() {
      if (!this.canWrite) throw forbidden('Im Unternehmensbereich dürfen nur Owner, Admins und Manager Daten ändern. Du hast Lesezugriff.')
    },
  }
}

/** For direct links to a company record: app must be enabled and the 2FA policy met. */
export function assertOrgApp(user, orgId, appId) {
  const org = one('SELECT name, require_2fa FROM organizations WHERE id = ?', orgId)
  if (!org) return
  if (!appEnabled(orgId, appId)) throw new ApiError(403, 'app_disabled', `${APPS[appId].name} ist für „${org.name}“ nicht freigegeben.`)
  if (org.require_2fa && !user.totp_enabled) throw new ApiError(403, 'two_factor_required', `„${org.name}“ verlangt die Zwei-Faktor-Anmeldung. Richte sie unter Account → Sicherheit ein.`)
}

/** People to notify about a record: the creator for private records, owners/admins/managers for company records. */
export function recipientsFor(record, userCol = 'user_id') {
  if (!record.org_id) return [record[userCol]]
  return all(`SELECT user_id FROM org_members WHERE org_id = ? AND role IN ('owner','admin','manager')`, record.org_id).map((x) => x.user_id)
}

/** Role in an org (or null). */
export const orgRole = (orgId, userId) => one('SELECT role FROM org_members WHERE org_id = ? AND user_id = ?', orgId, userId)?.role ?? null

/** Tables whose records can belong to a company workspace, with the column of the person who created them. */
export const ORG_SCOPED = [['contracts', 'user_id'], ['a11y_sites', 'user_id'], ['talent_projects', 'owner_id'], ['gastro_restaurants', 'owner_id'], ['documents', 'user_id']]
// Each app adds `org_id` to its own table right after creating it (see addOrgColumn); documents are core.
export const addOrgColumn = (table) => addColumn(table, 'org_id', 'INTEGER REFERENCES organizations(id) ON DELETE CASCADE')
addOrgColumn('documents')

/** Before an account is deleted: company records stay with the company (handed over to another owner/admin/manager). */
export function handOverOrgRecords(userId) {
  for (const [t, col] of ORG_SCOPED) {
    run(`UPDATE ${t} SET ${col} = (SELECT m.user_id FROM org_members m WHERE m.org_id = ${t}.org_id AND m.user_id != ?
           ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END LIMIT 1)
         WHERE ${col} = ? AND org_id IS NOT NULL
           AND EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = ${t}.org_id AND m.user_id != ?)`, userId, userId, userId)
  }
}
