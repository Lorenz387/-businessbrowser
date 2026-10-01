// Branchenwissen in Junis Talent: facts, roles, knowledge checks and work samples per industry pack.
import { useState } from 'react'
import { post } from '../../lib/api.js'
import { useApi, useAction } from '../../lib/hooks.js'
import { formatDate } from '../../lib/format.js'
import Markdown from '../../components/Markdown.jsx'
import { Badge, Button, Card, ErrorState, Field, InlineError, Loading, Modal, Section, Segmented, Textarea, cx } from '../../components/ui.jsx'

const VIEWS = [
  { value: 'facts', label: 'Fachwissen' },
  { value: 'roles', label: 'Rollen' },
  { value: 'checks', label: 'Wissens-Checks' },
  { value: 'tasks', label: 'Arbeitsproben' },
]

export default function TalentKnowledge() {
  const { data, error, loading, hardReload } = useApi('/apps/talent/knowledge')
  const [packId, setPackId] = useState(null)
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Das Branchenwissen" onRetry={hardReload} />
  const current = packId || (data.packs.find((p) => p.recommended) || data.packs[0])?.id
  return (
    <>
      {data.packs.length > 1 && (
        <Segmented className="mb-4" value={current} onChange={setPackId} options={data.packs.map((p) => ({ value: p.id, label: p.name }))} />
      )}
      {current && <PackView id={current} />}
    </>
  )
}

function PackView({ id }) {
  const { data, error, loading, reload, hardReload } = useApi(`/apps/talent/knowledge/${id}`, [id])
  const [view, setView] = useState('facts')
  const [quiz, setQuiz] = useState(null)
  const [task, setTask] = useState(null)
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Das Branchenpaket" onRetry={hardReload} />
  const att = (kind, item) => data.attempts[`${kind}:${item}`]
  const skillName = (sid) => data.skills.find((s) => s.id === sid)?.name || sid
  const passedChecks = data.skills.filter((s) => att('quiz', s.id)?.passed).length
  const passedTasks = data.tasks.filter((t) => att('task', t.id)?.passed).length

  return (
    <>
      <Card className="p-5 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="font-medium">{data.name}</p>
            <p className="text-sm text-muted mt-1">{data.intro}</p>
          </div>
          <div className="text-sm text-right">
            <p><span className="tabular-nums font-medium">{passedChecks}</span> <span className="text-muted">von {data.skills.filter((s) => s.quizQuestions).length} Wissens-Checks bestanden</span></p>
            <p><span className="tabular-nums font-medium">{passedTasks}</span> <span className="text-muted">von {data.tasks.length} Arbeitsproben bestanden</span></p>
          </div>
        </div>
        <p className="text-xs text-muted mt-3">Bestandene Checks und Arbeitsproben zählen als Nachweis im Matching — stärker als Angaben im Lebenslauf. Stand des Wissens: {data.version}. Keine Rechts- oder Steuerberatung.</p>
      </Card>

      <Segmented className="mb-5" value={view} onChange={setView} options={VIEWS} />

      {view === 'facts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.facts.map((f) => (
            <Card key={f.title} className="p-4">
              <p className="font-medium">{f.title}</p>
              <p className="text-sm mt-1.5 leading-relaxed">{f.text}</p>
              <p className="text-xs text-faint mt-2">Grundlage: {f.source}</p>
            </Card>
          ))}
        </div>
      )}

      {view === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.roles.map((r) => {
            const tasks = data.tasks.filter((t) => t.role === r.id)
            return (
              <Card key={r.id} className="p-4">
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-muted mt-1">{r.summary}</p>
                <p className="text-xs text-muted mt-3 mb-1">Typische Aufgaben</p>
                <ul className="text-sm space-y-0.5">{r.tasks.map((t) => <li key={t}>— {t}</li>)}</ul>
                <div className="flex flex-wrap gap-1.5 mt-3">{r.skills.map((s) => <Badge key={s} tone={att('quiz', s)?.passed ? 'ok' : 'neutral'}>{skillName(s)}</Badge>)}</div>
                {tasks.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tasks.map((t) => <Button key={t.id} size="sm" onClick={() => setTask(t)}>Arbeitsprobe: {t.title}</Button>)}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {view === 'checks' && (
        <Card className="divide-y divide-line">
          {data.skills.map((s) => {
            const a = att('quiz', s.id)
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted">{s.description}</p>
                </div>
                {a?.passed && <Badge tone="ok">Bestanden · {a.best} %</Badge>}
                {a && !a.passed && <Badge tone="warn">Bisher {a.best} %</Badge>}
                {s.quizQuestions
                  ? <Button size="sm" variant={a?.passed ? 'ghost' : 'primary'} onClick={() => setQuiz(s)}>{a ? 'Erneut prüfen' : `Check starten · ${s.quizQuestions} Fragen`}</Button>
                  : <span className="text-xs text-faint">Nachweis über Arbeitsproben</span>}
              </div>
            )
          })}
        </Card>
      )}

      {view === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.tasks.map((t) => {
            const a = att('task', t.id)
            return (
              <Card key={t.id} className="p-4 flex flex-col">
                <div className="flex justify-between gap-2">
                  <p className="font-medium">{t.title}</p>
                  {a?.passed ? <Badge tone="ok">Bestanden · {a.best} %</Badge> : a?.best != null ? <Badge tone="warn">{a.best} %</Badge> : a ? <Badge>Eingereicht</Badge> : null}
                </div>
                <p className="text-xs text-muted mt-1">{data.roles.find((r) => r.id === t.role)?.title} · ca. {t.minutes} Min. · {t.level}</p>
                <p className="text-sm mt-2 line-clamp-3 flex-1">{t.brief}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">{t.skills.map((s) => <Badge key={s}>{skillName(s)}</Badge>)}</div>
                <Button size="sm" variant={a?.passed ? 'ghost' : 'primary'} className="mt-3 self-start" onClick={() => setTask(t)}>{a ? 'Ansehen / erneut bearbeiten' : 'Bearbeiten'}</Button>
              </Card>
            )
          })}
        </div>
      )}

      {quiz && <QuizModal packId={id} skill={quiz} retryHours={data.retryHours} onClose={() => { setQuiz(null); reload() }} />}
      {task && <TaskModal packId={id} task={task} attempt={att('task', task.id)} aiAvailable={data.aiAvailable} taskPass={data.taskPass} retryHours={data.retryHours} skillName={skillName} onClose={() => { setTask(null); reload() }} />}
    </>
  )
}

function QuizModal({ packId, skill, retryHours, onClose }) {
  const { data, error, loading } = useApi(`/apps/talent/knowledge/${packId}/quiz/${skill.id}`)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const action = useAction()
  const total = data?.questions.length || 0
  const submit = () => action.run(() => post(`/apps/talent/knowledge/${packId}/quiz/${skill.id}`, { answers: data.questions.map((q) => answers[q.index]) })).then(setResult).catch(() => {})
  return (
    <Modal open onClose={onClose} title={`Wissens-Check: ${skill.name}`} width="max-w-2xl"
      footer={result
        ? <Button variant="primary" onClick={onClose}>Schließen</Button>
        : <><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={action.pending} disabled={Object.keys(answers).length < total} onClick={submit}>Auswerten</Button></>}>
      {loading && <Loading />}
      {error && <InlineError error={error} />}
      {result && (
        <Card className={cx('p-4 mb-4', result.passed ? 'border-ok' : 'border-warn')}>
          <p className="font-medium">{result.passed ? 'Bestanden' : 'Noch nicht bestanden'} — {result.correct} von {result.total} richtig ({result.score} %)</p>
          <p className="text-sm text-muted mt-1">{result.passed ? 'Der Skill zählt ab jetzt als Nachweis im Matching.' : `Ab 80 % gilt der Check als bestanden. Neuer Versuch in ${retryHours} Stunden.`}</p>
        </Card>
      )}
      {data && (
        <ol className="space-y-5">
          {data.questions.map((q) => {
            const r = result?.results[q.index]
            return (
              <li key={q.index}>
                <p className="text-sm font-medium">{q.index + 1}. {q.q}</p>
                <div className="mt-2 space-y-1.5" role="radiogroup" aria-label={`Frage ${q.index + 1}`}>
                  {q.options.map((o, i) => (
                    <label key={i} className={cx('flex items-start gap-2 text-sm rounded-lg border px-3 py-2 cursor-pointer',
                      r ? (i === r.answer ? 'border-ok bg-ok/5' : i === r.chosen ? 'border-bad bg-bad/5' : 'border-line') : answers[q.index] === i ? 'border-accent bg-accent/5' : 'border-line hover:bg-subtle/60')}>
                      <input type="radio" className="mt-0.5" name={`q${q.index}`} checked={answers[q.index] === i} disabled={!!result} onChange={() => setAnswers({ ...answers, [q.index]: i })} />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
                {r && <p className={cx('text-xs mt-1.5', r.correct ? 'text-ok' : 'text-bad')}>{r.correct ? 'Richtig.' : 'Falsch.'} {r.explain}</p>}
              </li>
            )
          })}
        </ol>
      )}
      <InlineError error={action.error} />
    </Modal>
  )
}

function TaskModal({ packId, task, attempt, aiAvailable, taskPass, retryHours, skillName, onClose }) {
  const [answer, setAnswer] = useState(attempt?.last?.answer || '')
  const [result, setResult] = useState(null)
  const action = useAction()
  const submit = () => action.run(() => post(`/apps/talent/knowledge/${packId}/tasks/${task.id}`, { answer })).then(setResult).catch(() => {})
  const prev = attempt?.last?.feedback
  return (
    <Modal open onClose={onClose} title={`Arbeitsprobe: ${task.title}`} width="max-w-3xl"
      footer={result
        ? <Button variant="primary" onClick={onClose}>Schließen</Button>
        : <><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={action.pending} disabled={answer.trim().length < 40} onClick={submit}>{aiAvailable ? 'Einreichen & bewerten lassen' : 'Einreichen & Musterlösung ansehen'}</Button></>}>
      <p className="text-xs text-muted">ca. {task.minutes} Min. · {task.level} · {task.skills.map(skillName).join(', ')}</p>
      <p className="text-sm mt-3">{task.brief}</p>
      {task.material.length > 0 && (
        <div className="mt-3 rounded-lg border border-line bg-subtle/60 p-3 text-sm font-mono whitespace-pre-wrap leading-relaxed">{task.material.join('\n')}</div>
      )}
      <p className="text-sm mt-3"><span className="text-muted">Erwartet:</span> {task.deliverable}</p>
      {!result && (
        <>
          {prev && attempt?.last && <p className="text-xs text-muted mt-3">Letzter Versuch vom {formatDate(attempt.last.at)}: {attempt.last.score} % — {prev.feedback}</p>}
          <div className="mt-4"><Field label="Deine Lösung">{(id) => <Textarea id={id} value={answer} onChange={(e) => setAnswer(e.target.value)} className="min-h-56" />}</Field></div>
          <p className="text-xs text-muted">{aiAvailable
            ? `Junis AI bewertet anhand fester Kriterien. Ab ${taskPass} % gilt die Arbeitsprobe als bestanden und zählt im Matching. Nach einem nicht bestandenen Versuch ist der nächste in ${retryHours} Stunden möglich.`
            : 'Junis AI ist auf diesem Server nicht eingerichtet: Du erhältst nach dem Einreichen Kriterien und Musterlösung zum Selbstvergleich. Eine Selbstprüfung zählt nicht als Nachweis.'}</p>
        </>
      )}
      <InlineError error={action.error} />
      {result && (
        <div className="mt-4 space-y-4">
          {result.graded ? (
            <Card className={cx('p-4', result.passed ? 'border-ok' : 'border-warn')}>
              <p className="font-medium">{result.passed ? 'Bestanden' : 'Noch nicht bestanden'} — {result.score} %</p>
              <p className="text-sm mt-1">{result.feedback}</p>
              <ul className="text-sm mt-3 space-y-1">
                {result.criteria.map((c) => (
                  <li key={c.criterion}><Badge tone={c.met === 'ja' ? 'ok' : c.met === 'teilweise' ? 'warn' : 'bad'}>{c.met}</Badge> {c.criterion}{c.comment ? <span className="text-muted"> — {c.comment}</span> : null}</li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card className="p-4">
              <p className="font-medium">Selbstvergleich</p>
              <p className="text-sm text-muted mt-1">Prüfe deine Lösung gegen die Kriterien:</p>
              <ul className="text-sm mt-2 space-y-1">{result.rubric.map((r) => <li key={r}>☐ {r}</li>)}</ul>
            </Card>
          )}
          <Section title="Musterlösung">
            <Card className="p-4"><Markdown>{result.sample}</Markdown></Card>
          </Section>
        </div>
      )}
    </Modal>
  )
}

