import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, post, patch, del, getWorkspace } from '../../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../../lib/hooks.js'
import { euro } from '../../lib/format.js'
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Section, Select, Stat, Textarea,
  useConfirm, useToast, cx,
} from '../../components/ui.jsx'

const fmt = (s) => (s ? new Date(`${s}T00:00:00Z`).toLocaleDateString('de-DE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : '–')
const URGENCY = {
  missed: ['bad', 'Frist verpasst'],
  urgent: ['bad', 'Dringend'],
  soon: ['warn', 'Bald fällig'],
  none: ['ok', 'Im Plan'],
  incomplete: ['neutral', 'Daten unvollständig'],
  inactive: ['neutral', 'Inaktiv'],
}
const UNIT = { days: 'Tage', weeks: 'Wochen', months: 'Monate' }
const INTERVAL = { monthly: 'monatlich', quarterly: 'quartalsweise', yearly: 'jährlich', once: 'einmalig' }
const STATUS = { active: 'Aktiv', cancelled: 'Gekündigt', ended: 'Beendet' }

export function ContractsHome() {
  useDocumentTitle('Fristen-Manager')
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, loading, reload, hardReload } = useApi('/apps/contracts')
  const [creating, setCreating] = useState(false)
  const [settings, setSettings] = useState(false)
  const fileRef = useRef(null)
  const upload = useAction()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Der Fristen-Manager" onRetry={hardReload} />
  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    upload.run(() => api('/apps/contracts/upload', { method: 'POST', form })).then((r) => { toast('Vertrag hochgeladen.'); navigate(`/apps/contracts/${r.id}?extract=1`) }).catch(() => {}).finally(() => { e.target.value = '' })
  }
  const s = data.summary
  return (
    <>
      <PageHeader back={{ to: '/apps', label: 'Apps' }} title="Fristen- & Kündigungsmanager"
        subtitle="Verträge hochladen, Fristen automatisch auslesen lassen, rechtzeitig vor der Verlängerung gewarnt werden."
        actions={<>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" onChange={onFile} />
          {data.canWrite && <Button variant="primary" onClick={() => fileRef.current?.click()} loading={upload.pending}>Vertrag hochladen</Button>}
          {data.canWrite && <Button onClick={() => setCreating(true)}>Manuell anlegen</Button>}
          <Button variant="ghost" onClick={() => setSettings(true)}>Benachrichtigungen</Button>
        </>} />
      <InlineError error={upload.error} />
      <Card className="p-5 mb-6 grid grid-cols-2 sm:grid-cols-5 gap-6">
        <Stat label="Aktive Verträge" value={s.active} />
        <Stat label="Dringend (≤ 30 Tage)" value={s.urgent} />
        <Stat label="Bald (≤ 90 Tage)" value={s.soon} />
        <Stat label="Unvollständig" value={s.incomplete} hint="Frist nicht berechenbar" />
        <Stat label="Kosten pro Jahr" value={euro(s.annualCost)} hint="aus erfassten Beträgen" />
      </Card>
      {data.contracts.length ? (
        <Card className="divide-y divide-line">
          {data.contracts.map((c) => (
            <Link key={c.id} to={`/apps/contracts/${c.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3.5 hover:bg-subtle/60">
              <div className="flex-1 min-w-48">
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-muted">{c.counterparty || '—'} · {c.categoryLabel}{c.annualCost ? ` · ${euro(c.annualCost)}/Jahr` : ''}</p>
              </div>
              <div className="text-sm text-right">
                {c.cancelBy ? <>Kündigen bis <b>{fmt(c.cancelBy)}</b><span className="block text-xs text-muted">{c.daysLeft === 0 ? 'heute' : c.daysLeft > 0 ? `noch ${c.daysLeft} Tage` : `vor ${-c.daysLeft} Tagen`}</span></> : <span className="text-muted">Frist unbekannt</span>}
              </div>
              <Badge tone={URGENCY[c.urgency][0]}>{URGENCY[c.urgency][1]}</Badge>
            </Link>
          ))}
        </Card>
      ) : <EmptyState title="Noch keine Verträge." text="Lade einen Vertrag als PDF hoch — Junis liest Laufzeit, Kündigungsfrist und Kosten aus. Du prüfst und bestätigst." action={data.canWrite && <Button variant="primary" onClick={() => fileRef.current?.click()}>Vertrag hochladen</Button>} secondary={data.canWrite && <Button onClick={() => setCreating(true)}>Manuell anlegen</Button>} />}
      <p className="text-xs text-muted mt-4">Keine Rechtsberatung. Fristberechnungen beruhen auf den erfassten Angaben; Sonderregeln (z. B. Kündigung nur zum Quartalsende, gesetzliche Fristen) bitte im Vertrag prüfen.</p>
      {creating && <ContractForm categories={data.categories} onClose={() => setCreating(false)} onSaved={(id) => navigate(`/apps/contracts/${id}`)} />}
      {settings && <NotificationSettings configured={data.slackConfigured} onClose={() => { setSettings(false); reload() }} />}
    </>
  )
}

function NotificationSettings({ configured, onClose }) {
  const toast = useToast()
  const [hook, setHook] = useState('')
  const action = useAction()
  return (
    <Modal open onClose={onClose} title="Benachrichtigungen"
      footer={<><Button variant="ghost" onClick={onClose}>Schließen</Button><Button variant="primary" loading={action.pending} onClick={() => action.run(() => api('/apps/contracts-settings', { method: 'PUT', body: { slackWebhook: hook } })).then(() => { toast('Gespeichert.'); onClose() }).catch(() => {})}>Speichern</Button></>}>
      <p className="text-sm text-ink-2 mb-4">Erinnerungen erscheinen immer unter „Mitteilungen“ in JunisWorld. Zusätzlich können sie in einen Slack-Kanal gehen.</p>
      <Field label="Slack Incoming Webhook" hint={configured ? 'Ein Webhook ist gespeichert. Neu eintragen ersetzt ihn, leer speichern entfernt ihn.' : 'In Slack: App „Incoming Webhooks“ hinzufügen, Kanal wählen, URL kopieren.'}>
        {(id) => <Input id={id} value={hook} onChange={(e) => setHook(e.target.value)} placeholder="https://hooks.slack.com/services/…" />}
      </Field>
      {configured && <Button size="sm" onClick={() => action.run(() => post('/apps/contracts-settings/test')).then(() => toast('Testnachricht gesendet.')).catch(() => {})}>Testnachricht senden</Button>}
      <p className="text-xs text-muted mt-4">E-Mail-Versand ist in dieser Installation nicht eingerichtet. Fristen lassen sich zusätzlich als Kalenderdatei exportieren: <a href={`/api/apps/contracts-calendar.ics?ws=${getWorkspace()}`} className="text-accent hover:underline">Kalender (.ics) herunterladen</a>.</p>
      <InlineError error={action.error} />
    </Modal>
  )
}

function ContractForm({ contract, categories, initial, onClose, onSaved }) {
  const src = contract || {}
  const [f, setF] = useState({
    title: src.title || '', counterparty: src.counterparty || '', category: src.category || 'sonstiges', startDate: src.start_date || '', termEnd: src.term_end || '',
    noticeValue: src.notice_value ?? '', noticeUnit: src.notice_unit || 'months', autoRenew: src.auto_renew ?? 1, renewalMonths: src.renewal_months ?? 12,
    costAmount: src.cost_amount ?? '', costInterval: src.cost_interval || 'monthly', owner: src.owner || '', notes: src.notes || '',
    reminderDays: (src.reminder_days || [90, 30, 7]).join(', '), ...initial,
  })
  const action = useAction()
  const set = (p) => setF((x) => ({ ...x, ...p }))
  const save = () => action.run(async () => {
    const body = { ...f, autoRenew: !!Number(f.autoRenew), noticeValue: f.noticeValue === '' ? null : Number(f.noticeValue), costAmount: f.costAmount === '' ? '' : Number(f.costAmount), reminderDays: String(f.reminderDays).split(',').map((x) => Number(x.trim())).filter(Boolean) }
    if (contract) { await patch(`/apps/contracts/${contract.id}`, body); return contract.id }
    return (await post('/apps/contracts', body)).id
  }).then(onSaved).catch(() => {})
  return (
    <Modal open onClose={onClose} title={contract ? 'Vertrag bearbeiten' : 'Vertrag anlegen'} width="max-w-2xl"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" onClick={save} loading={action.pending} disabled={!f.title.trim()}>Speichern</Button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Field label="Titel">{(id) => <Input id={id} value={f.title} onChange={(e) => set({ title: e.target.value })} />}</Field>
        <Field label="Vertragspartner">{(id) => <Input id={id} value={f.counterparty} onChange={(e) => set({ counterparty: e.target.value })} />}</Field>
        <Field label="Kategorie">{(id) => <Select id={id} value={f.category} onChange={(e) => set({ category: e.target.value })}>{Object.entries(categories).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
        <Field label="Verantwortlich" optional>{(id) => <Input id={id} value={f.owner} onChange={(e) => set({ owner: e.target.value })} />}</Field>
        <Field label="Vertragsbeginn" optional>{(id) => <Input id={id} type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} />}</Field>
        <Field label="Ende der (ersten) Laufzeit" hint="Nötig für die Fristberechnung.">{(id) => <Input id={id} type="date" value={f.termEnd} onChange={(e) => set({ termEnd: e.target.value })} />}</Field>
        <Field label="Kündigungsfrist">
          <div className="flex gap-2">
            <Input type="number" min={0} value={f.noticeValue} onChange={(e) => set({ noticeValue: e.target.value })} className="w-24" aria-label="Frist" />
            <Select value={f.noticeUnit} onChange={(e) => set({ noticeUnit: e.target.value })} aria-label="Einheit">{Object.entries(UNIT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          </div>
        </Field>
        <Field label="Automatische Verlängerung">
          <div className="flex gap-2 items-center">
            <Select value={String(Number(f.autoRenew))} onChange={(e) => set({ autoRenew: Number(e.target.value) })} className="w-28" aria-label="Verlängerung"><option value="1">Ja, um</option><option value="0">Nein</option></Select>
            {!!Number(f.autoRenew) && <><Input type="number" min={1} value={f.renewalMonths} onChange={(e) => set({ renewalMonths: e.target.value })} className="w-20" aria-label="Monate" /><span className="text-sm text-muted">Monate</span></>}
          </div>
        </Field>
        <Field label="Kosten" optional>
          <div className="flex gap-2">
            <Input type="number" step="0.01" min={0} value={f.costAmount} onChange={(e) => set({ costAmount: e.target.value })} className="w-32" aria-label="Betrag in Euro" />
            <Select value={f.costInterval} onChange={(e) => set({ costInterval: e.target.value })} aria-label="Intervall">{Object.entries(INTERVAL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          </div>
        </Field>
        <Field label="Erinnern (Tage vorher)" hint="Kommagetrennt, z. B. 90, 30, 7.">{(id) => <Input id={id} value={f.reminderDays} onChange={(e) => set({ reminderDays: e.target.value })} />}</Field>
      </div>
      <Field label="Notizen" optional>{(id) => <Textarea id={id} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />}</Field>
      <InlineError error={action.error} />
    </Modal>
  )
}

export function ContractView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, loading, reload, hardReload } = useApi(`/apps/contracts/${id}`)
  useDocumentTitle(data?.title)
  const [editing, setEditing] = useState(false)
  const [applyExtraction, setApplyExtraction] = useState(false)
  const extract = useAction()
  const [confirm, dialog] = useConfirm()
  const auto = useRef(false)
  useEffect(() => {
    if (!auto.current && data && new URLSearchParams(window.location.search).get('extract') && data.aiAvailable && data.document && !data.extraction) {
      auto.current = true
      extract.run(() => post(`/apps/contracts/${id}/extract`)).then(() => { reload(); setApplyExtraction(true) }).catch(() => {})
    }
  }, [data, id, extract, reload])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Der Vertrag" onRetry={hardReload} />
  const c = data
  const x = c.extraction
  const remove = async () => {
    if (!(await confirm({ title: 'Vertrag löschen?', text: 'Der Eintrag wird gelöscht. Das hochgeladene Dokument bleibt unter Knowledge → Dokumente erhalten.', confirmLabel: 'Löschen', danger: true }))) return
    await del(`/apps/contracts/${id}`)
    navigate('/apps/contracts')
  }
  const initialFromAi = x && {
    title: x.title || c.title, counterparty: x.counterparty, category: x.category, startDate: x.startDate, termEnd: x.termEnd,
    noticeValue: x.noticeValue >= 0 ? x.noticeValue : '', noticeUnit: x.noticeUnit, autoRenew: x.autoRenew ? 1 : 0, renewalMonths: x.renewalMonths || 12,
    costAmount: x.costAmount >= 0 ? x.costAmount : '', costInterval: x.costInterval,
  }
  return (
    <div className="max-w-4xl">
      {dialog}
      <PageHeader back={{ to: '/apps/contracts', label: 'Fristen-Manager' }} title={c.title} subtitle={`${c.counterparty || 'Vertragspartner unbekannt'} · ${c.categoryLabel} · ${STATUS[c.status]}`}
        actions={c.canWrite && <>
          <Button onClick={() => setEditing(true)}>Bearbeiten</Button>
          {c.status === 'active' && <Button onClick={() => patch(`/apps/contracts/${id}`, { status: 'cancelled' }).then(() => { toast('Als gekündigt markiert.'); reload() })}>Als gekündigt markieren</Button>}
          <Button variant="ghost" onClick={remove}>Löschen</Button>
        </>} />
      <Card className={cx('p-5 mb-6', c.urgency === 'urgent' || c.urgency === 'missed' ? 'border-bad/30' : '')}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Kündigen bis" value={fmt(c.cancelBy)} hint={c.daysLeft != null ? (c.daysLeft === 0 ? 'heute letzter Tag' : c.daysLeft > 0 ? `noch ${c.daysLeft} Tage` : `seit ${-c.daysLeft} Tagen verpasst`) : 'Frist oder Laufzeitende fehlt'} />
          <Stat label="Laufzeit endet" value={fmt(c.termEnd)} hint={c.rolled ? `${c.rolled}× automatisch verlängert` : undefined} />
          <Stat label="Kündigungsfrist" value={c.notice_value != null ? `${c.notice_value} ${UNIT[c.notice_unit]}` : '—'} />
          <Stat label="Kosten pro Jahr" value={c.annualCost != null ? euro(c.annualCost) : '—'} hint={c.auto_renew ? `Verlängerung um ${c.renewal_months} Monate` : 'keine automatische Verlängerung'} />
        </div>
        <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-center gap-2 text-sm">
          <Badge tone={URGENCY[c.urgency][0]}>{URGENCY[c.urgency][1]}</Badge>
          <span className="text-muted">Erinnerungen {c.reminder_days.join(', ')} Tage vor der Frist.</span>
        </div>
      </Card>

      <Section title="Dokument & KI-Auslesung">
        <Card className="p-5">
          {c.document ? (
            <p className="text-sm mb-3"><a href={`/api/documents/${c.document.id}/file`} target="_blank" rel="noopener" className="text-accent hover:underline">{c.document.filename}</a></p>
          ) : <p className="text-sm text-muted mb-3">Kein Dokument hinterlegt.</p>}
          {c.document && !x && (
            c.aiAvailable
              ? <Button variant="primary" onClick={() => extract.run(() => post(`/apps/contracts/${id}/extract`)).then(() => { reload(); setApplyExtraction(true) }).catch(() => {})} loading={extract.pending}>{extract.pending ? 'Junis liest den Vertrag …' : 'Fristen automatisch auslesen'}</Button>
              : <p className="text-sm text-muted">Automatisches Auslesen braucht Junis AI (API-Schlüssel auf dem Server). Trage die Daten über „Bearbeiten“ ein.</p>
          )}
          <InlineError error={extract.error} />
          {x && (
            <div className="text-sm">
              <p className="font-medium mb-2">Von Junis ausgelesen — bitte prüfen</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-ink-2 mb-3">
                <li>Laufzeitende: {x.termEnd ? fmt(x.termEnd) : 'nicht gefunden'}</li>
                <li>Kündigungsfrist: {x.noticeValue >= 0 ? `${x.noticeValue} ${UNIT[x.noticeUnit]}` : 'nicht gefunden'}</li>
                <li>Verlängerung: {x.autoRenew ? `automatisch um ${x.renewalMonths} Monate` : 'keine'}</li>
                <li>Kosten: {x.costAmount >= 0 ? `${euro(x.costAmount)} ${INTERVAL[x.costInterval]}` : 'nicht gefunden'}</li>
              </ul>
              {x.evidence?.length > 0 && (
                <details className="mb-3"><summary className="cursor-pointer text-muted">Belegstellen im Vertrag ({x.evidence.length})</summary>
                  <ul className="mt-2 space-y-2">{x.evidence.map((e, i) => <li key={i}><span className="text-xs text-muted">{e.field}</span><blockquote className="border-l-2 border-line-strong pl-3 text-ink-2">„{e.quote}“</blockquote></li>)}</ul>
                </details>
              )}
              {x.uncertainties?.length > 0 && <div className="bg-warn-soft rounded-md p-3 mb-3"><p className="font-medium text-warn mb-1">Unklar — manuell prüfen</p><ul className="list-disc pl-5">{x.uncertainties.map((u, i) => <li key={i}>{u}</li>)}</ul></div>}
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => setApplyExtraction(true)}>Werte prüfen & übernehmen</Button>
                <Button size="sm" variant="ghost" onClick={() => extract.run(() => post(`/apps/contracts/${id}/extract`)).then(reload).catch(() => {})} loading={extract.pending}>Neu auslesen</Button>
              </div>
            </div>
          )}
        </Card>
      </Section>
      {c.notes && <Section title="Notizen"><p className="text-sm whitespace-pre-wrap">{c.notes}</p></Section>}
      {editing && <ContractForm contract={c} categories={c.categories} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload() }} />}
      {applyExtraction && initialFromAi && <ContractForm contract={c} categories={c.categories} initial={initialFromAi} onClose={() => setApplyExtraction(false)} onSaved={() => { setApplyExtraction(false); toast('Werte übernommen.'); reload() }} />}
    </div>
  )
}

