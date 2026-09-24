import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { post } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { useAuth } from '../lib/auth.jsx'
import { euro } from '../lib/format.js'
import Logo from '../components/Logo.jsx'
import { Button, Field, Input, InlineError, Checkbox, Segmented } from '../components/ui.jsx'

function PublicShell({ children, narrow }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-canvas">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" to="/login">Anmelden</Button>
            <Button variant="primary" to="/register">Kostenlos starten</Button>
          </nav>
        </div>
      </header>
      <main className={narrow ? 'flex-1 w-full max-w-sm mx-auto px-4 py-14' : 'flex-1'}>{children}</main>
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-xs text-muted flex flex-wrap gap-x-5 gap-y-2">
          <span>© {new Date().getFullYear()} JunisWorld</span>
          <Link to="/legal/impressum" className="hover:text-ink">Impressum</Link>
          <Link to="/legal/datenschutz" className="hover:text-ink">Datenschutz</Link>
          <Link to="/legal/agb" className="hover:text-ink">AGB</Link>
          <Link to="/legal/cookies" className="hover:text-ink">Cookie-Einstellungen</Link>
        </div>
      </footer>
    </div>
  )
}

const JOURNEY = [
  ['Ziel', 'Du legst fest, wohin du willst.'],
  ['Verstehen', 'Junis erfasst deinen aktuellen Stand.'],
  ['Lücke', 'Die Skill-Gap-Analyse zeigt, was fehlt.'],
  ['Weg', 'Ein persönlicher, anpassbarer Lernweg entsteht.'],
  ['Lernen & Üben', 'Adaptive Lektionen und Aufgaben.'],
  ['Bauen', 'Echte Projekte und Missions.'],
  ['Nachweisen', 'Skills werden durch Tests und Projekte belegt.'],
]

export function Landing() {
  useDocumentTitle(null)
  const [cycle, setCycle] = useState('monthly')
  const plans = useApi('/plans')
  return (
    <PublicShell>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16">
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted mb-5">Lernen · Wachsen · Erreichen</p>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight max-w-3xl leading-[1.1]">
          Vom heutigen Stand systematisch zu deinem Ziel.
        </h1>
        <p className="text-lg text-muted mt-6 max-w-2xl">
          JunisWorld verbindet Lernen, Üben, Projekte, Skills und Karriere in einem System. Jede Aufgabe beantwortet eine Frage:
          <span className="text-ink"> Warum lerne ich das gerade — und wie bringt es mich meinem Ziel näher?</span>
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="primary" size="lg" to="/register">Ersten Junis-Plan erstellen</Button>
          <Button size="lg" href="#preise">Tarife ansehen</Button>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted mb-8">So arbeitet JunisWorld</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-6">
            {JOURNEY.map(([t, d], i) => (
              <li key={t}>
                <span className="text-xs text-faint tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <p className="font-medium mt-1">{t}</p>
                <p className="text-sm text-muted mt-1">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-3 gap-10">
        {[
          ['Skill Graph statt Prozentzahlen', 'Für jeden Skill: Wissen, praktische Erfahrung, Fehlerquote, letzte Prüfung und Nachweise. Selbsteinschätzung zählt nie als Fortschritt.'],
          ['Adaptiv, nicht starr', 'Viele richtige Antworten erhöhen die Schwierigkeit. Häufige Fehler führen zu einer neuen Erklärung. Lange nicht genutzte Skills werden wiederholt.'],
          ['Nachweise statt Versprechen', 'Ein Skill gilt erst als verifiziert, wenn ein anspruchsvoller Test und ein angewandtes Projekt vorliegen. Keine erfundenen Zertifikate.'],
        ].map(([t, d]) => (
          <div key={t}>
            <p className="font-medium">{t}</p>
            <p className="text-sm text-muted mt-2 leading-relaxed">{d}</p>
          </div>
        ))}
      </section>

      <section id="preise" className="border-t border-line bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Tarife</h2>
              <p className="text-muted mt-1">Transparent, monatlich kündbar. Keine versteckten Kosten.</p>
            </div>
            <Segmented value={cycle} onChange={setCycle} options={[{ value: 'monthly', label: 'Monatlich' }, { value: 'yearly', label: 'Jährlich' }]} />
          </div>
          {plans.data && <PlanGrid plans={plans.data.plans} cycle={cycle} />}
        </div>
      </section>
    </PublicShell>
  )
}

export function PlanGrid({ plans, cycle, current, action }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {plans.map((p) => {
        const price = cycle === 'yearly' ? p.yearly : p.monthly
        return (
          <div key={p.id} className={`rounded-xl border p-5 flex flex-col ${current === p.id ? 'border-accent ring-3 ring-accent/10 bg-surface' : 'border-line bg-surface'}`}>
            <div className="flex items-center justify-between">
              <p className="font-semibold">{p.name}</p>
              {current === p.id && <span className="text-xs text-accent font-medium">Aktueller Tarif</span>}
            </div>
            <p className="mt-3">
              <span className="text-2xl font-semibold tabular-nums">{euro(price)}</span>
              <span className="text-sm text-muted"> {price === 0 ? '' : `${p.perSeat ? 'pro Nutzer / ' : '/ '}${cycle === 'yearly' ? 'Jahr' : 'Monat'}`}</span>
            </p>
            <p className="text-sm text-muted mt-2">{p.summary}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-ink-2 flex-1">
              {p.features.map((f) => <li key={f} className="flex gap-2"><span className="text-accent" aria-hidden>✓</span>{f}</li>)}
            </ul>
            {action && <div className="mt-5">{action(p)}</div>}
          </div>
        )
      })}
    </div>
  )
}

export function Login() {
  useDocumentTitle('Anmelden')
  const [params] = useSearchParams()
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const { pending, error, run } = useAction()
  const submit = (e) => {
    e.preventDefault()
    run(async () => {
      await post('/auth/login', form)
      await refresh()
      navigate(params.get('next') || '/', { replace: true })
    }).catch(() => {})
  }
  return (
    <PublicShell narrow>
      <h1 className="text-2xl font-semibold tracking-tight">Anmelden</h1>
      <p className="text-muted mt-1 mb-8">Willkommen zurück.</p>
      <form onSubmit={submit}>
        <Field label="E-Mail">{(id) => <Input id={id} type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
        <Field label="Passwort">{(id) => <Input id={id} type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</Field>
        <InlineError error={error} />
        <Button type="submit" variant="primary" size="lg" className="w-full mt-4" loading={pending}>Anmelden</Button>
      </form>
      <p className="text-sm text-muted mt-6">Noch kein Konto? <Link to="/register" className="text-accent hover:underline">Kostenlos registrieren</Link></p>
    </PublicShell>
  )
}

export function Register() {
  useDocumentTitle('Registrieren')
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', acceptTerms: false })
  const { pending, error, run } = useAction()
  const submit = (e) => {
    e.preventDefault()
    run(async () => {
      await post('/auth/register', form)
      await refresh()
      navigate('/', { replace: true })
    }).catch(() => {})
  }
  return (
    <PublicShell narrow>
      <h1 className="text-2xl font-semibold tracking-tight">Konto erstellen</h1>
      <p className="text-muted mt-1 mb-8">Kostenlos. Danach erstellt Junis deinen ersten Plan.</p>
      <form onSubmit={submit}>
        <Field label="Name">{(id) => <Input id={id} autoComplete="given-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
        <Field label="E-Mail">{(id) => <Input id={id} type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
        <Field label="Passwort" hint="Mindestens 10 Zeichen.">{(id) => <Input id={id} type="password" autoComplete="new-password" minLength={10} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</Field>
        <Checkbox
          checked={form.acceptTerms}
          onChange={(v) => setForm({ ...form, acceptTerms: v })}
          label={<>Ich akzeptiere die <Link to="/legal/agb" className="text-accent underline" target="_blank">AGB</Link> und habe die <Link to="/legal/datenschutz" className="text-accent underline" target="_blank">Datenschutzerklärung</Link> zur Kenntnis genommen.</>}
        />
        <InlineError error={error} />
        <Button type="submit" variant="primary" size="lg" className="w-full mt-4" loading={pending} disabled={!form.acceptTerms}>Konto erstellen</Button>
      </form>
      <p className="text-sm text-muted mt-6">Bereits registriert? <Link to="/login" className="text-accent hover:underline">Anmelden</Link></p>
    </PublicShell>
  )
}
