import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi, useDocumentTitle } from '../lib/hooks.js'
import { greeting, formatDate, relative } from '../lib/format.js'
import { useStartStep, STEP_TYPE_LABEL } from '../lib/steps.js'
import { useJunis } from '../components/AskJunis.jsx'
import { useAuth } from '../lib/auth.jsx'
import { Button, Card, EmptyState, ErrorState, InlineError, Loading, PageHeader, Progress, Section, Badge } from '../components/ui.jsx'

export default function Home() {
  useDocumentTitle('Home')
  const { data, error, loading, hardReload } = useApi('/dashboard')
  const openJunis = useJunis()
  const { aiAvailable } = useAuth()
  const [q, setQ] = useState('')
  const { start, pending, error: stepError } = useStartStep()

  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Dein Dashboard" onRetry={hardReload} />
  const { daily, goals, project, skillDevelopment, staleSkills } = data
  const task = daily.task

  return (
    <div className="max-w-4xl">
      <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted">Junis</p>
      <h1 className="text-3xl font-semibold tracking-tight mt-2">{greeting()}, {data.name}.</h1>
      <p className="text-muted mt-1">Was möchtest du heute erreichen?</p>
      <form
        className="mt-6 mb-10 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); if (q.trim()) { openJunis({ prompt: q.trim(), autoSend: true }); setQ('') } }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={aiAvailable ? 'Frag Junis etwas …' : 'Junis AI ist auf diesem Server noch nicht eingerichtet'}
          disabled={!aiAvailable}
          className="flex-1 h-12 rounded-xl border border-line bg-surface px-4 text-[15px] placeholder:text-faint focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent/10 disabled:bg-subtle"
          aria-label="Frag Junis"
        />
        <Button type="submit" variant="primary" size="lg" disabled={!q.trim()}>Fragen</Button>
      </form>

      <Section title="Heute">
        {task ? (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-muted">Nächster Schritt · {STEP_TYPE_LABEL[task.type]}</p>
                <p className="text-lg font-semibold mt-1">{task.label}</p>
                <p className="text-sm text-muted mt-0.5">{task.minutes} Minuten</p>
              </div>
              <Button variant="primary" onClick={() => start(task)} loading={pending}>
                {task.type === 'apply' ? 'Passende Mission finden' : 'Jetzt starten'}
              </Button>
            </div>
            <p className="text-sm text-ink-2 mt-4 pt-4 border-t border-line"><span className="text-muted">Warum? </span>{task.why}</p>
            <InlineError error={stepError} />
          </Card>
        ) : goals.length ? (
          <EmptyState title="Alle Skill-Lücken deiner aktiven Ziele sind geschlossen." text="Setze höhere Zielwerte, lege ein neues Ziel an oder wende deine Skills in einem Projekt an." action={<Button variant="primary" to="/goals/new">Neues Ziel</Button>} secondary={<Button to="/projects?new=1">Projekt erstellen</Button>} />
        ) : (
          <EmptyState title="Keine aktiven Ziele." text="Definiere ein Ziel und Junis erstellt daraus deinen Entwicklungsweg." action={<Button variant="primary" to="/goals/new">Ziel erstellen</Button>} />
        )}

        {(daily.review || daily.project || daily.recommendation) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            {daily.review && (
              <Card className="p-4">
                <p className="text-xs text-muted">Wiederholung</p>
                <p className="font-medium mt-1 truncate">{daily.review.name}</p>
                <Button size="sm" className="mt-3" onClick={() => start({ type: 'review', skillId: daily.review.skillId })} loading={pending}>Wiederholen · 5 Min.</Button>
              </Card>
            )}
            {daily.project && (
              <Card className="p-4">
                <p className="text-xs text-muted">Projektfortschritt</p>
                <Link to={`/projects/${daily.project.id}`} className="font-medium mt-1 block truncate hover:underline underline-offset-2">{daily.project.title}</Link>
                <p className="text-xs text-muted mt-1 truncate">{daily.project.nextTask ? `Als Nächstes: ${daily.project.nextTask.title}` : 'Alle Aufgaben erledigt'}</p>
              </Card>
            )}
            {daily.recommendation && (
              <Card className="p-4">
                <p className="text-xs text-muted">Empfohlene Mission</p>
                <Link to={`/missions?m=${daily.recommendation.id}`} className="font-medium mt-1 block truncate hover:underline underline-offset-2">{daily.recommendation.title}</Link>
                <p className="text-xs text-muted mt-1 line-clamp-2">{daily.recommendation.reason}</p>
              </Card>
            )}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <Section title="Aktive Ziele" action={<Link to="/goals" className="text-sm text-muted hover:text-ink">Alle</Link>}>
          {goals.length ? (
            <Card className="divide-y divide-line">
              {goals.map((g) => (
                <Link key={g.id} to={`/goals/${g.id}`} className="block px-4 py-3.5 hover:bg-subtle/60">
                  <div className="flex justify-between gap-3 text-sm"><span className="font-medium truncate">{g.title}</span><span className="tabular-nums text-muted">{g.progress} %</span></div>
                  <Progress value={g.progress} className="mt-2" label={`Fortschritt ${g.title}`} />
                </Link>
              ))}
            </Card>
          ) : <p className="text-sm text-muted">Noch keine aktiven Ziele.</p>}
        </Section>

        <Section title="Aktives Projekt" action={<Link to="/projects" className="text-sm text-muted hover:text-ink">Alle</Link>}>
          {project ? (
            <Card className="p-4">
              <Link to={`/projects/${project.id}`} className="font-medium hover:underline underline-offset-2">{project.title}</Link>
              <div className="flex justify-between text-sm text-muted mt-1"><span>{project.doneCount} von {project.taskCount} Aufgaben</span><span className="tabular-nums">{project.progress} %</span></div>
              <Progress value={project.progress} className="mt-2" />
            </Card>
          ) : <p className="text-sm text-muted">Noch kein Projekt. <Link to="/projects?new=1" className="text-accent hover:underline">Projekt erstellen</Link> oder <Link to="/missions" className="text-accent hover:underline">Mission starten</Link>.</p>}
        </Section>
      </div>

      <Section title="Skill-Entwicklung · letzte 7 Tage" action={<Link to="/weekly" className="text-sm text-muted hover:text-ink">Wochenrückblick</Link>}>
        {skillDevelopment.length ? (
          <Card className="divide-y divide-line">
            {skillDevelopment.map((s) => (
              <Link key={s.skillId} to={`/skills/${s.skillId}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-subtle/60">
                <span>{s.name}</span>
                <span className={`tabular-nums ${s.delta > 0 ? 'text-ok' : 'text-bad'}`}>{s.delta > 0 ? '+' : ''}{s.delta} %</span>
              </Link>
            ))}
          </Card>
        ) : <p className="text-sm text-muted">Noch keine gemessene Veränderung in dieser Woche. Lektionen, Übungen und Projekte fließen hier ein.</p>}
        {staleSkills.length > 0 && (
          <p className="text-sm text-muted mt-3">Länger nicht genutzt: {staleSkills.map((s, i) => <span key={s.id}>{i > 0 && ', '}<Link to={`/skills/${s.id}`} className="text-ink hover:underline">{s.name}</Link></span>)} — eine Wiederholung hält das Wissen frisch.</p>
        )}
      </Section>
    </div>
  )
}

const ACTIVITY_LABEL = {
  lesson_completed: 'Lektion',
  practice_completed: 'Übung',
  review_completed: 'Wiederholung',
  mission_step: 'Mission',
}

export function Weekly() {
  useDocumentTitle('Wochenrückblick')
  const { data, error, loading, hardReload } = useApi('/weekly')
  const { start, pending } = useStartStep()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Der Wochenrückblick" onRetry={hardReload} />
  const empty = !data.learned.length && !data.skillGains.length && !data.projects.length
  return (
    <div className="max-w-3xl">
      <PageHeader title="Wochenrückblick" subtitle={`Seit ${formatDate(data.since)} · ${data.minutes} erfasste Lernminuten`} />
      {empty && <EmptyState title="In den letzten 7 Tagen gab es noch keine Lernaktivität." text="Starte mit deinem nächsten Schritt — der Rückblick füllt sich automatisch." action={<Button variant="primary" to="/">Zum nächsten Schritt</Button>} className="mb-8" />}
      {!empty && (
        <>
          <Section title="Was du gelernt hast">
            <Card className="divide-y divide-line">
              {data.learned.slice(0, 15).map((a) => (
                <div key={a.id} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="truncate"><Badge className="mr-2">{ACTIVITY_LABEL[a.type]}</Badge>{a.title}</span>
                  <span className="text-muted shrink-0">{relative(a.created_at)}</span>
                </div>
              ))}
              {!data.learned.length && <p className="px-4 py-3 text-sm text-muted">Keine Lektionen oder Übungen in dieser Woche.</p>}
            </Card>
          </Section>
          <Section title="Welche Skills gestiegen sind">
            {data.skillGains.length ? (
              <Card className="divide-y divide-line">
                {data.skillGains.map((s) => (
                  <Link key={s.skillId} to={`/skills/${s.skillId}`} className="flex justify-between px-4 py-2.5 text-sm hover:bg-subtle/60">
                    <span>{s.name}</span><span className={`tabular-nums ${s.delta >= 0 ? 'text-ok' : 'text-bad'}`}>{s.delta > 0 ? '+' : ''}{s.delta} % → {s.level} %</span>
                  </Link>
                ))}
              </Card>
            ) : <p className="text-sm text-muted">Keine gemessene Veränderung.</p>}
          </Section>
          <Section title="Projekte">
            {data.projects.length ? data.projects.map((p) => (
              <Card key={p.id} className="p-4 mb-2">
                <Link to={`/projects/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                <Progress value={p.progress} className="mt-2" />
              </Card>
            )) : <p className="text-sm text-muted">Kein Projektfortschritt in dieser Woche.</p>}
          </Section>
        </>
      )}
      <Section title="Schwierigkeiten">
        {data.difficulties.length ? (
          <Card className="divide-y divide-line">
            {data.difficulties.map((d) => (
              <div key={d.skillId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>{d.name} <span className="text-muted">· Ø {d.avgScore} % richtig</span></span>
                <Button size="sm" onClick={() => start({ type: 'lesson', skillId: d.skillId, mode: 'reexplain' })} loading={pending}>Neu erklären lassen</Button>
              </div>
            ))}
          </Card>
        ) : <p className="text-sm text-muted">Keine auffälligen Schwierigkeiten erkannt.</p>}
      </Section>
      <Section title="Wichtig nächste Woche">
        {data.nextWeek.length ? (
          <Card className="divide-y divide-line">
            {data.nextWeek.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span><span className="font-medium">{s.label}</span><span className="text-muted"> · {s.goalTitle}</span></span>
                <Button size="sm" onClick={() => start(s)} loading={pending}>Starten</Button>
              </div>
            ))}
          </Card>
        ) : <p className="text-sm text-muted">Keine offenen Schritte. <Link to="/goals/new" className="text-accent hover:underline">Neues Ziel anlegen</Link></p>}
      </Section>
    </div>
  )
}
