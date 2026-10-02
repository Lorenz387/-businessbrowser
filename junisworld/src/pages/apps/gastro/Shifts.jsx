import { useState } from 'react'
import { post, patch, del } from '../../../lib/api.js'
import { useApi, useAction } from '../../../lib/hooks.js'
import { Badge, Button, Card, ErrorState, Field, Input, InlineError, Loading, Modal, Section, Select, useConfirm, cx } from '../../../components/ui.jsx'
import { useGastro, dayLabel, addDays, mondayOf } from './shared.jsx'

export default function Shifts() {
  const g = useGastro()
  const [week, setWeek] = useState(mondayOf(g.today))
  const { data, error, loading, reload, hardReload } = useApi(`${g.base}/shifts?weekStart=${week}`, [week])
  const [gen, setGen] = useState(false)
  const [confirm, dialog] = useConfirm()
  const canWrite = g.permissions.shifts.write
  if (loading && !data) return <Loading />
  if (error) return <ErrorState error={error} what="Die Personalplanung" onRetry={hardReload} />
  const assign = (s, employeeId) => patch(`${g.base}/shifts/${s.id}`, { employeeId: employeeId || null }).then(reload)
  const removeShift = (s) => del(`${g.base}/shifts/${s.id}`).then(reload)
  const regenerate = async () => {
    if (data.shifts.length && !(await confirm({ title: 'Schichtplan neu berechnen?', text: 'Die gespeicherten Schichten dieser Woche (inkl. Zuweisungen) werden ersetzt.', confirmLabel: 'Neu berechnen' }))) return
    setGen(true)
  }
  const perEmployee = data.employees.map((e) => ({ ...e, count: data.shifts.filter((s) => s.employee_id === e.id).length })).filter((e) => e.count)
  return (
    <>
      {dialog}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Button size="sm" variant="ghost" onClick={() => setWeek(addDays(week, -7))} aria-label="Vorwoche">←</Button>
        <span className="text-sm font-medium">Woche {dayLabel(week, { day: '2-digit', month: '2-digit' })} – {dayLabel(addDays(week, 6), { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        <Button size="sm" variant="ghost" onClick={() => setWeek(addDays(week, 7))} aria-label="Folgewoche">→</Button>
        <span className="flex-1" />
        {canWrite && <Button variant="primary" onClick={regenerate}>{data.shifts.length ? 'Neu berechnen' : 'Schichtplan erstellen'}</Button>}
      </div>

      <Section title="Personalbedarf aus Reservierungen" description={`Service: aufgerundet Gäste ÷ ${g.restaurant.guests_per_service}, Küche: Gäste ÷ ${g.restaurant.guests_per_kitchen}, mindestens 1 an Öffnungstagen. Kennzahlen und Ruhetage in den Einstellungen.`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {data.days.map((d) => (
            <Card key={d.date} className={cx('p-3', !d.open && 'bg-subtle/60')}>
              <p className="font-medium text-sm">{dayLabel(d.date)}</p>
              {d.open ? (
                <>
                  <p className="text-xl font-semibold tabular-nums mt-1">{d.guests}<span className="text-xs text-muted font-normal"> Gäste</span></p>
                  <p className="text-xs mt-1">Service <b>{d.service}</b> · Küche <b>{d.kitchen}</b></p>
                  <p className="text-[11px] text-muted mt-1">{d.note}</p>
                </>
              ) : <p className="text-sm text-muted mt-1">Ruhetag</p>}
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted mt-2">Laufkundschaft, Vorbereitungszeiten, Pausen und arbeitszeitrechtliche Vorgaben (z. B. Ruhezeiten) sind nicht eingerechnet — bitte betrieblich ergänzen.</p>
      </Section>

      <Section title="Schichtplan">
        {data.shifts.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {data.days.filter((d) => data.shifts.some((s) => s.date === d.date)).map((d) => (
              <Card key={d.date} className="p-4">
                <p className="font-medium mb-2">{dayLabel(d.date, { weekday: 'long', day: '2-digit', month: '2-digit' })}</p>
                <div className="space-y-2">
                  {data.shifts.filter((s) => s.date === d.date).map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <Badge tone={s.role === 'kitchen' ? 'warn' : 'accent'}>{s.role === 'kitchen' ? 'Küche' : 'Service'}</Badge>
                      <span className="tabular-nums text-muted shrink-0">{s.start_time}–{s.end_time}</span>
                      {canWrite ? (
                        <Select value={s.employee_id || ''} onChange={(e) => assign(s, e.target.value)} className="h-8 text-sm" aria-label="Mitarbeiter zuweisen">
                          <option value="">— offen —</option>
                          {data.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </Select>
                      ) : <span className="flex-1 truncate">{s.employee_name || 'offen'}</span>}
                      {canWrite && <button onClick={() => removeShift(s)} className="text-xs text-faint hover:text-bad shrink-0" aria-label="Schicht entfernen">✕</button>}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : <p className="text-sm text-muted">Für diese Woche ist noch kein Schichtplan gespeichert.{canWrite ? ' „Schichtplan erstellen“ übernimmt den berechneten Bedarf.' : ''}</p>}
        {!data.employees.length && canWrite && <p className="text-sm text-muted mt-3">Lege im Bereich <button className="text-accent hover:underline" onClick={() => g.go('team')}>Team</button> Mitarbeitende an, um Schichten zuzuweisen.</p>}
        {perEmployee.length > 0 && <p className="text-xs text-muted mt-3">Schichten je Person: {perEmployee.map((e) => `${e.name} ${e.count}`).join(' · ')}</p>}
      </Section>
      {gen && <Generate week={week} onClose={() => setGen(false)} onSaved={() => { setGen(false); reload() }} />}
    </>
  )
}

function Generate({ week, onClose, onSaved }) {
  const g = useGastro()
  const [f, setF] = useState({ serviceStart: '11:00', serviceEnd: '22:00', kitchenStart: '10:00', kitchenEnd: '21:30' })
  const { pending, error, run } = useAction()
  const set = (x) => setF((y) => ({ ...y, ...x }))
  return (
    <Modal open onClose={onClose} title="Schichtplan erstellen"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} onClick={() => run(() => post(`${g.base}/shifts/generate`, { weekStart: week, ...f })).then(onSaved).catch(() => {})}>Erstellen</Button></>}>
      <p className="text-sm text-muted mb-4">Für jeden Öffnungstag wird der berechnete Bedarf als einzelne Schichten angelegt. Personen weist du danach zu.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Service von">{(id) => <Input id={id} type="time" value={f.serviceStart} onChange={(e) => set({ serviceStart: e.target.value })} />}</Field>
        <Field label="Service bis">{(id) => <Input id={id} type="time" value={f.serviceEnd} onChange={(e) => set({ serviceEnd: e.target.value })} />}</Field>
        <Field label="Küche von">{(id) => <Input id={id} type="time" value={f.kitchenStart} onChange={(e) => set({ kitchenStart: e.target.value })} />}</Field>
        <Field label="Küche bis">{(id) => <Input id={id} type="time" value={f.kitchenEnd} onChange={(e) => set({ kitchenEnd: e.target.value })} />}</Field>
      </div>
      <InlineError error={error} />
    </Modal>
  )
}
