import { useState } from 'react'
import { post, patch, del } from '../../../lib/api.js'
import { useApi, useAction } from '../../../lib/hooks.js'
import { Badge, Button, Card, Checkbox, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, Section, Select, Textarea, useConfirm, cx } from '../../../components/ui.jsx'
import { useGastro, eur, pct, costTone, parseNum } from './shared.jsx'

const CATEGORIES = ['Vorspeisen', 'Suppen', 'Salate', 'Hauptgerichte', 'Vegetarisch', 'Beilagen', 'Desserts', 'Getränke', 'Tagesgericht']

export default function MenuPage() {
  const g = useGastro()
  const dishes = useApi(`${g.base}/dishes`)
  const recipes = useApi(g.permissions.kitchen.read ? `${g.base}/recipes` : null)
  const [editing, setEditing] = useState(null)
  const [view, setView] = useState('calc')
  const [confirm, dialog] = useConfirm()
  const canWrite = g.permissions.kitchen.write
  if (dishes.loading) return <Loading />
  if (dishes.error) return <ErrorState error={dishes.error} what="Die Speisekarte" onRetry={dishes.hardReload} />
  const list = dishes.data
  const cats = [...new Set(list.map((d) => d.category))]
  const remove = async (d) => {
    if (!(await confirm({ title: `„${d.name}“ löschen?`, text: 'Zum vorübergehenden Ausblenden besser „nicht auf der Karte“ wählen.', confirmLabel: 'Löschen', danger: true }))) return
    del(`${g.base}/dishes/${d.id}`).then(dishes.reload)
  }
  return (
    <>
      {dialog}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="inline-flex rounded-lg border border-line bg-subtle p-0.5" role="tablist">
          {[['calc', 'Kalkulation'], ['card', 'Kartenansicht']].map(([v, l]) => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cx('px-3 h-8 text-sm rounded-md', view === v ? 'bg-surface shadow-sm font-medium' : 'text-muted')}>{l}</button>)}
        </div>
        <span className="flex-1" />
        {view === 'card' && list.length > 0 && <Button onClick={() => window.print()}>Drucken</Button>}
        {canWrite && <Button variant="primary" onClick={() => setEditing({})}>Gericht anlegen</Button>}
      </div>
      {!list.length ? (
        <EmptyState title="Deine Speisekarte beginnt hier." text="Lege Gerichte mit Preis und Allergenen an. Verknüpfst du ein Rezept, berechnet GastroFlow Wareneinsatz, Wareneinsatzquote und Deckungsbeitrag automatisch. Ideen liefert das KI-Kochstudio."
          action={canWrite && <Button variant="primary" onClick={() => setEditing({})}>Gericht anlegen</Button>} secondary={canWrite && <Button onClick={() => g.go('studio')}>KI-Kochstudio</Button>} />
      ) : view === 'calc' ? (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted border-b border-line">
                <th className="px-4 py-2.5 font-medium">Gericht</th><th className="px-3 py-2.5 font-medium text-right">Preis brutto</th><th className="px-3 py-2.5 font-medium text-right">USt.</th><th className="px-3 py-2.5 font-medium text-right">Netto</th>
                <th className="px-3 py-2.5 font-medium text-right">Wareneinsatz</th><th className="px-3 py-2.5 font-medium text-right">Quote</th><th className="px-3 py-2.5 font-medium text-right">Deckungsbeitrag</th><th className="px-3 py-2.5" />
              </tr></thead>
              <tbody className="divide-y divide-line">
                {list.map((d) => (
                  <tr key={d.id} className={cx(!d.active && 'opacity-55')}>
                    <td className="px-4 py-2.5"><span className="font-medium">{d.name}</span><span className="block text-xs text-muted">{d.category}{!d.active ? ' · nicht auf der Karte' : ''}{!d.recipe_id ? ' · ohne Rezept' : ''}</span></td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{eur(d.price)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{d.vat} %</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{eur(d.netPrice)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{eur(d.costPerPortion)}</td>
                    <td className="px-3 py-2.5 text-right">{d.foodCostPct != null ? <Badge tone={costTone(d.foodCostPct)}>{pct(d.foodCostPct)}</Badge> : '–'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{eur(d.contribution)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">{canWrite && <><Button size="sm" variant="ghost" onClick={() => setEditing(d)}>Bearbeiten</Button><button onClick={() => remove(d)} className="text-xs text-faint hover:text-bad ml-1">Löschen</button></>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="text-xs text-muted mt-3">Wareneinsatzquote = Wareneinsatz je Portion ÷ Nettoverkaufspreis. Speisen: 7 % USt. (seit 1.1.2026 auch im Restaurant), Getränke: 19 %. Wareneinsatz aus Rezeptmengen × aktuellen Einkaufspreisen im Lager. Ampel als Orientierung (bis ca. 30 % / 35 %), der passende Wert hängt vom Konzept ab.</p>
        </>
      ) : (
        <div className="max-w-2xl mx-auto print:max-w-none">
          <h2 className="text-2xl font-semibold text-center mb-6">{g.restaurant.name}</h2>
          {cats.map((c) => {
            const items = list.filter((d) => d.category === c && d.active)
            if (!items.length) return null
            return (
              <Section key={c} title={c}>
                <div className="space-y-3">
                  {items.map((d) => (
                    <div key={d.id} className="flex gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{d.name}{d.allergens.length > 0 && <sup className="text-xs text-muted ml-1">{d.allergens.map((a) => g.allergens.indexOf(a) + 1).sort((x, y) => x - y).join(',')}</sup>}</p>
                        {d.description && <p className="text-sm text-muted">{d.description}</p>}
                      </div>
                      <p className="tabular-nums font-medium">{eur(d.price)}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )
          })}
          <p className="text-xs text-muted border-t border-line pt-3">Allergene: {g.allergens.map((a, i) => `${i + 1} ${a}`).join(' · ')}. Alle Preise inkl. gesetzlicher Umsatzsteuer.</p>
        </div>
      )}
      {editing && <DishForm initial={editing} recipes={recipes.data || []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); dishes.reload() }} />}
    </>
  )
}

function DishForm({ initial, recipes, onClose, onSaved }) {
  const g = useGastro()
  const [f, setF] = useState({
    name: initial.name || '', category: initial.category || 'Hauptgerichte', description: initial.description || '', price: initial.price ?? '', vat: initial.vat ?? 7,
    recipeId: initial.recipe_id || '', allergens: initial.allergens || [], active: initial.active ?? true,
  })
  const { pending, error, run } = useAction()
  const set = (x) => setF((y) => ({ ...y, ...x }))
  const recipe = recipes.find((r) => String(r.id) === String(f.recipeId))
  const price = Number(parseNum(f.price)) || 0
  const net = price / (1 + Number(f.vat) / 100)
  const quote = recipe && net > 0 ? Math.round((recipe.perPortion / net) * 1000) / 10 : null
  const submit = () => run(() => {
    const body = { ...f, price: parseNum(f.price), recipeId: f.recipeId || null }
    return initial.id ? patch(`${g.base}/dishes/${initial.id}`, body) : post(`${g.base}/dishes`, body)
  }).then(onSaved).catch(() => {})
  return (
    <Modal open onClose={onClose} title={initial.id ? 'Gericht bearbeiten' : 'Gericht anlegen'} width="max-w-2xl"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!f.name.trim()} onClick={submit}>Speichern</Button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
        <Field label="Name">{(id) => <Input id={id} value={f.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
        <Field label="Kategorie">{(id) => <><Input id={id} list="gastro-cats" value={f.category} onChange={(e) => set({ category: e.target.value })} /><datalist id="gastro-cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist></>}</Field>
      </div>
      <Field label="Beschreibung für Gäste" optional>{(id) => <Textarea id={id} value={f.description} onChange={(e) => set({ description: e.target.value })} className="min-h-16" />}</Field>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
        <Field label="Preis brutto (€)">{(id) => <Input id={id} inputMode="decimal" value={f.price} onChange={(e) => set({ price: e.target.value })} placeholder="0,00" />}</Field>
        <Field label="Umsatzsteuer">{(id) => <Select id={id} value={f.vat} onChange={(e) => set({ vat: Number(e.target.value) })}><option value={7}>7 % (Speisen)</option><option value={19}>19 % (Getränke)</option><option value={0}>0 %</option></Select>}</Field>
        <Field label="Rezept" optional>{(id) => <Select id={id} value={f.recipeId} onChange={(e) => set({ recipeId: e.target.value })}><option value="">Ohne Rezept</option>{recipes.map((r) => <option key={r.id} value={r.id}>{r.name} ({eur(r.perPortion)}/Port.)</option>)}</Select>}</Field>
      </div>
      {recipe && <p className="text-sm mb-3">Wareneinsatz {eur(recipe.perPortion)} · Netto {eur(Math.round(net * 100) / 100)} · Quote <Badge tone={costTone(quote)}>{pct(quote)}</Badge> · Deckungsbeitrag {eur(Math.round((net - recipe.perPortion) * 100) / 100)}</p>}
      <p className="text-sm font-medium mb-1.5">Allergene (LMIV)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mb-2">
        {g.allergens.map((a) => <Checkbox key={a} label={a} checked={f.allergens.includes(a)} onChange={(v) => set({ allergens: v ? [...f.allergens, a] : f.allergens.filter((x) => x !== a) })} />)}
      </div>
      <Checkbox label="Auf der Karte" checked={f.active} onChange={(v) => set({ active: v })} />
      <InlineError error={error} />
    </Modal>
  )
}
