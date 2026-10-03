import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { post, patch, del } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { PRIORITY_LABELS, GOAL_STATUS, formatDate } from '../lib/format.js'
import { useStartStep, STEP_TYPE_LABEL } from '../lib/steps.js'
import { useAuth } from '../lib/auth.jsx'
import { AskJunisButton } from '../components/AskJunis.jsx'
import { GapBars, Roadmap } from '../components/charts.jsx'
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Progress, Section,
  Select, Textarea, Segmented, useConfirm, useToast, cx,
} from '../components/ui.jsx'

export function GoalsList() {
  useDocumentTitle('Goals')
  const { data, error, loading, hardReload } = useApi('/goals')
  const [filter, setFilter] = useState('active')
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Deine Ziele" onRetry={hardReload} />
  const goals = data.goals.filter((g) => (filter === 'all' ? true : filter === 'active' ? g.status === 'active' : g.status !== 'active'))
  const activeCount = data.goals.filter((g) => g.status === 'active').length
  return (
    <>
      <PageHeader
        title="Goals"
        subtitle="Jedes Ziel wird in benötigte Skills, Lücken und einen konkreten Lernweg übersetzt."
        actions={<Button variant="primary" to="/goals/new">Neues Ziel</Button>}
      />
      {data.goals.length === 0 ? (
        <EmptyState title="Keine Ziele vorhanden." text="Definiere dein erstes Ziel und Junis erstellt daraus deinen Entwicklungsweg." action={<Button variant="primary" to="/goals/new">Ziel erstellen</Button>} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <Segmented value={filter} onChange={setFilter} options={[{ value: 'active', label: 'Aktiv' }, { value: 'other', label: 'Pausiert & erreicht' }, { value: 'all', label: 'Alle' }]} />
            <span className="text-xs text-muted">{activeCount} von {data.limit} aktiven Zielen in deinem Tarif</span>
          </div>
          {goals.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {goals.map((g) => (
                <Link key={g.id} to={`/goals/${g.id}`} className="block">
                  <Card className="p-5 hover:border-line-strong transition-colors h-full">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{g.title}</p>
                      <Badge tone={g.status === 'completed' ? 'ok' : g.status === 'active' ? 'accent' : 'neutral'}>{GOAL_STATUS[g.status]}</Badge>
                    </div>
                    <p className="text-sm text-muted mt-1 line-clamp-2">{g.target_state || g.description || '—'}</p>
                    <div className="flex justify-between text-xs text-muted mt-4 mb-1.5">
                      <span>{g.skillCount} Skills · {g.openGaps} offene Lücken</span>
                      <span className="tabular-nums">{g.progress} %</span>
                    </div>
                    <Progress value={g.progress} />
                  </Card>
                </Link>
              ))}
            </div>
          ) : <p className="text-sm text-muted">Keine Ziele in dieser Ansicht.</p>}
        </>
      )}
    </>
  )
}

export function GoalNew() {
  useDocumentTitle('Neues Ziel')
  const navigate = useNavigate()
  const { aiAvailable } = useAuth()
  const catalog = useApi('/catalog')
  const [mode, setMode] = useState('template')
  const [f, setF] = useState({ templateId: null, title: '', description: '', targetState: '', currentState: '', timeframeWeeks: '', priority: 'medium', skills: [] })
  const set = (p) => setF((x) => ({ ...x, ...p }))
  const { pending, error, run } = useAction()
  if (catalog.loading) return <Loading />
  if (catalog.error) return <ErrorState error={catalog.error} what="Die Zielvorlagen" onRetry={catalog.hardReload} />

  const submit = (e) => {
    e.preventDefault()
    run(async () => {
      const body = mode === 'template'
        ? { templateId: f.templateId, timeframeWeeks: f.timeframeWeeks || null, priority: f.priority, currentState: f.currentState }
        : { ...f, templateId: null, timeframeWeeks: f.timeframeWeeks || null, skills: f.skills.length ? f.skills.map((skillId) => ({ skillId, target: 60 })) : undefined }
      const r = await post('/goals', body)
      navigate(`/goals/${r.goalId}`)
    }).catch(() => {})
  }
  const canSubmit = mode === 'template' ? !!f.templateId : f.title.trim().length > 2

  return (
    <div className="max-w-3xl">
      <PageHeader title="Neues Ziel" back={{ to: '/goals', label: 'Goals' }} />
      <Segmented className="mb-6" value={mode} onChange={setMode} options={[{ value: 'template', label: 'Aus Vorlage' }, { value: 'custom', label: 'Eigenes Ziel' }]} />
      <form onSubmit={submit}>
        {mode === 'template' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
            {catalog.data.goalTemplates.map((t) => (
              <button key={t.id} type="button" onClick={() => set({ templateId: t.id })}
                className={cx('text-left px-4 py-3 rounded-xl border', f.templateId === t.id ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong')}>
                <span className="font-medium block">{t.title}</span>
                <span className="text-xs text-muted">{t.skills.map((s) => s.name).join(' · ')}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <Field label="Titel">{(id) => <Input id={id} value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="z. B. Bewerbung für ein Informatikstudium vorbereiten" />}</Field>
            <Field label="Beschreibung" optional>{(id) => <Textarea id={id} value={f.description} onChange={(e) => set({ description: e.target.value })} />}</Field>
            <Field label="Zielzustand" optional hint="Woran erkennst du, dass du das Ziel erreicht hast?">{(id) => <Input id={id} value={f.targetState} onChange={(e) => set({ targetState: e.target.value })} />}</Field>
            <Field label="Benötigte Skills" optional hint={aiAvailable ? 'Leer lassen: Junis bestimmt die Skills automatisch aus Titel und Beschreibung.' : 'Wähle die Skills, die für dieses Ziel nötig sind. Du kannst sie später ergänzen.'}>
              <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-1">
                {catalog.data.skills.map((s) => (
                  <button key={s.id} type="button" onClick={() => set({ skills: f.skills.includes(s.id) ? f.skills.filter((x) => x !== s.id) : [...f.skills, s.id] })}
                    className={cx('px-2.5 h-8 rounded-md border text-[13px]', f.skills.includes(s.id) ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-2 hover:border-line-strong')}>
                    {s.name}
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
          <Field label="Aktueller Zustand" optional>{(id) => <Input id={id} value={f.currentState} onChange={(e) => set({ currentState: e.target.value })} placeholder="Wo stehst du heute?" />}</Field>
          <Field label="Zeitrahmen (Wochen)" optional>{(id) => <Input id={id} type="number" min={1} max={520} value={f.timeframeWeeks} onChange={(e) => set({ timeframeWeeks: e.target.value })} />}</Field>
          <Field label="Priorität">{(id) => (
            <Select id={id} value={f.priority} onChange={(e) => set({ priority: e.target.value })}>
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          )}</Field>
        </div>
        <InlineError error={error} />
        <div className="flex gap-2 mt-4">
          <Button type="submit" variant="primary" loading={pending} disabled={!canSubmit}>Ziel erstellen</Button>
          <Button variant="ghost" to="/goals">Abbrechen</Button>
        </div>
        {pending && mode === 'custom' && !f.skills.length && aiAvailable && <p className="text-sm text-muted mt-3">Junis bestimmt die benötigten Skills …</p>}
      </form>
    </div>
  )
}

export function GoalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, loading, reload, hardReload } = useApi(`/goals/${id}`)
  const catalog = useApi('/catalog')
  useDocumentTitle(data?.goal.title)
  const { start, pending: stepPending, error: stepError } = useStartStep()
  const action = useAction()
  const [confirm, confirmDialog] = useConfirm()
  const [edit, setEdit] = useState(false)
  const [addSkill, setAddSkill] = useState(false)
  const [milestone, setMilestone] = useState('')

  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Das Ziel" onRetry={hardReload} />
  const { goal, skills, plan, milestones, progress, hiddenSkillCount, projects, missions } = data

  const setStatus = (status) => action.run(async () => {
    await patch(`/goals/${goal.id}`, { status })
    toast(status === 'completed' ? 'Ziel als erreicht markiert.' : 'Status aktualisiert.')
    reload()
  }).catch(() => {})

  const remove = async () => {
    if (!(await confirm({ title: 'Ziel löschen?', text: 'Das Ziel, seine Meilensteine und Skill-Zuordnungen werden gelöscht. Deine Skills, Nachweise und Projekte bleiben erhalten.', confirmLabel: 'Löschen', danger: true }))) return
    await action.run(() => del(`/goals/${goal.id}`)).catch(() => {})
    navigate('/goals')
  }

  return (
    <div className="max-w-5xl">
      {confirmDialog}
      <PageHeader
        back={{ to: '/goals', label: 'Goals' }}
        title={goal.title}
        subtitle={goal.description}
        actions={
          <>
            <AskJunisButton label="Frag Junis zu diesem Ziel" contextType="goal" contextId={goal.id} />
            <Button onClick={() => setEdit(true)}>Bearbeiten</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 md:col-span-2">
          <div className="flex justify-between text-sm"><span className="text-muted">Fortschritt</span><span className="font-semibold tabular-nums">{progress} %</span></div>
          <Progress value={progress} className="mt-2" />
          <p className="text-xs text-muted mt-2">Basiert auf gemessenen Skill-Ständen (Übungen, Projekte, Nachweise) — nicht auf Zeit oder Selbsteinschätzung.</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Status · Priorität</p>
          <p className="font-medium mt-1">{GOAL_STATUS[goal.status]} · {PRIORITY_LABELS[goal.priority]}</p>
          {goal.timeframe_weeks && <p className="text-xs text-muted mt-1">Zeitrahmen: {goal.timeframe_weeks} Wochen ab {formatDate(goal.created_at)}</p>}
        </Card>
        <Card className="p-4 flex flex-col gap-1.5">
          {goal.status === 'active' ? (
            <>
              <Button size="sm" onClick={() => setStatus('completed')} loading={action.pending}>Als erreicht markieren</Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus('paused')}>Pausieren</Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setStatus('active')} loading={action.pending}>Wieder aktivieren</Button>
          )}
          <Button size="sm" variant="ghost" onClick={remove}>Löschen</Button>
        </Card>
      </div>
      <InlineError error={action.error} />

      {(goal.target_state || goal.current_state) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {goal.current_state && <div><p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted">Heute</p><p className="text-sm mt-1">{goal.current_state}</p></div>}
          {goal.target_state && <div><p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted">Zielzustand</p><p className="text-sm mt-1">{goal.target_state}</p></div>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-10">
        <div className="lg:col-span-3">
          <Section title="Skill Gap" action={<Button size="sm" variant="ghost" onClick={() => setAddSkill(true)}>Skill hinzufügen</Button>}>
            {skills.length ? (
              <Card className="p-5">
                <GapBars items={skills} />
                {hiddenSkillCount > 0 && (
                  <p className="text-sm text-muted mt-5 pt-4 border-t border-line">
                    {hiddenSkillCount} weitere Skills sind Teil der vollständigen Skill-Gap-Analyse (Pro). <Link to="/billing" className="text-accent hover:underline">Tarife ansehen</Link>
                  </p>
                )}
              </Card>
            ) : (
              <EmptyState title="Diesem Ziel sind noch keine Skills zugeordnet." text="Füge die Skills hinzu, die für dieses Ziel nötig sind. Daraus entsteht dein Lernweg." action={<Button variant="primary" onClick={() => setAddSkill(true)}>Skill hinzufügen</Button>} />
            )}
          </Section>

          <Section title="Dein Weg" description="Reihenfolge nach Voraussetzungen und Größe der Lücke. Jeder Schritt passt sich an deine Ergebnisse an.">
            {plan.length ? (
              <Card className="p-5">
                <Roadmap
                  steps={plan.map((s, i) => ({ ...s, current: i === 0 }))}
                  renderStep={(s, i) => (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted">{STEP_TYPE_LABEL[s.type]} · {s.minutes} Min.</p>
                        <p className="font-medium">{s.label}</p>
                        <p className="text-sm text-muted mt-0.5">{s.why}</p>
                      </div>
                      <Button size="sm" variant={i === 0 ? 'primary' : 'secondary'} onClick={() => start(s)} loading={stepPending}>{s.type === 'apply' ? 'Mission finden' : 'Starten'}</Button>
                    </div>
                  )}
                />
                <InlineError error={stepError} />
              </Card>
            ) : skills.length ? (
              <EmptyState title="Alle Skill-Lücken dieses Ziels sind geschlossen." text="Markiere das Ziel als erreicht oder erhöhe die Zielwerte." />
            ) : null}
          </Section>
        </div>

        <div className="lg:col-span-2">
          <Section title="Meilensteine">
            <Card className="divide-y divide-line">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 group">
                  <input type="checkbox" className="size-4 accent-accent" checked={!!m.done_at} onChange={(e) => patch(`/milestones/${m.id}`, { done: e.target.checked }).then(reload)} aria-label={m.title} />
                  <span className={cx('text-sm flex-1', m.done_at && 'line-through text-muted')}>{m.title}</span>
                  <button className="text-xs text-faint hover:text-bad opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => del(`/milestones/${m.id}`).then(reload)} aria-label={`${m.title} entfernen`}>Entfernen</button>
                </div>
              ))}
              <form className="flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); if (milestone.trim()) post(`/goals/${goal.id}/milestones`, { title: milestone }).then(() => { setMilestone(''); reload() }) }}>
                <Input value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="Neuer Meilenstein" className="h-9" aria-label="Neuer Meilenstein" />
                <Button type="submit" size="sm" disabled={!milestone.trim()}>Hinzufügen</Button>
              </form>
            </Card>
          </Section>

          <Section title="Projekte" action={<Link to={`/projects?new=1&goal=${goal.id}`} className="text-sm text-muted hover:text-ink">Projekt erstellen</Link>}>
            {projects.length ? (
              <Card className="divide-y divide-line">
                {projects.map((p) => <Link key={p.id} to={`/projects/${p.id}`} className="block px-4 py-2.5 text-sm hover:bg-subtle/60">{p.title}</Link>)}
              </Card>
            ) : <p className="text-sm text-muted">Noch keine Projekte für dieses Ziel.</p>}
          </Section>

          {missions.length > 0 && (
            <Section title="Passende Missions">
              <Card className="divide-y divide-line">
                {missions.map((m) => (
                  <Link key={m.id} to={`/missions?m=${m.id}`} className="block px-4 py-2.5 hover:bg-subtle/60">
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-muted">{m.level} · ca. {m.hours} Std.</p>
                  </Link>
                ))}
              </Card>
            </Section>
          )}
        </div>
      </div>

      {edit && <EditGoalModal goal={goal} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload() }} />}
      {addSkill && catalog.data && <AddSkillModal goalId={goal.id} catalog={catalog.data} existing={skills.map((s) => s.skillId)} onClose={() => setAddSkill(false)} onSaved={() => { setAddSkill(false); reload() }} />}
    </div>
  )
}

function EditGoalModal({ goal, onClose, onSaved }) {
  const [f, setF] = useState({
    title: goal.title, description: goal.description || '', targetState: goal.target_state || '', currentState: goal.current_state || '',
    timeframeWeeks: goal.timeframe_weeks || '', priority: goal.priority,
  })
  const { pending, error, run } = useAction()
  const save = () => run(() => patch(`/goals/${goal.id}`, { ...f, timeframeWeeks: f.timeframeWeeks || null })).then(onSaved).catch(() => {})
  return (
    <Modal open onClose={onClose} title="Ziel bearbeiten" footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" onClick={save} loading={pending}>Speichern</Button></>}>
      <Field label="Titel">{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field>
      <Field label="Beschreibung">{(id) => <Textarea id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field>
      <Field label="Heute">{(id) => <Input id={id} value={f.currentState} onChange={(e) => setF({ ...f, currentState: e.target.value })} />}</Field>
      <Field label="Zielzustand">{(id) => <Input id={id} value={f.targetState} onChange={(e) => setF({ ...f, targetState: e.target.value })} />}</Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Zeitrahmen (Wochen)">{(id) => <Input id={id} type="number" value={f.timeframeWeeks} onChange={(e) => setF({ ...f, timeframeWeeks: e.target.value })} />}</Field>
        <Field label="Priorität">{(id) => <Select id={id} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>{Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
      </div>
      <InlineError error={error} />
    </Modal>
  )
}

function AddSkillModal({ goalId, catalog, existing, onClose, onSaved }) {
  const [skillId, setSkillId] = useState('')
  const [name, setName] = useState('')
  const [target, setTarget] = useState(60)
  const { pending, error, run } = useAction()
  const save = () => run(() => post(`/goals/${goalId}/skills`, skillId ? { skillId, target } : { name, target })).then(onSaved).catch(() => {})
  const available = catalog.skills.filter((s) => !existing.includes(s.id))
  return (
    <Modal open onClose={onClose} title="Skill zum Ziel hinzufügen" footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" onClick={save} loading={pending} disabled={!skillId && !name.trim()}>Hinzufügen</Button></>}>
      <Field label="Skill aus dem Katalog">{(id) => (
        <Select id={id} value={skillId} onChange={(e) => setSkillId(e.target.value)}>
          <option value="">— auswählen —</option>
          {catalog.categories.map((c) => (
            <optgroup key={c} label={c}>{available.filter((s) => s.category === c).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
          ))}
          {available.some((s) => s.custom) && <optgroup label="Eigene Skills">{available.filter((s) => s.custom).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>}
        </Select>
      )}</Field>
      {!skillId && <Field label="Oder eigener Skill">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Mikroskopieren" />}</Field>}
      <Field label={`Benötigter Stand: ${target} %`} hint="50 % = solide Grundlagen, 75 % = sicher.">
        <input type="range" min={10} max={100} step={5} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="w-full accent-accent" />
      </Field>
      <InlineError error={error} />
    </Modal>
  )
}
