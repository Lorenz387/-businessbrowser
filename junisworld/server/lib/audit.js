// Zugriffs- und Sicherheitsprotokoll: wer hat wann was getan (Anmeldungen, Rechte, Firmeneinstellungen, Löschungen).
import { db, all, run, parseJSON } from '../db.js'

db.exec(`
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target TEXT,
  meta TEXT,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(org_id, created_at);
`)

export const AUDIT_LABELS = {
  'auth.login': 'Anmeldung',
  'auth.login_failed': 'Fehlgeschlagene Anmeldung',
  'auth.logout': 'Abmeldung',
  'auth.password_changed': 'Passwort geändert',
  'auth.2fa_enabled': 'Zwei-Faktor-Anmeldung aktiviert',
  'auth.2fa_disabled': 'Zwei-Faktor-Anmeldung deaktiviert',
  'auth.recovery_code_used': 'Wiederherstellungscode verwendet',
  'auth.session_revoked': 'Sitzung beendet',
  'account.export': 'Datenexport',
  'org.created': 'Organisation erstellt',
  'org.invite': 'Einladung versendet',
  'org.member_role': 'Rolle geändert',
  'org.member_removed': 'Mitglied entfernt',
  'org.app_toggled': 'App freigegeben/gesperrt',
  'org.policy_changed': 'Sicherheitsrichtlinie geändert',
  'org.deleted_record': 'Firmendatensatz gelöscht',
}

/** Writes an audit entry. Never throws — logging must not break the request. */
export function audit(req, action, { userId, orgId = null, target = null, meta = null } = {}) {
  try {
    run('INSERT INTO audit_log (user_id, org_id, action, target, meta, ip) VALUES (?, ?, ?, ?, ?, ?)',
      userId ?? req?.user?.id ?? null, orgId, action, target, meta ? JSON.stringify(meta) : null, req?.ip ?? null)
  } catch (e) {
    console.error('audit failed', e)
  }
}

const out = (x) => ({ ...x, meta: parseJSON(x.meta, null), label: AUDIT_LABELS[x.action] || x.action })
export const userAudit = (userId, limit = 50) => all('SELECT * FROM audit_log WHERE user_id = ? AND org_id IS NULL ORDER BY id DESC LIMIT ?', userId, limit).map(out)
export const orgAudit = (orgId, limit = 200) => all('SELECT a.*, u.name AS user_name FROM audit_log a LEFT JOIN users u ON u.id = a.user_id WHERE a.org_id = ? ORDER BY a.id DESC LIMIT ?', orgId, limit).map(out)
