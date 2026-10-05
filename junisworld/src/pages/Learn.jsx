import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { post, del } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { relative } from '../lib/format.js'
import { useStartStep, STEP_TYPE_LABEL } from '../lib/steps.js'
import { useJunis, AskJunisButton } from '../components/AskJunis.jsx'
import Markdown from '../components/Markdown.jsx'
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, InlineError, Loading, PageHeader, Section, Select, StatusBadge, Tabs, useToast, cx,
} from '../components/ui.jsx'

const MODES = { normal: 'Standard', short: 'Kurz', deep: 'Ausführlich', reexplain: 'Neu erklärt', simplify: 'Vereinfacht', compress: 'Komprimiert' }

export function Learn() {
  useDocumentTitle('Learn')
  const { data, error, loading, hardReload } = useApi('/learn')
  const catalog = useApi('/catalog')
  const { start, pending, error: stepError } = useStartStep()
  const [tab, setTab] = useState('path')
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Der Lernpfad" onRetry={hardReload} />
  const openLessons = data.lessons.filter((l) => l.status === 'open')

  return (
    <>
      <PageHeader title="Learn" subtitle="Keine Kurse von der Stange: Inhalte entstehen aus deinen Zielen und Lücken und passen sich deinen Ergebnissen an." />
      {!data.aiAvailable && (
        <Card className="p-4 mb-6 text-sm text-muted">Lerninhalte werden von Junis AI erstellt. Junis AI ist auf diesem Server noch nicht eingerichtet — der Betreiber muss einen API-Schlüssel hinterlegen.</Card>
      )}
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'path', label: 'Lernweg' },
        { value: 'reviews', label: 'Wiederholungen', count: data.reviews.length },
        { value: 'library', label: 'Meine Lektionen', count: data.lessons.length },
        { value: 'free', label: 'Freies Lernen' },
      ]} />
      <InlineError error={stepError} />

      {tab === 'path' && (
        data.plans.length ? data.plans.map((p) => (
          <Section key={p.goalId} title={p.goalTitle} action={<Link to={`/goals/${p.goalId}`} className="text-sm text-muted hover:text-ink">Ziel ansehen</Link>}>
            {p.steps.length ? (
              <Card className="divide-y divide-line">
                {p.steps.slice(0, 6).map((s, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{STEP_TYPE_LABEL[s.type]} · {s.minutes} Min. · {s.why}</p>
                    </div>
                    <Button size="sm" variant={i === 0 ? 'primary' : 'secondary'} onClick={() => start(s)} loading={pending}>{s.type === 'apply' ? 'Mission finden' : 'Starten'}</Button>
                  </div>
                ))}
              </Card>
            ) : <p className="text-sm text-muted">Alle Lücken dieses Ziels sind geschlossen.</p>}
          </Section>
        )) : <EmptyState title="Kein aktives Ziel." text="Lerninhalte werden aus deinen Zielen abgeleitet. Lege ein Ziel an, um deinen Lernweg zu sehen." action={<Button variant="primary" to="/goals/new">Ziel erstellen</Button>} secondary={<Button onClick={() => setTab('free')}>Frei lernen</Button>} />
      )}

      {tab === 'reviews' && (
        <>
          {data.reviews.length ? (
            <Card className="divide-y divide-line">
              {data.reviews.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <Link to={`/skills/${s.id}`} className="text-sm flex-1 hover:underline">{s.name}</Link>
                  <span className="text-xs text-muted">Stand {s.level} %</span>
                  <Button size="sm" onClick={() => start({ type: 'review', skillId: s.id })} loading={pending}>Wiederholen</Button>
                </div>
              ))}
            </Card>
          ) : <EmptyState title="Keine Wiederholung fällig." text="Nach jeder Übung plant Junis die nächste Wiederholung — mit wachsendem Abstand, je sicherer du wirst." />}
          {data.stale.length > 0 && (
            <Section title="Länger nicht genutzt" className="mt-8">
              <Card className="divide-y divide-line">
                {data.stale.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-sm flex-1">{s.name}</span>
                    <span className="text-xs text-muted">zuletzt {relative(s.lastUsedAt)}</span>
                    <Button size="sm" onClick={() => start({ type: 'review', skillId: s.id })} loading={pending}>Auffrischen</Button>
                  </div>
                ))}
              </Card>
            </Section>
          )}
        </>
      )}

      {tab === 'library' && (
        data.lessons.length ? (
          <>
            {openLessons.length > 0 && <p className="text-sm text-muted mb-3">{openLessons.length} offene Lektion(en)</p>}
            <Card className="divide-y divide-line">
              {data.lessons.map((l) => (
                <Link key={l.id} to={`/learn/lessons/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-subtle/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.title}</p>
                    <p className="text-xs text-muted">{l.skillName} · {MODES[l.mode]} · {relative(l.created_at)}</p>
                  </div>
                  <Badge tone={l.status === 'done' ? 'ok' : 'neutral'}>{l.status === 'done' ? 'Abgeschlossen' : 'Offen'}</Badge>
                </Link>
              ))}
            </Card>
          </>
        ) : <EmptyState title="Noch keine Lektionen." text="Starte den ersten Schritt deines Lernwegs — Junis erstellt die passende Lektion." action={<Button variant="primary" onClick={() => setTab('path')}>Zum Lernweg</Button>} />
      )}

      {tab === 'free' && catalog.data && <FreeLesson catalog={catalog.data} />}
    </>
  )
}

function FreeLesson({ catalog }) {
  const navigate = useNavigate()
  const [skillId, setSkillId] = useState('')
  const [mode, setMode] = useState('normal')
  const { pending, error, run } = useAction()
  const go = () => run(async () => {
    const r = await post('/lessons', { skillId, mode })
    navigate(`/learn/lessons/${r.id}`)
  }).catch(() => {})
  return (
    <Card className="p-5 max-w-xl">
      <p className="text-sm text-muted mb-4">Lerne einen beliebigen Skill — Junis passt die Lektion an deinen gemessenen Stand an.</p>
      <Field label="Skill">{(id) => (
        <Select id={id} value={skillId} onChange={(e) => setSkillId(e.target.value)}>
          <option value="">— auswählen —</option>
          {catalog.categories.map((c) => <optgroup key={c} label={c}>{catalog.skills.filter((s) => s.category === c).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>)}
        </Select>
      )}</Field>
      <Field label="Format">{(id) => (
        <Select id={id} value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="short">Kurze Erklärung (~5 Min.)</option>
          <option value="normal">Standard (~12 Min.)</option>
          <option value="deep">Ausführlich (~20 Min.)</option>
        </Select>
      )}</Field>
      <InlineError error={error} />
      <Button variant="primary" onClick={go} loading={pending} disabled={!skillId}>{pending ? 'Junis erstellt die Lektion …' : 'Lektion erstellen'}</Button>
    </Card>
  )
}

function Flashcards({ cards }) {
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  if (!cards?.length) return null
  const c = cards[i]
  return (
    <div>
      <button onClick={() => setFlipped((f) => !f)} className="w-full min-h-36 rounded-xl border border-line bg-surface p-6 text-center hover:border-line-strong" aria-label="Karte umdrehen">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted mb-3">{flipped ? 'Antwort' : 'Frage'}</p>
        <p className="text-[15px]">{flipped ? c.back : c.front}</p>
      </button>
      <div className="flex items-center justify-between mt-3 text-sm">
        <Button size="sm" variant="ghost" onClick={() => { setI((x) => Math.max(0, x - 1)); setFlipped(false) }} disabled={i === 0}>Zurück</Button>
        <span className="text-muted tabular-nums">{i + 1} / {cards.length}</span>
        <Button size="sm" variant="ghost" onClick={() => { setI((x) => Math.min(cards.length - 1, x + 1)); setFlipped(false) }} disabled={i === cards.length - 1}>Weiter</Button>
      </div>
    </div>
  )
}

export function LessonView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const openJunis = useJunis()
  const { data, error, loading, reload, hardReload } = useApi(`/lessons/${id}`)
  useDocumentTitle(data?.title)
  const startedAt = useRef(Date.now())
  useEffect(() => { startedAt.current = Date.now() }, [id])
  const complete = useAction()
  const practice = useAction()
  const regen = useAction()

  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Die Lektion" onRetry={hardReload} />
  const c = data.content

  const finish = () => complete.run(async () => {
    await post(`/lessons/${id}/complete`, { minutes: Math.round((Date.now() - startedAt.current) / 60000) })
    toast('Lektion abgeschlossen. Übe jetzt, um dein Verständnis nachzuweisen.')
    reload()
  }).catch(() => {})
  const startPractice = () => practice.run(async () => {
    const r = await post('/practice', { skillId: data.skill_id, lessonId: data.id })
    navigate(`/practice/${r.id}`)
  }).catch(() => {})
  const regenerate = (mode) => regen.run(async () => {
    const r = await post('/lessons', { skillId: data.skill_id, goalId: data.goal_id, mode })
    navigate(`/learn/lessons/${r.id}`)
  }).catch(() => {})
  const remove = async () => {
    await del(`/lessons/${id}`)
    navigate('/learn')
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        back={{ to: '/learn', label: 'Learn' }}
        title={data.title}
        subtitle={<>{data.skill?.name} · Erstellt für Stand {data.level} % · {MODES[data.mode]}{data.goal && <> · für <Link to={`/goals/${data.goal.id}`} className="text-accent hover:underline">{data.goal.title}</Link></>}</>}
        actions={<AskJunisButton label="Frag Junis zur Lektion" contextType="lesson" contextId={data.id} />}
      />

      <Card className="p-5 mb-8 grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div><p className="text-xs text-muted mb-0.5">Was lerne ich?</p><p>{c.what}</p></div>
        <div><p className="text-xs text-muted mb-0.5">Warum brauche ich das?</p><p>{c.why}</p></div>
        <div><p className="text-xs text-muted mb-0.5">Wo kann ich es anwenden?</p><p>{c.where}</p></div>
        <div><p className="text-xs text-muted mb-0.5">Voraussetzungen</p><p>{c.prerequisites?.length ? c.prerequisites.join(', ') : 'Keine besonderen'}</p></div>
        <div className="sm:col-span-2"><p className="text-xs text-muted mb-0.5">Was kommt danach?</p><p>{c.next}</p></div>
      </Card>

      {c.sections?.map((s, i) => (
        <section key={i} className="mb-8 group">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            <button
              className="text-xs text-muted hover:text-accent shrink-0 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
              onClick={() => openJunis({ contextType: 'lesson', contextId: data.id, label: 'Abschnitt erklären', prompt: `Erkläre mir den Abschnitt „${s.heading}“ anders und mit einem weiteren Beispiel.`, autoSend: true })}
            >
              Erkläre diesen Abschnitt
            </button>
          </div>
          <Markdown className="prose-junis mt-2">{s.body}</Markdown>
        </section>
      ))}

      {c.examples?.length > 0 && (
        <Section title="Beispiele">
          {c.examples.map((e, i) => (
            <Card key={i} className="p-5 mb-3">
              <p className="font-medium mb-2">{e.title}</p>
              <Markdown>{e.body}</Markdown>
            </Card>
          ))}
        </Section>
      )}

      {c.keyPoints?.length > 0 && (
        <Section title="Das Wichtigste">
          <ul className="space-y-1.5 text-sm">
            {c.keyPoints.map((k, i) => <li key={i} className="flex gap-2"><span className="text-accent">—</span>{k}</li>)}
          </ul>
        </Section>
      )}

      {c.flashcards?.length > 0 && <Section title="Lernkarten"><Flashcards cards={c.flashcards} /></Section>}

      <Card className="p-5 mt-10">
        {data.status === 'done' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">Lektion abgeschlossen.</p>
              <p className="text-sm text-muted">Lesen allein zählt nur begrenzt. Eine Übung zeigt, ob das Wissen sitzt.</p>
            </div>
            <Button variant="primary" onClick={startPractice} loading={practice.pending}>Übung zu dieser Lektion</Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">Fertig gelesen? Danach folgt eine kurze Übung.</p>
            <div className="flex gap-2">
              <Button onClick={startPractice} loading={practice.pending}>Direkt üben</Button>
              <Button variant="primary" onClick={finish} loading={complete.pending}>Lektion abschließen</Button>
            </div>
          </div>
        )}
        <InlineError error={complete.error || practice.error} />
      </Card>

      <div className="flex flex-wrap items-center gap-2 mt-6 text-sm">
        <span className="text-muted">Passt nicht?</span>
        <Button size="sm" variant="ghost" onClick={() => regenerate('simplify')} loading={regen.pending}>Einfacher erklären</Button>
        <Button size="sm" variant="ghost" onClick={() => regenerate('compress')} loading={regen.pending}>Kompakter</Button>
        <Button size="sm" variant="ghost" onClick={() => regenerate('deep')} loading={regen.pending}>Ausführlicher</Button>
        <Button size="sm" variant="ghost" className={cx('ml-auto')} onClick={remove}>Lektion löschen</Button>
      </div>
      <InlineError error={regen.error} />
      {data.skill && <p className="text-xs text-muted mt-6">Skill-Status: <StatusBadge status={data.skill.status} label={data.skill.statusLabel} /> · gemessen {data.skill.level} %</p>}
    </div>
  )
}
