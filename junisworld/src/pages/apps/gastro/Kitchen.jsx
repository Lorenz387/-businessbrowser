import { useState } from 'react'
import { post, patch, del } from '../../../lib/api.js'
import { useApi, useAction } from '../../../lib/hooks.js'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, Section, Select, Stat, Textarea, useConfirm, useToast } from '../../../components/ui.jsx'
import { useGastro, eur, parseNum } from './shared.jsx'

export default function Kitchen() {
  const g = useGastro()
  const toast = useToast()
  const inv = useApi(`${g.base}/inventory`)
  const rec = useApi(`${g.base}/recipes`)
  const [ing, setIng] = useState(null)
  const [book, setBook] = useState(null)
  const [recipe, setRecipe] = useState(null)
  const [produce, setProduce] = useState(null)
  const [confirm, dialog] = useConfirm()
  const canWrite = g.permissions.kitchen.write
  if (inv.loading || rec.loading) return <Loading />
  if (inv.error || rec.error) return <ErrorState error={inv.error || rec.error} what="Lager und Rezepte" onRetry={() => { inv.hardReload(); rec.hardReload() }} />
  const stockValue = inv.data.reduce((s, i) => s + i.stock * i.unit_cost, 0)
  const removeIng = async (i) => {
    if (!(await confirm({ title: `„${i.name}“ löschen?`, text: 'Die Zutat wird auch aus allen Rezepten entfernt — deren Wareneinsatz ändert sich.', confirmLabel: 'Löschen', danger: true }))) return
    del(`${g.base}/inventory/${i.id}`).then(() => { inv.reload(); rec.reload() })
  }
  const removeRecipe = async (r) => {
    if (!(await confirm({ title: `Rezept „${r.name}“ löschen?`, text: 'Verknüpfte Gerichte verlieren ihre Wareneinsatz-Berechnung.', confirmLabel: 'Löschen', danger: true }))) return
    del(`${g.base}/recipes/${r.id}`).then(rec.reload)
  }
  return (
    <>
      {dialog}
      <Card className="p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        <Stat label="Zutaten" value={inv.data.length} />
        <Stat label="Nachbestellen" value={inv.data.filter((i) => i.needsReorder).length} hint="Bestand ≤ Meldebestand" />
        <Stat label="Lagerwert" value={eur(Math.round(stockValue * 100) / 100)} hint="Bestand × Einkaufspreis" />
        <Stat label="Rezepte" value={rec.data.length} />
      </Card>

      <Section title="Lagerbestand" action={canWrite && <Button size="sm" variant="primary" onClick={() => setIng({})}>Zutat anlegen</Button>}>
        {inv.data.length ? (
          <Card className="divide-y divide-line">
            {inv.data.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-40">
                  <p className="text-sm font-medium">{i.name}</p>
                  <p className="text-xs text-muted">{eur(i.unit_cost)}/{i.unit}{i.supplier ? ` · ${i.supplier}` : ''} · Meldebestand {i.reorder_level} {i.unit}</p>
                </div>
                <span className="tabular-nums text-sm">{i.stock.toLocaleString('de-DE')} {i.unit}</span>
                <Badge tone={i.needsReorder ? 'bad' : 'ok'}>{i.needsReorder ? 'Nachbestellen' : 'OK'}</Badge>
                {canWrite && <Button size="sm" onClick={() => setBook(i)}>Buchen</Button>}
                {canWrite && <Button size="sm" variant="ghost" onClick={() => setIng(i)}>Bearbeiten</Button>}
                {canWrite && <button onClick={() => removeIng(i)} className="text-xs text-faint hover:text-bad">Löschen</button>}
              </div>
            ))}
          </Card>
        ) : <EmptyState title="Lager ist leer." text="Erfasse Zutaten mit Einheit, Einkaufspreis und Meldebestand. Es werden keine Zutaten vorgefüllt." action={canWrite && <Button variant="primary" onClick={() => setIng({})}>Zutat anlegen</Button>} />}
      </Section>

      <Section title="Rezepte" description="Mengen gelten für die angegebene Portionszahl. Der Wareneinsatz je Portion folgt automatisch aus den Lagerpreisen."
        action={canWrite && <Button size="sm" variant="primary" disabled={!inv.data.length} onClick={() => setRecipe({})}>Rezept anlegen</Button>}>
        {rec.data.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rec.data.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex justify-between gap-2">
                  <p className="font-medium">{r.name}</p>
                  <span className="text-sm tabular-nums">{eur(r.perPortion)}<span className="text-muted">/Port.</span></span>
                </div>
                <p className="text-xs text-muted">{r.portions} Portionen · gesamt {eur(r.total)}{r.season ? ` · ${r.season}` : ''}{r.region ? ` · ${r.region}` : ''}</p>
                <ul className="text-sm mt-2 space-y-0.5">{r.items.map((it) => <li key={it.id} className="flex justify-between gap-2"><span>{it.name}</span><span className="text-muted tabular-nums">{it.quantity.toLocaleString('de-DE')} {it.unit} · {eur(it.cost)}</span></li>)}</ul>
                {r.steps && <p className="text-sm text-muted mt-2 whitespace-pre-wrap line-clamp-4">{r.steps}</p>}
                {canWrite && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button size="sm" onClick={() => setProduce(r)} disabled={!r.items.length}>Produktion buchen</Button>
                    <Button size="sm" variant="ghost" onClick={() => setRecipe(r)}>Bearbeiten</Button>
                    <Button size="sm" variant="ghost" onClick={() => removeRecipe(r)}>Löschen</Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : <p className="text-sm text-muted">{inv.data.length ? 'Noch keine Rezepte.' : 'Lege zuerst Zutaten an, dann Rezepte.'}</p>}
      </Section>

      {ing && <IngredientForm initial={ing} onClose={() => setIng(null)} onSaved={() => { setIng(null); inv.reload(); rec.reload() }} />}
      {book && <BookStock item={book} onClose={() => setBook(null)} onSaved={() => { setBook(null); inv.reload(); rec.reload() }} />}
      {recipe && <RecipeForm initial={recipe} ingredients={inv.data} onClose={() => setRecipe(null)} onSaved={() => { setRecipe(null); rec.reload() }} />}
      {produce && <Produce recipe={produce} onClose={() => setProduce(null)} onSaved={() => { setProduce(null); inv.reload(); toast('Produktion gebucht, Lager aktualisiert.') }} />}
    </>
  )
}

function IngredientForm({ initial, onClose, onSaved }) {
  const g = useGastro()
  const [f, setF] = useState({ name: initial.name || '', unit: initial.unit || 'kg', stock: initial.stock ?? '', reorderLevel: initial.reorder_level ?? '', unitCost: initial.unit_cost ?? '', supplier: initial.supplier || '' })
  const { pending, error, run } = useAction()
  const set = (x) => setF((y) => ({ ...y, ...x }))
  const body = () => ({ ...f, stock: parseNum(f.stock), reorderLevel: parseNum(f.reorderLevel), unitCost: parseNum(f.unitCost) })
  return (
    <Modal open onClose={onClose} title={initial.id ? 'Zutat bearbeiten' : 'Zutat anlegen'}
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!f.name.trim()} onClick={() => run(() => (initial.id ? patch(`${g.base}/inventory/${initial.id}`, body()) : post(`${g.base}/inventory`, body()))).then(onSaved).catch(() => {})}>Speichern</Button></>}>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Field label="Zutat">{(id) => <Input id={id} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="z. B. Kartoffeln, festkochend" />}</Field></div>
        <Field label="Einheit">{(id) => <Select id={id} value={f.unit} onChange={(e) => set({ unit: e.target.value })}>{['kg', 'g', 'l', 'ml', 'Stk', 'Bund', 'Pkg'].map((u) => <option key={u}>{u}</option>)}</Select>}</Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label={`Preis je ${f.unit} (€)`}>{(id) => <Input id={id} inputMode="decimal" value={f.unitCost} onChange={(e) => set({ unitCost: e.target.value })} placeholder="0,00" />}</Field>
        <Field label="Bestand">{(id) => <Input id={id} inputMode="decimal" value={f.stock} onChange={(e) => set({ stock: e.target.value })} placeholder="0" />}</Field>
        <Field label="Meldebestand">{(id) => <Input id={id} inputMode="decimal" value={f.reorderLevel} onChange={(e) => set({ reorderLevel: e.target.value })} placeholder="0" />}</Field>
      </div>
      <Field label="Lieferant" optional>{(id) => <Input id={id} value={f.supplier} onChange={(e) => set({ supplier: e.target.value })} />}</Field>
      <p className="text-xs text-muted">Einkaufspreise netto erfassen (Vorsteuer ist abziehbar) — so passt die Wareneinsatzquote zum Nettoverkaufspreis.</p>
      <InlineError error={error} />
    </Modal>
  )
}

function BookStock({ item, onClose, onSaved }) {
  const g = useGastro()
  const [mode, setMode] = useState('in')
  const [qty, setQty] = useState('')
  const { pending, error, run } = useAction()
  const delta = (Number(parseNum(qty)) || 0) * (mode === 'in' ? 1 : -1)
  return (
    <Modal open onClose={onClose} title={`Bestand buchen: ${item.name}`}
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!delta} onClick={() => run(() => patch(`${g.base}/inventory/${item.id}`, { delta })).then(onSaved).catch(() => {})}>Buchen</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Art">{(id) => <Select id={id} value={mode} onChange={(e) => setMode(e.target.value)}><option value="in">Wareneingang (+)</option><option value="out">Verbrauch / Verlust (−)</option></Select>}</Field>
        <Field label={`Menge (${item.unit})`}>{(id) => <Input id={id} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />}</Field>
      </div>
      <p className="text-sm">Neuer Bestand: <b className="tabular-nums">{Math.max(0, Math.round((item.stock + delta) * 1000) / 1000).toLocaleString('de-DE')} {item.unit}</b></p>
      <InlineError error={error} />
    </Modal>
  )
}

function RecipeForm({ initial, ingredients, onClose, onSaved }) {
  const g = useGastro()
  const [f, setF] = useState({ name: initial.name || '', portions: initial.portions || 10, season: initial.season || '', region: initial.region || '', steps: initial.steps || '' })
  const [items, setItems] = useState(initial.items?.length ? initial.items.map((i) => ({ ingredientId: String(i.id), quantity: String(i.quantity) })) : [{ ingredientId: '', quantity: '' }])
  const { pending, error, run } = useAction()
  const set = (x) => setF((y) => ({ ...y, ...x }))
  const total = items.reduce((s, it) => s + (Number(parseNum(it.quantity)) || 0) * (ingredients.find((i) => String(i.id) === it.ingredientId)?.unit_cost || 0), 0)
  const submit = () => run(() => {
    const body = { ...f, items: items.filter((it) => it.ingredientId && Number(parseNum(it.quantity)) > 0).map((it) => ({ ingredientId: Number(it.ingredientId), quantity: parseNum(it.quantity) })) }
    return initial.id ? patch(`${g.base}/recipes/${initial.id}`, body) : post(`${g.base}/recipes`, body)
  }).then(onSaved).catch(() => {})
  return (
    <Modal open onClose={onClose} title={initial.id ? 'Rezept bearbeiten' : 'Rezept anlegen'} width="max-w-2xl"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!f.name.trim()} onClick={submit}>Speichern</Button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-3">
        <div className="sm:col-span-2"><Field label="Name">{(id) => <Input id={id} value={f.name} onChange={(e) => set({ name: e.target.value })} />}</Field></div>
        <Field label="Portionen">{(id) => <Input id={id} type="number" min={1} value={f.portions} onChange={(e) => set({ portions: e.target.value })} />}</Field>
        <Field label="Saison" optional>{(id) => <Input id={id} value={f.season} onChange={(e) => set({ season: e.target.value })} />}</Field>
      </div>
      <Field label={`Zutaten für ${f.portions || 1} Portionen`}>
        <div className="space-y-2">
          {items.map((it, i) => {
            const ing = ingredients.find((x) => String(x.id) === it.ingredientId)
            return (
              <div key={i} className="flex gap-2 items-center">
                <Select value={it.ingredientId} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, ingredientId: e.target.value } : x)))} aria-label="Zutat"><option value="">Zutat wählen</option>{ingredients.map((x) => <option key={x.id} value={x.id}>{x.name} ({eur(x.unit_cost)}/{x.unit})</option>)}</Select>
                <Input value={it.quantity} inputMode="decimal" onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} placeholder="Menge" aria-label="Menge" className="w-28 shrink-0" />
                <span className="text-xs text-muted w-8 shrink-0">{ing?.unit || ''}</span>
                <Button variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Zeile entfernen">✕</Button>
              </div>
            )
          })}
          <Button size="sm" onClick={() => setItems([...items, { ingredientId: '', quantity: '' }])}>Zutat hinzufügen</Button>
        </div>
      </Field>
      <p className="text-sm mb-3">Wareneinsatz gesamt <b>{eur(Math.round(total * 100) / 100)}</b> · je Portion <b>{eur(Math.round((total / Math.max(1, Number(f.portions) || 1)) * 100) / 100)}</b></p>
      <Field label="Region / Herkunft" optional>{(id) => <Input id={id} value={f.region} onChange={(e) => set({ region: e.target.value })} />}</Field>
      <Field label="Zubereitung" optional>{(id) => <Textarea id={id} value={f.steps} onChange={(e) => set({ steps: e.target.value })} />}</Field>
      <InlineError error={error} />
    </Modal>
  )
}

function Produce({ recipe, onClose, onSaved }) {
  const g = useGastro()
  const [portions, setPortions] = useState(String(recipe.portions))
  const { pending, error, run } = useAction()
  const factor = (Number(parseNum(portions)) || 0) / recipe.portions
  return (
    <Modal open onClose={onClose} title={`Produktion buchen: ${recipe.name}`}
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!factor} onClick={() => run(() => post(`${g.base}/recipes/${recipe.id}/produce`, { portions: parseNum(portions) })).then(onSaved).catch(() => {})}>Vom Lager abziehen</Button></>}>
      <Field label="Produzierte Portionen">{(id) => <Input id={id} inputMode="decimal" value={portions} onChange={(e) => setPortions(e.target.value)} />}</Field>
      <ul className="text-sm space-y-0.5">{recipe.items.map((it) => <li key={it.id} className="flex justify-between"><span>{it.name}</span><span className="tabular-nums text-muted">− {(Math.round(it.quantity * factor * 1000) / 1000).toLocaleString('de-DE')} {it.unit}</span></li>)}</ul>
      <InlineError error={error} />
    </Modal>
  )
}
