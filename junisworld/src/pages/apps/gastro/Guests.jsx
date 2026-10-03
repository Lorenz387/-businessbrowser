import { useState } from 'react'
import { post, patch, del } from '../../../lib/api.js'
import { useApi, useAction } from '../../../lib/hooks.js'
import { Badge, Button, Card, Checkbox, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, Textarea, useConfirm } from '../../../components/ui.jsx'
import { useGastro, dayLabel } from './shared.jsx'

export default function Guests() {
  const g = useGastro()
  const [q, setQ] = useState('')
  const { data, error, loading, reload, hardReload } = useApi(`${g.base}/guests${q.trim().length > 1 ? `?q=${encodeURIComponent(q.trim())}` : ''}`, [q])
  const [editing, setEditing] = useState(null)
  const [confirm, dialog] = useConfirm()
  const canWrite = g.permissions.floor.write
  const remove = async (x) => {
    if (!(await confirm({ title: `${x.name} löschen?`, text: 'Das Gästeprofil wird gelöscht. Reservierungen bleiben ohne Profilverknüpfung erhalten.', confirmLabel: 'Löschen', danger: true }))) return
    del(`${g.base}/guests/${x.id}`).then(reload)
  }
  return (
    <>
      {dialog}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, Telefon oder E-Mail suchen" className="max-w-sm" aria-label="Gäste suchen" />
        <span className="flex-1" />
        {canWrite && <Button variant="primary" onClick={() => setEditing({})}>Gast anlegen</Button>}
      </div>
      {error ? <ErrorState error={error} what="Die Gästeliste" onRetry={hardReload} /> : loading && !data ? <Loading /> : data.length ? (
        <Card className="divide-y divide-line">
          {data.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="size-9 rounded-full bg-subtle grid place-items-center text-sm font-semibold">{x.name.slice(0, 1).toUpperCase()}</div>
              <div className="flex-1 min-w-48">
                <p className="text-sm font-medium">{x.name}</p>
                <p className="text-xs text-muted">{[x.phone, x.email].filter(Boolean).join(' · ') || 'Kein Kontakt hinterlegt'}{x.last_visit ? ` · zuletzt ${dayLabel(x.last_visit, { day: '2-digit', month: '2-digit', year: 'numeric' })}` : ''}</p>
              </div>
              {x.allergies && <Badge tone="warn">Allergien: {x.allergies}</Badge>}
              <Badge>{x.visits} Besuch{x.visits === 1 ? '' : 'e'}</Badge>
              {x.no_shows > 0 && <Badge tone="bad">{x.no_shows}× nicht erschienen</Badge>}
              {x.marketing_consent ? <Badge tone="ok">Werbeeinwilligung</Badge> : null}
              {canWrite && <Button size="sm" variant="ghost" onClick={() => setEditing(x)}>Bearbeiten</Button>}
              {canWrite && <button onClick={() => remove(x)} className="text-xs text-faint hover:text-bad">Löschen</button>}
            </div>
          ))}
        </Card>
      ) : <EmptyState title={q ? 'Keine Treffer.' : 'Noch keine Gästeprofile.'} text="Profile entstehen hier oder beim Anlegen einer Reservierung. Besuche zählen automatisch aus platzierten und abgeschlossenen Reservierungen." action={canWrite && !q && <Button variant="primary" onClick={() => setEditing({})}>Gast anlegen</Button>} />}
      <p className="text-xs text-muted mt-3">Datenschutz: Speichere nur, was für den Betrieb nötig ist. Allergieangaben sind Gesundheitsdaten — nur mit ausdrücklicher Einwilligung des Gastes erfassen. Werbung (z. B. Newsletter) nur mit dokumentierter Einwilligung.</p>
      {editing && <GuestForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    </>
  )
}

function GuestForm({ initial, onClose, onSaved }) {
  const g = useGastro()
  const [f, setF] = useState({ name: initial.name || '', phone: initial.phone || '', email: initial.email || '', allergies: initial.allergies || '', notes: initial.notes || '', marketingConsent: !!initial.marketing_consent })
  const { pending, error, run } = useAction()
  const set = (x) => setF((y) => ({ ...y, ...x }))
  return (
    <Modal open onClose={onClose} title={initial.id ? 'Gast bearbeiten' : 'Gast anlegen'}
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!f.name.trim()} onClick={() => run(() => (initial.id ? patch(`${g.base}/guests/${initial.id}`, f) : post(`${g.base}/guests`, f))).then(onSaved).catch(() => {})}>Speichern</Button></>}>
      <Field label="Name">{(id) => <Input id={id} value={f.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
        <Field label="Telefon" optional>{(id) => <Input id={id} value={f.phone} onChange={(e) => set({ phone: e.target.value })} />}</Field>
        <Field label="E-Mail" optional>{(id) => <Input id={id} type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} />}</Field>
      </div>
      <Field label="Allergien / Unverträglichkeiten" optional hint="Nur mit Einwilligung des Gastes.">{(id) => <Input id={id} value={f.allergies} onChange={(e) => set({ allergies: e.target.value })} placeholder="z. B. Erdnüsse, Laktose" />}</Field>
      <Field label="Notizen" optional>{(id) => <Textarea id={id} value={f.notes} onChange={(e) => set({ notes: e.target.value })} className="min-h-16" placeholder="z. B. Lieblingstisch am Fenster" />}</Field>
      <Checkbox label="Einwilligung zu Werbung liegt vor" checked={f.marketingConsent} onChange={(v) => set({ marketingConsent: v })} />
      <InlineError error={error} />
    </Modal>
  )
}
