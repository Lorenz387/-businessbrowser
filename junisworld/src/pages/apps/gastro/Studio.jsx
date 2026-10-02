import { useRef, useState } from 'react'
import { post, del } from '../../../lib/api.js'
import { useApi, useAction } from '../../../lib/hooks.js'
import Markdown from '../../../components/Markdown.jsx'
import { Button, Card, EmptyState, Field, Input, InlineError, Section, Segmented, Textarea, useToast } from '../../../components/ui.jsx'
import { useGastro, mondayOf, addDays, printText, dayLabel } from './shared.jsx'

const TOOLS = [
  { value: 'dish', label: 'Neues Gericht' },
  { value: 'week', label: '7-Tage-Plan' },
  { value: 'tips', label: 'Gericht verbessern' },
  { value: 'menu', label: 'Karte analysieren' },
  { value: 'general', label: 'Freie Frage' },
]
const KIND = { dish: 'Gericht', week: 'Wochenplan', tips: 'Verbesserung', menu: 'Kartenanalyse', general: 'Antwort', planning: 'Planung' }
const CHIPS = [
  'Plane die Mise en place für einen Samstag mit 80 Gästen.',
  'Wie senke ich den Wareneinsatz, ohne die Qualität zu verschlechtern?',
  'Welche Gerichte eignen sich für einen Mittagstisch unter 12 € Verkaufspreis?',
  'Erstelle eine Checkliste für den Wochenabschluss in der Küche.',
]

export default function Studio() {
  const g = useGastro()
  const toast = useToast()
  const plans = useApi(`${g.base}/plans`)
  const [tool, setTool] = useState('dish')
  const [f, setF] = useState({ idea: '', season: '', region: '', price: '', include: '', week: mondayOf(addDays(g.today, 7)) })
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState(null)
  const [open, setOpen] = useState(null)
  const ai = useAction()
  const resultRef = useRef(null)
  const set = (x) => setF((y) => ({ ...y, ...x }))
  const run = () => {
    const context = tool === 'general' || tool === 'menu' ? {} : { Gerichtsidee: f.idea, Saison: f.season, Region: f.region, Zielpreis: f.price, 'Zutaten / Ausschlüsse': f.include, ...(tool === 'week' ? { Wochenstart: f.week } : {}) }
    ai.run(() => post(`${g.base}/ai`, { mode: tool, prompt, context })).then((r) => setResult({ mode: tool, text: r.text })).catch(() => {})
  }
  const save = () => {
    const title = result.mode === 'week' ? `Wochenplan ab ${dayLabel(f.week, { day: '2-digit', month: '2-digit', year: 'numeric' })}` : `${KIND[result.mode]}: ${(f.idea || prompt || 'ohne Titel').slice(0, 80)}`
    post(`${g.base}/plans`, { kind: result.mode, title, content: result.text, weekStart: result.mode === 'week' ? f.week : null }).then(() => { toast('Gespeichert.'); plans.reload() })
  }
  const print = (title, el) => { if (!printText(title, el?.innerHTML || '')) toast('Pop-up blockiert — bitte erlauben.', 'bad') }

  if (!g.aiAvailable) {
    return <EmptyState title="Das KI-Kochstudio braucht Junis AI." text="Auf diesem Server ist kein KI-Schlüssel hinterlegt (ANTHROPIC_API_KEY). Alle anderen GastroFlow-Bereiche funktionieren ohne KI." />
  }
  return (
    <>
      <Segmented className="mb-5" value={tool} onChange={(v) => { setTool(v); setResult(null) }} options={TOOLS} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="p-5 lg:col-span-2 self-start">
          {['dish', 'week', 'tips'].includes(tool) && (
            <>
              <Field label={tool === 'tips' ? 'Gericht / Konzept' : 'Richtung oder Idee'} optional={tool !== 'tips'}>{(id) => <Input id={id} value={f.idea} onChange={(e) => set({ idea: e.target.value })} placeholder={tool === 'tips' ? 'z. B. Rinderroulade mit Rotkohl und Klößen' : 'z. B. vegetarisches Hauptgericht'} />}</Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Saison" optional>{(id) => <Input id={id} value={f.season} onChange={(e) => set({ season: e.target.value })} placeholder="Herbst" />}</Field>
                <Field label="Region" optional>{(id) => <Input id={id} value={f.region} onChange={(e) => set({ region: e.target.value })} placeholder="Brandenburg" />}</Field>
              </div>
              {tool !== 'tips' && <Field label="Zielpreis (brutto)" optional>{(id) => <Input id={id} value={f.price} onChange={(e) => set({ price: e.target.value })} placeholder="18,50 €" />}</Field>}
              {tool === 'week' && <Field label="Wochenstart">{(id) => <Input id={id} type="date" value={f.week} onChange={(e) => set({ week: e.target.value })} />}</Field>}
              <Field label="Vorhandene Zutaten / Ausschlüsse" optional>{(id) => <Textarea id={id} value={f.include} onChange={(e) => set({ include: e.target.value })} className="min-h-16" placeholder="z. B. Kürbis vorrätig, glutenfrei, keine Nüsse" />}</Field>
            </>
          )}
          {tool === 'menu' && <p className="text-sm text-muted mb-3">Analysiert deine aktive Speisekarte mit den berechneten Wareneinsatzquoten und schlägt Preis-, Portions- und Rezepturänderungen vor.</p>}
          <Field label={tool === 'general' ? 'Deine Aufgabe' : 'Zusätzliche Wünsche'} optional={tool !== 'general'}>{(id) => <Textarea id={id} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-20" />}</Field>
          {tool === 'general' && <div className="flex flex-wrap gap-1.5 mb-3">{CHIPS.map((c) => <button key={c} onClick={() => setPrompt(c)} className="text-xs rounded-full border border-line px-2.5 py-1 hover:bg-subtle text-left">{c}</button>)}</div>}
          <Button variant="primary" onClick={run} loading={ai.pending} disabled={(tool === 'general' && !prompt.trim()) || (tool === 'tips' && !f.idea.trim())}>{ai.pending ? 'KI arbeitet …' : 'Erstellen'}</Button>
          <p className="text-xs text-muted mt-3">Die KI kennt dein Konzept, deine Karte mit Wareneinsatz und deine Lagerpreise. Annahmen vor der Umsetzung prüfen; Allergenangaben immer gegen das echte Rezept kontrollieren.</p>
          <InlineError error={ai.error} />
        </Card>
        <div className="lg:col-span-3">
          {result ? (
            <Card className="p-5">
              <div ref={resultRef}><Markdown>{result.text}</Markdown></div>
              <div className="flex flex-wrap gap-2 mt-4 border-t border-line pt-3">
                <Button size="sm" variant="primary" onClick={save}>Speichern</Button>
                <Button size="sm" onClick={() => navigator.clipboard?.writeText(result.text).then(() => toast('Kopiert.'))}>Kopieren</Button>
                <Button size="sm" onClick={() => print(KIND[result.mode], resultRef.current)}>Drucken / PDF</Button>
              </div>
            </Card>
          ) : <EmptyState title="Noch kein Ergebnis." text="Fülle das Briefing aus und starte. Gespeicherte Ergebnisse findest du unten." />}
        </div>
      </div>
      <Section title="Gespeicherte Pläne & Gerichte" className="mt-8">
        {plans.data?.length ? (
          <Card className="divide-y divide-line">
            {plans.data.map((p) => (
              <div key={p.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setOpen(open === p.id ? null : p.id)} className="text-sm font-medium text-left flex-1 hover:underline" aria-expanded={open === p.id}>{p.title}</button>
                  <span className="text-xs text-muted">{p.author || ''} · {dayLabel(p.created_at.slice(0, 10), { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  <button onClick={() => del(`${g.base}/plans/${p.id}`).then(plans.reload)} className="text-xs text-faint hover:text-bad">Löschen</button>
                </div>
                {open === p.id && <div className="mt-3"><div id={`plan-${p.id}`}><Markdown>{p.content}</Markdown></div><Button size="sm" className="mt-2" onClick={() => print(p.title, document.getElementById(`plan-${p.id}`))}>Drucken / PDF</Button></div>}
              </div>
            ))}
          </Card>
        ) : <p className="text-sm text-muted">Noch nichts gespeichert.</p>}
      </Section>
    </>
  )
}
