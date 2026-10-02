import { useState } from 'react'
import { post, patch, del } from '../../../lib/api.js'
import { useApi, useAction } from '../../../lib/hooks.js'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, Select, Stat, Textarea, useToast } from '../../../components/ui.jsx'
import { useGastro, dayLabel } from './shared.jsx'

const STATUS = { needs_attention: ['bad', 'Aufmerksamkeit nötig'], open: ['warn', 'Offen'], handled: ['ok', 'Beantwortet'] }
const template = (f, name) => (f.rating >= 4
  ? `Vielen Dank für Ihre freundliche Bewertung${f.guest_name ? `, ${f.guest_name}` : ''}! Es freut uns sehr, dass es Ihnen bei uns gefallen hat. Wir freuen uns auf Ihren nächsten Besuch. Ihr Team ${name}`
  : `Vielen Dank für Ihre offene Rückmeldung${f.guest_name ? `, ${f.guest_name}` : ''}. Es tut uns leid, dass Ihr Besuch nicht Ihren Erwartungen entsprochen hat. Wir haben Ihren Hinweis im Team besprochen. Gern können Sie uns direkt kontaktieren, damit wir mehr erfahren. Ihr Team ${name}`)

export default function Feedback() {
  const g = useGastro()
  const { data, error, loading, reload, hardReload } = useApi(`${g.base}/feedback`)
  const [adding, setAdding] = useState(false)
  const [answering, setAnswering] = useState(null)
  const canWrite = g.permissions.floor.write
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Das Feedback" onRetry={hardReload} />
  const avg = data.length ? Math.round((data.reduce((s, f) => s + f.rating, 0) / data.length) * 10) / 10 : null
  return (
    <>
      <Card className="p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        <Stat label="Bewertungen" value={data.length} />
        <Stat label="Durchschnitt" value={avg != null ? `${avg.toLocaleString('de-DE')} ★` : '–'} />
        <Stat label="Aufmerksamkeit nötig" value={data.filter((f) => f.status === 'needs_attention').length} hint="1–2 Sterne" />
        <Stat label="Offen" value={data.filter((f) => f.status !== 'handled').length} />
      </Card>
      <div className="flex justify-end mb-4">{canWrite && <Button variant="primary" onClick={() => setAdding(true)}>Feedback erfassen</Button>}</div>
      {data.length ? (
        <Card className="divide-y divide-line">
          {data.map((f) => (
            <div key={f.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-warn" aria-label={`${f.rating} von 5 Sternen`}>{'★'.repeat(f.rating)}<span className="text-faint">{'★'.repeat(5 - f.rating)}</span></span>
                <span className="text-sm font-medium">{f.guest_name || 'Gast'}</span>
                <span className="text-xs text-muted">{g.channels[f.channel]} · {dayLabel(f.created_at.slice(0, 10), { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span className="flex-1" />
                <Badge tone={STATUS[f.status][0]}>{STATUS[f.status][1]}</Badge>
              </div>
              {f.comment && <p className="text-sm mt-1.5">{f.comment}</p>}
              {f.response && <p className="text-sm text-muted mt-2 border-l-2 border-line pl-3">Antwort: {f.response}</p>}
              {canWrite && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => setAnswering(f)}>{f.response ? 'Antwort bearbeiten' : 'Antworten'}</Button>
                  <button onClick={() => del(`${g.base}/feedback/${f.id}`).then(reload)} className="text-xs text-faint hover:text-bad">Löschen</button>
                </div>
              )}
            </div>
          ))}
        </Card>
      ) : <EmptyState title="Noch keine Gästestimmen." text="Erfasse Rückmeldungen von vor Ort, Google, E-Mail oder Telefon. Bewertungen mit 1–2 Sternen werden automatisch markiert." action={canWrite && <Button variant="primary" onClick={() => setAdding(true)}>Feedback erfassen</Button>} />}
      <p className="text-xs text-muted mt-3">GastroFlow veröffentlicht keine Antworten selbst. Kopiere die Antwort in das jeweilige Portal (z. B. Google-Unternehmensprofil).</p>
      {adding && <AddFeedback onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload() }} />}
      {answering && <Answer fb={answering} onClose={() => setAnswering(null)} onSaved={() => { setAnswering(null); reload() }} />}
    </>
  )
}

function AddFeedback({ onClose, onSaved }) {
  const g = useGastro()
  const [f, setF] = useState({ guestName: '', rating: 5, comment: '', channel: 'vor_ort' })
  const { pending, error, run } = useAction()
  const set = (x) => setF((y) => ({ ...y, ...x }))
  return (
    <Modal open onClose={onClose} title="Feedback erfassen"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} onClick={() => run(() => post(`${g.base}/feedback`, f)).then(onSaved).catch(() => {})}>Speichern</Button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
        <Field label="Gast" optional>{(id) => <Input id={id} value={f.guestName} onChange={(e) => set({ guestName: e.target.value })} />}</Field>
        <Field label="Sterne">{(id) => <Select id={id} value={f.rating} onChange={(e) => set({ rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}</Select>}</Field>
        <Field label="Kanal">{(id) => <Select id={id} value={f.channel} onChange={(e) => set({ channel: e.target.value })}>{Object.entries(g.channels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
      </div>
      <Field label="Kommentar" optional>{(id) => <Textarea id={id} value={f.comment} onChange={(e) => set({ comment: e.target.value })} />}</Field>
      <InlineError error={error} />
    </Modal>
  )
}

function Answer({ fb, onClose, onSaved }) {
  const g = useGastro()
  const toast = useToast()
  const [text, setText] = useState(fb.response || '')
  const save = useAction()
  const ai = useAction()
  return (
    <Modal open onClose={onClose} title="Antwort vorbereiten" width="max-w-xl"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={save.pending} disabled={!text.trim()} onClick={() => save.run(() => patch(`${g.base}/feedback/${fb.id}`, { response: text, status: 'handled' })).then(onSaved).catch(() => {})}>Als beantwortet speichern</Button></>}>
      <p className="text-sm text-muted mb-3">„{fb.comment || 'ohne Text'}“ — {fb.rating}/5</p>
      <div className="flex flex-wrap gap-2 mb-3">
        <Button size="sm" onClick={() => setText(template(fb, g.restaurant.name))}>Vorlage einsetzen</Button>
        {g.aiAvailable && <Button size="sm" loading={ai.pending} onClick={() => ai.run(() => post(`${g.base}/feedback/${fb.id}/draft`)).then((r) => setText(r.response)).catch(() => {})}>Entwurf mit KI</Button>}
        {text && <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(text).then(() => toast('Kopiert.'))}>Kopieren</Button>}
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-40" aria-label="Antwort" />
      <InlineError error={ai.error || save.error} />
    </Modal>
  )
}
