import { useState } from 'react'
import { post, patch, del } from '../../../lib/api.js'
import { useApi, useAction } from '../../../lib/hooks.js'
import { Badge, Button, Card, Checkbox, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, Section, Select, Stat, Textarea, useConfirm, useToast, cx } from '../../../components/ui.jsx'
import { useGastro, TABLE_STATUS, NEXT_STATUS, RES_TONE, dayLabel, addDays } from './shared.jsx'

export default function Reservations() {
  const g = useGastro()
  const toast = useToast()
  const [confirm, dialog] = useConfirm()
  const [day, setDay] = useState(g.today)
  const tables = useApi(`${g.base}/tables`)
  const res = useApi(`${g.base}/reservations?from=${day}&to=${day}`, [day])
  const [setup, setSetup] = useState(false)
  const [editing, setEditing] = useState(null)
  const canWrite = g.permissions.floor.write
  if (tables.loading) return <Loading />
  if (tables.error) return <ErrorState error={tables.error} what="Der Tischplan" onRetry={tables.hardReload} />
  const list = tables.data
  const seats = list.reduce((s, t) => s + t.seats, 0)
  const used = list.filter((t) => t.status !== 'free').reduce((s, t) => s + t.seats, 0)
  const cycle = (t) => canWrite && patch(`${g.base}/tables/${t.id}`, { status: NEXT_STATUS[t.status] }).then(tables.reload).catch((e) => toast(e.message, 'bad'))
  const removeTable = async (t) => {
    if (!(await confirm({ title: `Tisch ${t.number} löschen?`, text: 'Reservierungen dieses Tisches bleiben erhalten, verlieren aber die Tischzuordnung.', confirmLabel: 'Löschen', danger: true }))) return
    del(`${g.base}/tables/${t.id}`).then(() => { tables.reload(); res.reload() })
  }
  const setStatus = (r, status) => patch(`${g.base}/reservations/${r.id}`, { status }).then(() => { res.reload(); tables.reload() }).catch((e) => toast(e.message, 'bad'))
  const removeRes = async (r) => {
    if (!(await confirm({ title: 'Reservierung löschen?', text: `${r.guest_name}, ${dayLabel(r.date)} ${r.time} Uhr. Für die Statistik ist „Storniert“ meist besser als Löschen.`, confirmLabel: 'Löschen', danger: true }))) return
    del(`${g.base}/reservations/${r.id}`).then(res.reload)
  }

  return (
    <>
      {dialog}
      <Card className="p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        <Stat label="Tische" value={list.length} />
        <Stat label="Plätze belegt" value={`${used} / ${seats}`} hint="aus Tischstatus" />
        <Stat label="Auslastung" value={`${seats ? Math.round((used / seats) * 100) : 0} %`} />
        <Stat label={`Reservierungen ${dayLabel(day)}`} value={res.data?.filter((r) => !['cancelled', 'no_show'].includes(r.status)).length ?? '–'} hint={res.data ? `${res.data.filter((r) => !['cancelled', 'no_show'].includes(r.status)).reduce((s, r) => s + r.guests, 0)} Gäste` : ''} />
      </Card>

      <Section title="Tischplan" description={canWrite ? 'Klick auf einen Tisch wechselt den Status: frei → reserviert → besetzt → Reinigung → frei.' : undefined}
        action={canWrite && <Button size="sm" onClick={() => setSetup(true)}>Tische hinzufügen</Button>}>
        {list.length ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {list.map((t) => (
              <div key={t.id} className="relative group">
                <button onClick={() => cycle(t)} disabled={!canWrite} className={cx('w-full rounded-xl border p-3 text-left transition-colors', t.status === 'free' ? 'border-line bg-surface hover:border-line-strong' : t.status === 'occupied' ? 'border-warn/40 bg-warn-soft' : t.status === 'reserved' ? 'border-accent/30 bg-accent-soft' : 'border-line bg-subtle')}
                  aria-label={`Tisch ${t.number}, ${t.seats} Plätze, ${TABLE_STATUS[t.status][1]}`}>
                  <p className="font-semibold">T{t.number}</p>
                  <p className="text-xs text-muted">{t.seats} Plätze{t.area ? ` · ${t.area}` : ''}</p>
                  <Badge tone={TABLE_STATUS[t.status][0]} className="mt-1.5">{TABLE_STATUS[t.status][1]}</Badge>
                </button>
                {canWrite && <button onClick={() => removeTable(t)} className="absolute top-1.5 right-2 text-xs text-faint hover:text-bad opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Tisch ${t.number} löschen`}>✕</button>}
              </div>
            ))}
          </div>
        ) : <EmptyState title="Noch keine Tische angelegt." text="Lege die Tische deines Gastraums an — Grundlage für Auslastung, automatische Tischvergabe und Personalplanung." action={canWrite && <Button variant="primary" onClick={() => setSetup(true)}>Tische anlegen</Button>} />}
      </Section>

      <Section title="Reservierungsbuch"
        action={<div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDay(addDays(day, -1))} aria-label="Vortag">←</Button>
          <Input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="h-8 w-40 text-sm" aria-label="Tag" />
          <Button size="sm" variant="ghost" onClick={() => setDay(addDays(day, 1))} aria-label="Folgetag">→</Button>
          {day !== g.today && <Button size="sm" variant="ghost" onClick={() => setDay(g.today)}>Heute</Button>}
          {canWrite && <Button size="sm" variant="primary" onClick={() => setEditing({ date: day })}>Reservierung anlegen</Button>}
        </div>}>
        {res.error ? <ErrorState error={res.error} compact onRetry={res.hardReload} /> : !res.data ? <Loading /> : res.data.length ? (
          <Card className="divide-y divide-line">
            {res.data.map((r) => (
              <div key={r.id} className={cx('flex flex-wrap items-center gap-3 px-4 py-3', ['cancelled', 'no_show'].includes(r.status) && 'opacity-60')}>
                <span className="tabular-nums font-semibold w-12">{r.time}</span>
                <div className="flex-1 min-w-40">
                  <p className="text-sm font-medium">{r.guest_name} <span className="text-muted font-normal">· {r.guests} Pers.{r.table_number ? ` · Tisch ${r.table_number}` : ' · ohne Tisch'}</span></p>
                  <p className="text-xs text-muted">{[r.phone, r.note].filter(Boolean).join(' · ')}</p>
                </div>
                {r.guest_allergies && <Badge tone="warn">Allergien: {r.guest_allergies}</Badge>}
                {canWrite ? (
                  <Select value={r.status} onChange={(e) => setStatus(r, e.target.value)} className="h-8 w-44 text-sm" aria-label="Status">
                    {Object.entries(g.reservationStatus).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                ) : <Badge tone={RES_TONE[r.status]}>{g.reservationStatus[r.status]}</Badge>}
                {canWrite && <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Bearbeiten</Button>}
                {canWrite && <button onClick={() => removeRes(r)} className="text-xs text-faint hover:text-bad">Löschen</button>}
              </div>
            ))}
          </Card>
        ) : <p className="text-sm text-muted">Keine Reservierungen am {dayLabel(day, { weekday: 'long', day: '2-digit', month: 'long' })}.</p>}
        <p className="text-xs text-muted mt-2">Automatische Tischvergabe: kleinster passender Tisch ohne Überschneidung im Zeitfenster von {g.restaurant.slot_minutes} Minuten (in den Einstellungen änderbar). „Platziert“ belegt den Tisch, „Abgeschlossen“ setzt ihn auf Reinigung.</p>
      </Section>

      {setup && <TableSetup onClose={() => setSetup(false)} onSaved={() => { setSetup(false); tables.reload() }} />}
      {editing && <ReservationForm initial={editing} tables={list} onClose={() => setEditing(null)} onSaved={(r) => { setEditing(null); if (r.warning) toast(r.warning, 'warn'); else toast('Reservierung gespeichert.'); if (r.date !== day) setDay(r.date); else res.reload() }} />}
    </>
  )
}

function TableSetup({ onClose, onSaved }) {
  const g = useGastro()
  const [f, setF] = useState({ count: '', seats: '4', area: '' })
  const { pending, error, run } = useAction()
  return (
    <Modal open onClose={onClose} title="Tische hinzufügen"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!Number(f.count)} onClick={() => run(() => post(`${g.base}/tables`, f)).then(onSaved).catch(() => {})}>Speichern</Button></>}>
      <p className="text-sm text-muted mb-4">Die Tische werden fortlaufend nummeriert. Unterschiedliche Tischgrößen legst du in mehreren Durchgängen an (z. B. 6 × 2er, 4 × 4er).</p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Anzahl">{(id) => <Input id={id} type="number" min={1} max={60} value={f.count} onChange={(e) => setF({ ...f, count: e.target.value })} />}</Field>
        <Field label="Plätze je Tisch">{(id) => <Input id={id} type="number" min={1} max={40} value={f.seats} onChange={(e) => setF({ ...f, seats: e.target.value })} />}</Field>
        <Field label="Bereich" optional>{(id) => <Input id={id} value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder="Terrasse" />}</Field>
      </div>
      <InlineError error={error} />
    </Modal>
  )
}

function ReservationForm({ initial, tables, onClose, onSaved }) {
  const g = useGastro()
  const isNew = !initial.id
  const guests = useApi(`${g.base}/guests`)
  const [f, setF] = useState({
    guestName: initial.guest_name || '', phone: initial.phone || '', date: initial.date || g.today, time: initial.time || '19:00', guests: initial.guests || 2,
    tableId: initial.table_id || '', guestId: initial.guest_id || '', note: initial.note || '', autoAssign: isNew, saveGuest: isNew,
  })
  const { pending, error, run } = useAction()
  const set = (x) => setF((y) => ({ ...y, ...x }))
  const pickGuest = (id) => {
    const gu = guests.data?.find((x) => String(x.id) === String(id))
    set({ guestId: id, ...(gu ? { guestName: gu.name, phone: gu.phone || '', saveGuest: false } : {}) })
  }
  const submit = () => run(() => {
    const body = { ...f, guestId: f.guestId || null, tableId: f.autoAssign ? undefined : f.tableId || null }
    return isNew ? post(`${g.base}/reservations`, body) : patch(`${g.base}/reservations/${initial.id}`, body)
  }).then(onSaved).catch(() => {})
  const chosen = guests.data?.find((x) => String(x.id) === String(f.guestId))
  return (
    <Modal open onClose={onClose} title={isNew ? 'Reservierung anlegen' : 'Reservierung bearbeiten'} width="max-w-xl"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!f.guestName.trim() || !f.date || !f.time} onClick={submit}>Speichern</Button></>}>
      {guests.data?.length > 0 && (
        <Field label="Bekannter Gast" optional>{(id) => <Select id={id} value={f.guestId} onChange={(e) => pickGuest(e.target.value)}><option value="">— neuer oder unbekannter Gast —</option>{guests.data.map((x) => <option key={x.id} value={x.id}>{x.name}{x.phone ? ` · ${x.phone}` : ''}</option>)}</Select>}</Field>
      )}
      {chosen?.allergies && <p className="text-sm text-warn mb-3">Allergien laut Gästeprofil: {chosen.allergies}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
        <Field label="Name">{(id) => <Input id={id} value={f.guestName} onChange={(e) => set({ guestName: e.target.value })} />}</Field>
        <Field label="Telefon" optional>{(id) => <Input id={id} value={f.phone} onChange={(e) => set({ phone: e.target.value })} />}</Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Datum">{(id) => <Input id={id} type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />}</Field>
        <Field label="Uhrzeit">{(id) => <Input id={id} type="time" value={f.time} onChange={(e) => set({ time: e.target.value })} />}</Field>
        <Field label="Personen">{(id) => <Input id={id} type="number" min={1} value={f.guests} onChange={(e) => set({ guests: e.target.value })} />}</Field>
      </div>
      <Checkbox label="Tisch automatisch vergeben" checked={f.autoAssign} onChange={(v) => set({ autoAssign: v })} description="Kleinster passender, im Zeitfenster freier Tisch." />
      {!f.autoAssign && (
        <Field label="Tisch" optional>{(id) => <Select id={id} value={f.tableId} onChange={(e) => set({ tableId: e.target.value })}><option value="">Ohne Tisch</option>{tables.map((t) => <option key={t.id} value={t.id}>Tisch {t.number} · {t.seats} Plätze{t.area ? ` · ${t.area}` : ''}</option>)}</Select>}</Field>
      )}
      {!f.guestId && <Checkbox label="Als Gast in der Gästedatenbank speichern" checked={f.saveGuest} onChange={(v) => set({ saveGuest: v })} description="Nur mit betrieblichem Zweck (z. B. Wiedererkennung, Allergien)." />}
      <Field label="Notiz" optional>{(id) => <Textarea id={id} value={f.note} onChange={(e) => set({ note: e.target.value })} className="min-h-16" placeholder="z. B. Kinderstuhl, Geburtstag" />}</Field>
      <InlineError error={error} />
    </Modal>
  )
}
