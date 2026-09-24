import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { post } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { useAuth } from '../lib/auth.jsx'
import { LEARNING_STYLES } from '../lib/format.js'
import Logo from '../components/Logo.jsx'
import { Button, ErrorState, Field, Input, InlineError, Loading, Textarea, Select, cx, Spinner } from '../components/ui.jsx'

const SITUATIONS = [
  { value: 'student', label: 'Schüler/in oder Student/in' },
  { value: 'professional', label: 'Berufstätig oder selbstständig' },
  { value: 'individual', label: 'Etwas anderes / privat' },
]
const LEVELS = [
  { value: 0, label: 'Keine' },
  { value: 15, label: 'Einstieg' },
  { value: 35, label: 'Grundlagen' },
  { value: 60, label: 'Fortgeschritten' },
  { value: 85, label: 'Sicher' },
]
const TIMES = [60, 120, 180, 300, 480]
const CAREER_OPTIONS = [
  ['', 'Kein konkretes Karriereziel'],
  ['data-scientist', 'Data Scientist'],
  ['web-developer', 'Webentwickler/in'],
  ['founder', 'Gründer/in'],
  ['ux-designer', 'UX/UI Designer/in'],
  ['automation-engineer', 'Automation Specialist'],
]

const STEPS = ['Über dich', 'Situation', 'Interessen', 'Ziel', 'Vorhandene Fähigkeiten', 'Gewünschte Fähigkeiten', 'Lernen', 'Karriere']

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cx('px-3 h-9 rounded-lg border text-sm transition-colors', active ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-line bg-surface hover:border-line-strong text-ink-2')}>
      {children}
    </button>
  )
}

export default function Onboarding() {
  useDocumentTitle('Willkommen')
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const catalog = useApi('/catalog')
  const [step, setStep] = useState(0)
  const [f, setF] = useState({
    name: user.name, age: '', accountType: 'individual', situation: '', interests: [], customInterest: '',
    goalMode: 'template', templateId: null, goalTitle: '', goalDescription: '', timeframeWeeks: '',
    skills: {}, desiredSkills: [], weeklyMinutes: 120, learningStyle: 'mixed', careerPathId: '', careerGoal: '',
  })
  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const { pending, error, run } = useAction()

  const template = catalog.data?.goalTemplates.find((t) => t.id === f.templateId)
  const relevantSkills = useMemo(() => {
    if (!catalog.data) return []
    const goalIds = new Set(template?.skills.map((s) => s.id) || [])
    return catalog.data.skills
      .filter((s) => goalIds.has(s.id) || f.interests.includes(s.category))
      .sort((a, b) => Number(goalIds.has(b.id)) - Number(goalIds.has(a.id)))
      .slice(0, 24)
  }, [catalog.data, template, f.interests])

  if (catalog.loading) return <Loading />
  if (catalog.error) return <div className="max-w-lg mx-auto mt-20 px-4"><ErrorState error={catalog.error} what="Das Onboarding" onRetry={catalog.hardReload} /></div>
  const { goalTemplates, categories, skills: allSkills } = catalog.data

  const canNext = [
    () => f.name.trim().length > 0,
    () => true,
    () => true,
    () => (f.goalMode === 'template' ? !!f.templateId : f.goalTitle.trim().length > 2),
    () => true,
    () => true,
    () => true,
    () => true,
  ][step]()

  const finish = () => run(async () => {
    const interests = [...f.interests, ...(f.customInterest.trim() ? [f.customInterest.trim()] : [])]
    const desired = f.desiredSkills.length ? f.desiredSkills : template?.skills.map((s) => s.id) || []
    const r = await post('/auth/onboarding', {
      name: f.name, age: f.age || null, accountType: f.accountType, situation: f.situation, interests,
      goal: f.goalMode === 'template' ? { templateId: f.templateId, timeframeWeeks: f.timeframeWeeks || null } : { title: f.goalTitle, description: f.goalDescription, timeframeWeeks: f.timeframeWeeks || null },
      skills: Object.entries(f.skills).filter(([, v]) => v > 0).map(([skillId, selfLevel]) => ({ skillId, selfLevel })),
      desiredSkills: desired,
      weeklyMinutes: f.weeklyMinutes, learningStyle: f.learningStyle,
      careerPathId: f.careerPathId || null, careerGoal: f.careerGoal || CAREER_OPTIONS.find(([v]) => v === f.careerPathId)?.[1] || null,
    })
    setUser(r.user)
    navigate('/', { replace: true })
  }).catch(() => {})

  if (pending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <Spinner className="size-6 text-accent" />
        <p className="text-xl font-semibold mt-6">Wir erstellen deinen ersten Junis Plan.</p>
        <p className="text-muted mt-2 max-w-sm">Junis bestimmt die benötigten Skills, vergleicht sie mit deinem Stand und legt den ersten Schritt fest.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="h-16 border-b border-line flex items-center px-4 sm:px-8">
        <Logo />
        <span className="ml-auto text-sm text-muted tabular-nums">Schritt {step + 1} von {STEPS.length}</span>
      </header>
      <div className="h-0.5 bg-subtle"><div className="h-full bg-accent transition-[width]" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      <main className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted">{STEPS[step]}</p>

        {step === 0 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-8">Wie dürfen wir dich nennen?</h1>
            <Field label="Name">{(id) => <Input id={id} value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus />}</Field>
            <Field label="Alter" optional hint="Hilft Junis, Erklärungen passend zu formulieren.">{(id) => <Input id={id} type="number" min={6} max={120} value={f.age} onChange={(e) => set({ age: e.target.value })} className="max-w-32" />}</Field>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-8">Was beschreibt deine aktuelle Situation?</h1>
            <div className="grid gap-2 mb-6">
              {SITUATIONS.map((s) => (
                <button key={s.value} type="button" onClick={() => set({ accountType: s.value })}
                  className={cx('text-left px-4 py-3 rounded-xl border', f.accountType === s.value ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong')}>
                  {s.label}
                </button>
              ))}
            </div>
            <Field label="In einem Satz" optional>{(id) => <Input id={id} placeholder="z. B. 11. Klasse, Gymnasium · Marketing-Managerin mit 5 Jahren Erfahrung" value={f.situation} onChange={(e) => set({ situation: e.target.value })} />}</Field>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-8">Wofür interessierst du dich?</h1>
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map((c) => <Chip key={c} active={f.interests.includes(c)} onClick={() => set({ interests: f.interests.includes(c) ? f.interests.filter((x) => x !== c) : [...f.interests, c] })}>{c}</Chip>)}
            </div>
            <Field label="Weiteres Interesse" optional>{(id) => <Input id={id} value={f.customInterest} onChange={(e) => set({ customInterest: e.target.value })} placeholder="z. B. Robotik" />}</Field>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-2">Was möchtest du erreichen?</h1>
            <p className="text-muted mb-6">Wähle ein Ziel oder formuliere dein eigenes. Weitere Ziele kannst du später hinzufügen.</p>
            <div className="flex gap-2 mb-5">
              <Chip active={f.goalMode === 'template'} onClick={() => set({ goalMode: 'template' })}>Ziel auswählen</Chip>
              <Chip active={f.goalMode === 'custom'} onClick={() => set({ goalMode: 'custom' })}>Eigenes Ziel</Chip>
            </div>
            {f.goalMode === 'template' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {goalTemplates.map((t) => (
                  <button key={t.id} type="button" onClick={() => set({ templateId: t.id })}
                    className={cx('text-left px-4 py-3 rounded-xl border', f.templateId === t.id ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong')}>
                    <span className="font-medium block">{t.title}</span>
                    <span className="text-xs text-muted">{t.description}</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <Field label="Ziel">{(id) => <Input id={id} value={f.goalTitle} onChange={(e) => set({ goalTitle: e.target.value })} placeholder="z. B. Eine eigene App veröffentlichen" />}</Field>
                <Field label="Beschreibung" optional hint="Je genauer, desto besser kann Junis die benötigten Skills bestimmen.">{(id) => <Textarea id={id} value={f.goalDescription} onChange={(e) => set({ goalDescription: e.target.value })} />}</Field>
              </>
            )}
            <div className="mt-4">
              <Field label="Zeitrahmen in Wochen" optional>{(id) => <Input id={id} type="number" min={1} max={520} className="max-w-32" value={f.timeframeWeeks} onChange={(e) => set({ timeframeWeeks: e.target.value })} />}</Field>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-2">Was kannst du bereits?</h1>
            <p className="text-muted mb-6">Eine ehrliche Selbsteinschätzung reicht. Sie hilft beim Start, zählt aber nicht als Nachweis — Junis prüft deinen Stand später mit Übungen.</p>
            {!relevantSkills.length && <p className="text-sm text-muted">Wähle im vorherigen Schritt Interessen oder ein Ziel, um passende Skills zu sehen.</p>}
            <div className="divide-y divide-line border border-line rounded-xl bg-surface">
              {relevantSkills.map((s) => (
                <div key={s.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="text-sm flex-1">{s.name}<span className="text-faint"> · {s.category}</span></span>
                  <div className="flex flex-wrap gap-1">
                    {LEVELS.map((l) => (
                      <button key={l.value} type="button" onClick={() => set({ skills: { ...f.skills, [s.id]: l.value } })}
                        className={cx('px-2 h-7 rounded-md text-xs border', (f.skills[s.id] ?? 0) === l.value ? 'bg-ink text-white border-ink' : 'border-line text-muted hover:text-ink')}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-2">Welche Fähigkeiten möchtest du aufbauen?</h1>
            <p className="text-muted mb-6">{template ? 'Die Skills deines Ziels sind bereits berücksichtigt. Ergänze weitere, wenn du möchtest.' : 'Wähle die Skills, die dir wichtig sind.'}</p>
            <div className="flex flex-wrap gap-2">
              {allSkills.filter((s) => !template?.skills.some((t) => t.id === s.id)).filter((s) => !f.interests.length || f.interests.includes(s.category) || f.desiredSkills.includes(s.id)).map((s) => (
                <Chip key={s.id} active={f.desiredSkills.includes(s.id)} onClick={() => set({ desiredSkills: f.desiredSkills.includes(s.id) ? f.desiredSkills.filter((x) => x !== s.id) : [...f.desiredSkills, s.id] })}>{s.name}</Chip>
              ))}
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-8">Wie lernst du?</h1>
            <Field label="Lernzeit pro Woche">
              <div className="flex flex-wrap gap-2">
                {TIMES.map((t) => <Chip key={t} active={f.weeklyMinutes === t} onClick={() => set({ weeklyMinutes: t })}>{t < 120 ? `${t} Min.` : `${t / 60} Std.`}</Chip>)}
              </div>
            </Field>
            <Field label="Bevorzugte Lernweise">
              <div className="flex flex-wrap gap-2">
                {Object.entries(LEARNING_STYLES).map(([v, l]) => <Chip key={v} active={f.learningStyle === v} onClick={() => set({ learningStyle: v })}>{l}</Chip>)}
              </div>
            </Field>
          </>
        )}

        {step === 7 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-2">Hast du ein Karriereziel?</h1>
            <p className="text-muted mb-6">Optional. Junis zeigt dir Wege und Optionen — ohne Erfolgsgarantien.</p>
            <Field label="Karriereweg">{(id) => (
              <Select id={id} value={f.careerPathId} onChange={(e) => set({ careerPathId: e.target.value })}>
                {CAREER_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            )}</Field>
            {!f.careerPathId && <Field label="Oder in eigenen Worten" optional>{(id) => <Input id={id} value={f.careerGoal} onChange={(e) => set({ careerGoal: e.target.value })} placeholder="z. B. Lehrerin für Biologie" />}</Field>}
          </>
        )}

        <InlineError error={error} />
        <div className="flex items-center justify-between mt-10">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>Zurück</Button>
          {step < STEPS.length - 1
            ? <Button variant="primary" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Weiter</Button>
            : <Button variant="primary" onClick={finish}>Junis Plan erstellen</Button>}
        </div>
      </main>
    </div>
  )
}
