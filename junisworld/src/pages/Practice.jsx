import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { post } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { relative, PRACTICE_KINDS, DECISION_TEXT, formatDate } from '../lib/format.js'
import { useStartStep } from '../lib/steps.js'
import { useJunis } from '../components/AskJunis.jsx'
import Markdown from '../components/Markdown.jsx'
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, InlineError, Input, Loading, PageHeader, Section, Select, StatusBadge, Textarea, cx,
} from '../components/ui.jsx'

const DIFF = ['', 'Einstieg', 'Leicht', 'Mittel', 'Anspruchsvoll', 'Experte']

export function Practice() {
  useDocumentTitle('Practice')
  const navigate = useNavigate()
  const { data, error, loading, hardReload } = useApi('/practice')
  const { start, pending: reviewPending } = useStartStep()
  const [f, setF] = useState({ skillId: '', kind: 'quiz', difficulty: '' })
  const { pending, error: startError, run } = useAction()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Der Übungsbereich" onRetry={hardReload} />
  const selected = data.skills.find((s) => s.id === f.skillId)

  const go = () => run(async () => {
    const r = await post('/practice', { skillId: f.skillId, kind: f.kind, difficulty: f.difficulty || undefined })
    navigate(`/practice/${r.id}`)
  }).catch(() => {})

  return (
    <>
      <PageHeader title="Practice" subtitle="Nach jeder Aufgabe: Ergebnis, Erklärung, Fehleranalyse und die passende Wiederholung. Punkte gibt es keine — nur echten Fortschritt." />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-10">
        <div className="lg:col-span-2">
          <Section title="Übung starten">
            <Card className="p-5">
              {!data.aiAvailable && <p className="text-sm text-muted mb-4">Aufgaben werden von Junis AI erstellt. Junis AI ist auf diesem Server noch nicht eingerichtet.</p>}
              {data.skills.length ? (
                <>
                  <Field label="Skill">{(id) => (
                    <Select id={id} value={f.skillId} onChange={(e) => setF({ ...f, skillId: e.target.value })}>
                      <option value="">— auswählen —</option>
                      {data.skills.map((s) => <option key={s.id} value={s.id}>{s.name}{s.reviewDue ? ' · Wiederholung fällig' : ''}</option>)}
                    </Select>
                  )}</Field>
                  <Field label="Aufgabenform">{(id) => (
                    <Select id={id} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                      {Object.entries(PRACTICE_KINDS).filter(([k]) => k !== 'review').map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </Select>
                  )}</Field>
                  <Field label="Schwierigkeit" hint={selected ? `Adaptiv: Junis empfiehlt Stufe ${selected.difficulty} (${DIFF[selected.difficulty]}) auf Basis deiner Ergebnisse.` : undefined}>{(id) => (
                    <Select id={id} value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}>
                      <option value="">Automatisch (adaptiv)</option>
                      {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d} · {DIFF[d]}</option>)}
                    </Select>
                  )}</Field>
                  <InlineError error={startError} />
                  <Button variant="primary" className="w-full" onClick={go} loading={pending} disabled={!f.skillId}>{pending ? 'Junis erstellt die Aufgaben …' : 'Quiz starten'}</Button>
                </>
              ) : (
                <EmptyState title="Noch keine Skills im Skill Graph." text="Lege ein Ziel an oder füge Skills hinzu, um zu üben." action={<Button variant="primary" to="/goals/new">Ziel erstellen</Button>} />
              )}
            </Card>
          </Section>
          <Section title="Fällige Wiederholungen">
            {data.reviews.length ? (
              <Card className="divide-y divide-line">
                {data.reviews.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-sm flex-1 truncate">{s.name}</span>
                    <Button size="sm" onClick={() => start({ type: 'review', skillId: s.id })} loading={reviewPending}>Wiederholen</Button>
                  </div>
                ))}
              </Card>
            ) : <p className="text-sm text-muted">Keine Wiederholung fällig.</p>}
          </Section>
        </div>
        <div className="lg:col-span-3">
          <Section title="Verlauf">
            {data.sessions.length ? (
              <Card className="divide-y divide-line">
                {data.sessions.map((s) => (
                  <Link key={s.id} to={`/practice/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-subtle/60">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.skillName}</p>
                      <p className="text-xs text-muted">{PRACTICE_KINDS[s.kind]} · Stufe {s.difficulty} · {relative(s.started_at)}</p>
                    </div>
                    {s.completed_at
                      ? <span className={cx('text-sm tabular-nums font-medium', s.score >= 0.8 ? 'text-ok' : s.score < 0.5 ? 'text-bad' : 'text-ink')}>{Math.round(s.score * 100)} %</span>
                      : <Badge>Offen</Badge>}
                  </Link>
                ))}
              </Card>
            ) : <EmptyState title="Noch keine Übungen." text="Deine Ergebnisse erscheinen hier — mit Erklärungen und Fehleranalyse." />}
          </Section>
        </div>
      </div>
    </>
  )
}

function OrderQuestion({ items, value, onChange }) {
  const list = value?.length ? value : items
  const [drag, setDrag] = useState(null)
  const move = (from, to) => {
    if (to < 0 || to >= list.length) return
    const next = [...list]
    const [x] = next.splice(from, 1)
    next.splice(to, 0, x)
    onChange(next)
  }
  return (
    <ol className="space-y-1.5">
      {list.map((it, i) => (
        <li
          key={it}
          draggable
          onDragStart={() => setDrag(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (drag != null) move(drag, i); setDrag(null) }}
          className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm cursor-grab active:cursor-grabbing"
        >
          <span className="text-faint tabular-nums w-5">{i + 1}.</span>
          <span className="flex-1">{it}</span>
          <button type="button" onClick={() => move(i, i - 1)} className="text-muted hover:text-ink px-1.5" aria-label={`${it} nach oben`}>↑</button>
          <button type="button" onClick={() => move(i, i + 1)} className="text-muted hover:text-ink px-1.5" aria-label={`${it} nach unten`}>↓</button>
        </li>
      ))}
    </ol>
  )
}

function QuestionInput({ q, value, onChange }) {
  if (q.type === 'mc') {
    return (
      <div className="space-y-1.5" role="radiogroup">
        {q.options.map((o, i) => (
          <label key={i} className={cx('flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer text-sm', value === i ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong')}>
            <input type="radio" name={`q${q.id}`} checked={value === i} onChange={() => onChange(i)} className="mt-0.5 accent-accent" />
            <span>{o}</span>
          </label>
        ))}
      </div>
    )
  }
  if (q.type === 'numeric') return <Input inputMode="decimal" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Ergebnis" className="max-w-48" aria-label="Antwort" />
  if (q.type === 'order') return <OrderQuestion items={q.items} value={value} onChange={onChange} />
  if (q.type === 'code') return <Textarea value={value ?? q.code ?? ''} onChange={(e) => onChange(e.target.value)} className="font-mono text-[13px] min-h-40" spellCheck={false} aria-label="Code" />
  return <Textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Deine Antwort" aria-label="Antwort" />
}

function correctAnswer(q) {
  if (q.type === 'mc') return q.options[q.correctIndex]
  if (q.type === 'numeric') return `${q.numericAnswer}${q.tolerance ? ` (± ${q.tolerance})` : ''}`
  if (q.type === 'order') return q.items.join(' → ')
  return q.acceptedAnswers?.join(' | ')
}

function givenAnswer(q, a) {
  if (a == null || a === '') return '—'
  if (q.type === 'mc') return q.options[a] ?? '—'
  if (q.type === 'order') return Array.isArray(a) ? a.join(' → ') : '—'
  return String(a)
}

export function PracticeSession() {
  const { id } = useParams()
  const navigate = useNavigate()
  const openJunis = useJunis()
  const { data, error, loading, reload, hardReload } = useApi(`/practice/${id}`)
  useDocumentTitle(data ? `Übung: ${data.skill?.name}` : 'Übung')
  const [answers, setAnswers] = useState({})
  const [outcome, setOutcome] = useState(null)
  const submit = useAction()
  const next = useAction()
  const { start, pending: stepPending } = useStartStep()

  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Die Übung" onRetry={hardReload} />

  const send = () => submit.run(async () => {
    const r = await post(`/practice/${id}/submit`, { answers })
    setOutcome(r)
    await reload()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }).catch(() => {})

  const again = () => next.run(async () => {
    const r = await post('/practice', { skillId: data.skill.id, kind: data.kind === 'review' ? 'quiz' : data.kind })
    navigate(`/practice/${r.id}`)
  }).catch(() => {})

  const answered = data.questions.filter((q) => answers[q.id] != null && answers[q.id] !== '').length

  if (!data.completed) {
    return (
      <div className="max-w-3xl">
        <PageHeader back={{ to: '/practice', label: 'Practice' }} title={`${PRACTICE_KINDS[data.kind]}: ${data.skill.name}`} subtitle={`Stufe ${data.difficulty} von 5 · ${data.questions.length} Aufgaben`} />
        {data.questions.map((q, i) => (
          <Card key={q.id} className="p-5 mb-4">
            <p className="text-xs text-muted mb-2">Aufgabe {i + 1} · {{ mc: 'Multiple Choice', open: 'Offene Frage', numeric: 'Rechenaufgabe', order: 'Reihenfolge', code: 'Code' }[q.type]}</p>
            <Markdown className="prose-junis mb-4">{q.prompt}</Markdown>
            {q.code && q.type !== 'code' && <Markdown className="prose-junis mb-4">{`\`\`\`\n${q.code}\n\`\`\``}</Markdown>}
            <QuestionInput q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
          </Card>
        ))}
        <InlineError error={submit.error} />
        <div className="flex items-center justify-between gap-3 mt-6">
          <span className="text-sm text-muted">{answered} von {data.questions.length} beantwortet</span>
          <Button variant="primary" size="lg" onClick={send} loading={submit.pending}>{submit.pending ? 'Wird ausgewertet …' : 'Abgeben'}</Button>
        </div>
      </div>
    )
  }

  const results = data.results || []
  const byId = new Map(results.map((r) => [r.id, r]))
  const wrong = results.filter((r) => !r.correct)
  const adaptation = outcome?.adaptation

  return (
    <div className="max-w-3xl">
      <PageHeader back={{ to: '/practice', label: 'Practice' }} title={`Ergebnis: ${data.skill.name}`} subtitle={`${PRACTICE_KINDS[data.kind]} · Stufe ${data.difficulty} · ${formatDate(data.startedAt)}`} />
      <Card className="p-5 mb-6">
        <div className="flex flex-wrap items-center gap-8">
          <div>
            <p className="text-xs text-muted">Ergebnis</p>
            <p className={cx('text-3xl font-semibold tabular-nums', data.score >= 0.8 ? 'text-ok' : data.score < 0.5 ? 'text-bad' : 'text-ink')}>{Math.round(data.score * 100)} %</p>
          </div>
          <div>
            <p className="text-xs text-muted">Richtig</p>
            <p className="text-lg font-medium tabular-nums">{results.filter((r) => r.correct).length} / {results.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Betroffener Skill</p>
            <p className="text-lg font-medium"><Link to={`/skills/${data.skill.id}`} className="hover:underline">{data.skill.name}</Link> <span className="text-muted tabular-nums text-base">{adaptation ? `${adaptation.levelBefore} → ${adaptation.levelAfter} %` : `${data.skill.level} %`}</span></p>
          </div>
          <StatusBadge status={data.skill.status} label={data.skill.statusLabel} />
        </div>
        {adaptation && <p className="text-sm text-ink-2 mt-4 pt-4 border-t border-line">{DECISION_TEXT[adaptation.decision]} Nächste Wiederholung: {formatDate(adaptation.nextReviewAt)}.</p>}
      </Card>

      <div className="flex flex-wrap gap-2 mb-8">
        {wrong.length > 0 && <Button variant="primary" onClick={() => start({ type: 'lesson', skillId: data.skill.id, mode: 'reexplain' })} loading={stepPending}>Konzept neu erklären lassen</Button>}
        <Button variant={wrong.length ? 'secondary' : 'primary'} onClick={again} loading={next.pending}>Nächste Übung</Button>
        {outcome?.next && <Button variant="ghost" onClick={() => start(outcome.next)} loading={stepPending}>Nächster Schritt: {outcome.next.label}</Button>}
      </div>
      <InlineError error={next.error} />

      {wrong.length > 0 && (
        <Section title="Fehleranalyse">
          <Card className="p-5 text-sm">
            <p>Fehler bei: {[...new Set(wrong.map((w) => w.concept).filter(Boolean))].join(', ') || 'mehreren Aufgaben'}.</p>
            {wrong.some((w) => w.misconception) && <ul className="mt-2 space-y-1 text-ink-2">{wrong.filter((w) => w.misconception).map((w) => <li key={w.id}>— {w.misconception}</li>)}</ul>}
            <p className="text-muted mt-2">Junis berücksichtigt diese Konzepte in den nächsten Übungen und Wiederholungen.</p>
          </Card>
        </Section>
      )}

      <Section title="Aufgaben im Detail">
        {data.questions.map((q, i) => {
          const r = byId.get(q.id) || {}
          return (
            <Card key={q.id} className="p-5 mb-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-xs text-muted">Aufgabe {i + 1}{r.concept ? ` · ${r.concept}` : ''}</p>
                <Badge tone={r.correct ? 'ok' : r.score > 0 ? 'warn' : 'bad'}>{r.correct ? 'Richtig' : r.score > 0 ? 'Teilweise' : 'Falsch'}</Badge>
              </div>
              <Markdown className="prose-junis">{q.prompt}</Markdown>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm">
                <div className="rounded-lg bg-subtle p-3"><p className="text-xs text-muted mb-1">Deine Antwort</p><p className="whitespace-pre-wrap break-words">{givenAnswer(q, data.answers?.[q.id])}</p></div>
                <div className="rounded-lg bg-ok-soft p-3"><p className="text-xs text-muted mb-1">Richtige Lösung</p><p className="whitespace-pre-wrap break-words">{correctAnswer(q)}</p></div>
              </div>
              {r.feedback && <p className="text-sm mt-3"><span className="text-muted">Feedback: </span>{r.feedback}</p>}
              {q.explanation && <Markdown className="prose-junis text-sm mt-3">{q.explanation}</Markdown>}
              {!r.correct && (
                <button className="text-xs text-accent hover:underline mt-3" onClick={() => openJunis({ contextType: 'skill', contextId: data.skill.id, label: 'Aufgabe verstehen', prompt: `Ich habe diese Aufgabe falsch gelöst:\n\n${q.prompt}\n\nMeine Antwort: ${givenAnswer(q, data.answers?.[q.id])}\nRichtig: ${correctAnswer(q)}\n\nErkläre mir, wo mein Denkfehler liegt.`, autoSend: true })}>
                  Mit Junis besprechen
                </button>
              )}
            </Card>
          )
        })}
      </Section>
    </div>
  )
}
