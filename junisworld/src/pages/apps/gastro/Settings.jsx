import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, del } from '../../../lib/api.js'
import { useAction } from '../../../lib/hooks.js'
import { Button, Card, Field, Input, InlineError, Section, Textarea, useConfirm, useToast, cx } from '../../../components/ui.jsx'
import { useGastro, WEEKDAYS } from './shared.jsx'

export default function Settings() {
  const g = useGastro()
  const r = g.restaurant
  const toast = useToast()
  const navigate = useNavigate()
  const [confirm, dialog] = useConfirm()
  const [f, setF] = useState({ name: r.name, address: r.address || '', concept: r.concept || '', timezone: r.timezone, openDays: r.open_days, slotMinutes: r.slot_minutes, guestsPerService: r.guests_per_service, guestsPerKitchen: r.guests_per_kitchen })
  const { pending, error, run } = useAction()
  const set = (x) => setF((y) => ({ ...y, ...x }))
  const toggleDay = (d) => set({ openDays: f.openDays.includes(d) ? f.openDays.filter((x) => x !== d) : [...f.openDays, d] })
  const save = () => run(() => api(g.base, { method: 'PUT', body: f })).then(() => { toast('Einstellungen gespeichert.'); g.reloadInfo() }).catch(() => {})
  const remove = async () => {
    if (!(await confirm({ title: `„${r.name}“ endgültig löschen?`, text: 'Alle Reservierungen, Gäste, Rezepte, Lager-, Umsatz- und Teamdaten dieses Restaurants werden gelöscht. Das kann nicht rückgängig gemacht werden.', confirmLabel: 'Endgültig löschen', danger: true }))) return
    del(g.base).then(() => navigate('/apps/gastro'))
  }
  return (
    <div className="max-w-3xl">
      {dialog}
      <Section title="Restaurantprofil">
        <Card className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            <Field label="Name">{(id) => <Input id={id} value={f.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
            <Field label="Standort" optional>{(id) => <Input id={id} value={f.address} onChange={(e) => set({ address: e.target.value })} />}</Field>
          </div>
          <Field label="Küchenkonzept" optional hint="Grundlage für das KI-Kochstudio.">{(id) => <Textarea id={id} value={f.concept} onChange={(e) => set({ concept: e.target.value })} />}</Field>
          <Field label="Zeitzone" hint="Bestimmt „heute“ für Dashboard und Reservierungen.">{(id) => <Input id={id} value={f.timezone} onChange={(e) => set({ timezone: e.target.value })} className="w-60" />}</Field>
        </Card>
      </Section>
      <Section title="Betrieb & Planung">
        <Card className="p-5">
          <p className="text-sm font-medium mb-2">Öffnungstage</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {WEEKDAYS.map(([d, l]) => <button key={d} onClick={() => toggleDay(d)} aria-pressed={f.openDays.includes(d)} className={cx('h-9 w-11 rounded-lg border text-sm', f.openDays.includes(d) ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-line text-muted')}>{l}</button>)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
            <Field label="Reservierungsdauer (Min.)" hint="Zeitfenster für Tischkonflikte.">{(id) => <Input id={id} type="number" min={30} max={480} value={f.slotMinutes} onChange={(e) => set({ slotMinutes: e.target.value })} />}</Field>
            <Field label="Gäste je Servicekraft">{(id) => <Input id={id} type="number" min={1} value={f.guestsPerService} onChange={(e) => set({ guestsPerService: e.target.value })} />}</Field>
            <Field label="Gäste je Küchenkraft">{(id) => <Input id={id} type="number" min={1} value={f.guestsPerKitchen} onChange={(e) => set({ guestsPerKitchen: e.target.value })} />}</Field>
          </div>
          <p className="text-xs text-muted">Die Kennzahlen pro Kraft sind Startwerte (18 / 22) und sollten an Konzept und Erfahrungswerte deines Betriebs angepasst werden.</p>
        </Card>
      </Section>
      <div className="flex gap-2"><Button variant="primary" loading={pending} onClick={save}>Speichern</Button></div>
      <InlineError error={error} />
      {g.role === 'owner' && (
        <Section title="Gefahrenzone" className="mt-10">
          <Card className="p-5 flex flex-wrap items-center gap-3">
            <p className="text-sm flex-1">Restaurant mit allen Daten löschen.</p>
            <Button variant="danger" onClick={remove}>Restaurant löschen</Button>
          </Card>
        </Section>
      )}
    </div>
  )
}
