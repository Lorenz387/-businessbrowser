// Kontosicherheit: Zwei-Faktor-Anmeldung, aktive Sitzungen, Sicherheitsprotokoll.
import { useEffect, useState } from 'react'
import { post, del } from '../lib/api.js'
import { useApi, useAction } from '../lib/hooks.js'
import { useAuth } from '../lib/auth.jsx'
import { formatDateTime } from '../lib/format.js'
import { Badge, Button, Card, Field, Input, InlineError, Loading, Modal, Section, useToast } from './ui.jsx'

const device = (ua) => {
  if (!ua) return 'Unbekanntes Gerät'
  const os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''
  const br = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : ''
  return [br, os].filter(Boolean).join(' auf ') || ua.slice(0, 40)
}
const utc = (s) => (s && !s.includes('T') ? `${s.replace(' ', 'T')}Z` : s)

export default function SecuritySection() {
  const { refresh } = useAuth()
  const toast = useToast()
  const tfa = useApi('/auth/2fa')
  const sessions = useApi('/auth/sessions')
  const log = useApi('/auth/security-log')
  const [setup, setSetup] = useState(false)
  const [disabling, setDisabling] = useState(false)
  const [codes, setCodes] = useState(null)
  const [showLog, setShowLog] = useState(false)
  const reloadAll = () => { tfa.reload(); sessions.reload(); log.reload(); refresh() }

  return (
    <>
      <Section title="Sicherheit">
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-48">
              <p className="font-medium">Zwei-Faktor-Anmeldung</p>
              <p className="text-sm text-muted">Zusätzlich zum Passwort ein Code aus einer Authenticator-App (z. B. Google oder Microsoft Authenticator, 1Password, Aegis).</p>
            </div>
            {tfa.data && <Badge tone={tfa.data.enabled ? 'ok' : 'warn'}>{tfa.data.enabled ? 'Aktiv' : 'Nicht aktiv'}</Badge>}
            {tfa.data && (tfa.data.enabled
              ? <Button variant="ghost" onClick={() => setDisabling(true)}>Deaktivieren</Button>
              : <Button variant="primary" onClick={() => setSetup(true)}>Einrichten</Button>)}
          </div>
          {tfa.data?.enabled && <p className="text-xs text-muted mt-3">Noch {tfa.data.recoveryCodesLeft} von 10 Wiederherstellungscodes übrig.{tfa.data.recoveryCodesLeft < 4 ? ' Erzeuge neue, bevor sie ausgehen.' : ''} <RegenerateCodes onCodes={(c) => { setCodes(c); tfa.reload() }} /></p>}
        </Card>
      </Section>

      <Section title="Angemeldete Geräte" action={sessions.data?.length > 1 && <Button size="sm" variant="ghost" onClick={() => del('/auth/sessions').then(() => { toast('Alle anderen Geräte wurden abgemeldet.'); sessions.reload(); log.reload() })}>Alle anderen abmelden</Button>}>
        {sessions.loading ? <Loading /> : (
          <Card className="divide-y divide-line">
            {(sessions.data || []).map((x) => (
              <div key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="flex-1 min-w-48">
                  <p className="font-medium">{device(x.userAgent)} {x.current && <Badge tone="ok" className="ml-1">Dieses Gerät</Badge>}</p>
                  <p className="text-xs text-muted">Zuletzt aktiv {x.lastSeenAt ? formatDateTime(x.lastSeenAt) : '–'}{x.ip ? ` · IP ${x.ip}` : ''}{x.createdAt ? ` · angemeldet ${formatDateTime(x.createdAt)}` : ''}</p>
                </div>
                {!x.current && <Button size="sm" variant="ghost" onClick={() => del(`/auth/sessions/${x.id}`).then(() => { sessions.reload(); log.reload() })}>Abmelden</Button>}
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Section title="Sicherheitsprotokoll" action={<Button size="sm" variant="ghost" onClick={() => setShowLog(!showLog)}>{showLog ? 'Ausblenden' : 'Anzeigen'}</Button>}>
        {showLog && (log.data?.length ? (
          <Card className="divide-y divide-line max-h-80 overflow-y-auto">
            {log.data.map((x) => (
              <div key={x.id} className="flex flex-wrap gap-3 px-4 py-2 text-sm">
                <span className={x.action === 'auth.login_failed' ? 'text-bad flex-1' : 'flex-1'}>{x.label}</span>
                <span className="text-xs text-muted">{formatDateTime(utc(x.created_at))}{x.ip ? ` · ${x.ip}` : ''}</span>
              </div>
            ))}
          </Card>
        ) : <p className="text-sm text-muted">Noch keine Einträge.</p>)}
      </Section>

      {setup && <SetupTwoFactor onClose={() => setSetup(false)} onEnabled={(c) => { setSetup(false); setCodes(c); reloadAll() }} />}
      {disabling && <DisableTwoFactor onClose={() => setDisabling(false)} onDone={() => { setDisabling(false); toast('Zwei-Faktor-Anmeldung deaktiviert.'); reloadAll() }} />}
      {codes && <RecoveryCodes codes={codes} onClose={() => setCodes(null)} />}
    </>
  )
}

function SetupTwoFactor({ onClose, onEnabled }) {
  const [data, setData] = useState(null)
  const [code, setCode] = useState('')
  const start = useAction()
  const confirm = useAction()
  const { run: runStart } = start
  useEffect(() => { runStart(() => post('/auth/2fa/setup')).then(setData).catch(() => {}) }, [runStart])
  return (
    <Modal open onClose={onClose} title="Zwei-Faktor-Anmeldung einrichten"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={confirm.pending} disabled={!/^\d{6}$/.test(code.trim())} onClick={() => confirm.run(() => post('/auth/2fa/enable', { code: code.trim() })).then((r) => onEnabled(r.recoveryCodes)).catch(() => {})}>Aktivieren</Button></>}>
      {!data ? (start.error ? <InlineError error={start.error} /> : <Loading />) : (
        <>
          <ol className="text-sm space-y-1 list-decimal pl-5 mb-4">
            <li>Öffne deine Authenticator-App und scanne den QR-Code.</li>
            <li>Gib den angezeigten 6-stelligen Code ein.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-white p-2 rounded-lg border border-line" aria-label="QR-Code für die Authenticator-App" dangerouslySetInnerHTML={{ __html: data.qrSvg }} />
            <div className="text-xs text-muted min-w-0">
              <p>QR-Code geht nicht? Schlüssel manuell eingeben:</p>
              <code className="block mt-1 break-all rounded bg-subtle px-2 py-1 text-ink">{data.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
            </div>
          </div>
          <div className="mt-4"><Field label="Code aus der App">{(id) => <Input id={id} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="w-40" />}</Field></div>
          <InlineError error={confirm.error} />
        </>
      )}
    </Modal>
  )
}

function DisableTwoFactor({ onClose, onDone }) {
  const [f, setF] = useState({ password: '', code: '' })
  const { pending, error, run } = useAction()
  return (
    <Modal open onClose={onClose} title="Zwei-Faktor-Anmeldung deaktivieren"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="danger" loading={pending} disabled={!f.password || !f.code} onClick={() => run(() => post('/auth/2fa/disable', f)).then(onDone).catch(() => {})}>Deaktivieren</Button></>}>
      <p className="text-sm text-muted mb-4">Dein Konto ist danach nur noch durch das Passwort geschützt.</p>
      <Field label="Passwort">{(id) => <Input id={id} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />}</Field>
      <Field label="Aktueller Code aus der App">{(id) => <Input id={id} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} inputMode="numeric" />}</Field>
      <InlineError error={error} />
    </Modal>
  )
}

function RegenerateCodes({ onCodes }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const { pending, error, run } = useAction()
  return (
    <>
      <button className="text-accent hover:underline" onClick={() => setOpen(true)}>Neue Codes erzeugen</button>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Neue Wiederherstellungscodes"
          footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!code} onClick={() => run(() => post('/auth/2fa/recovery-codes', { code })).then((r) => { setOpen(false); onCodes(r.recoveryCodes) }).catch(() => {})}>Erzeugen</Button></>}>
          <p className="text-sm text-muted mb-4">Die bisherigen Codes werden ungültig.</p>
          <Field label="Aktueller Code aus der App">{(id) => <Input id={id} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />}</Field>
          <InlineError error={error} />
        </Modal>
      )}
    </>
  )
}

function RecoveryCodes({ codes, onClose }) {
  const text = codes.join('\n')
  return (
    <Modal open onClose={onClose} title="Wiederherstellungscodes sichern"
      footer={<Button variant="primary" onClick={onClose}>Ich habe die Codes gesichert</Button>}>
      <p className="text-sm text-ink-2 mb-3">Mit jedem Code kannst du dich <b>einmal</b> anmelden, falls du keinen Zugriff auf deine Authenticator-App hast. Sie werden nur jetzt angezeigt — speichere sie an einem sicheren Ort (z. B. Passwort-Manager).</p>
      <pre className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg border border-line bg-subtle p-3 font-mono text-sm">{codes.map((c) => <span key={c}>{c}</span>)}</pre>
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={() => navigator.clipboard?.writeText(text)}>Kopieren</Button>
        <Button size="sm" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`JunisWorld Wiederherstellungscodes\n\n${text}\n`], { type: 'text/plain' })); a.download = 'junisworld-wiederherstellungscodes.txt'; a.click() }}>Als Datei speichern</Button>
      </div>
    </Modal>
  )
}
