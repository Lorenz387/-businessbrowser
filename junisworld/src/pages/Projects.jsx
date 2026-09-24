import { useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, post, patch, del } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { PROJECT_STATUS, relative, formatDate } from '../lib/format.js'
import { AskJunisButton } from '../components/AskJunis.jsx'
import Markdown from '../components/Markdown.jsx'
import {
  Badge, Button, Card, Checkbox, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Progress, Section, Select,
  Segmented, StatusBadge, Textarea, useConfirm, useToast, cx,
} from '../components/ui.jsx'

function SkillPicker({ skills, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-0.5">
      {skills.map((s) => (
        <button key={s.id} type="button" onClick={() => onChange(value.includes(s.id) ? value.filter((x) => x !== s.id) : [...value, s.id])}
          className={cx('px-2.5 h-7 rounded-md border text-[12.5px]', value.includes(s.id) ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-2 hover:border-line-strong')}>
          {s.name}
        </button>
      ))}
    </div>
  )
}

function NewProjectModal({ onClose, defaultGoal }) {
  const navigate = useNavigate()
  const catalog = useApi('/catalog')
  const goals = useApi('/goals')
  const [f, setF] = useState({ title: '', objective: '', description: '', goalId: defaultGoal || '', skills: [], tasks: '', planWithAi: true })
  const { pending, error, run } = useAction()
  const save = () => run(async () => {
    const r = await post('/projects', {
      ...f, goalId: f.goalId || null,
      tasks: f.tasks.split('\n').map((t) => t.trim()).filter(Boolean),
    })
    navigate(`/projects/${r.id}`)
  }).catch(() => {})
  return (
    <Modal open onClose={onClose} title="Projekt erstellen" width="max-w-2xl"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" onClick={save} loading={pending} disabled={!f.title.trim()}>{pending && f.planWithAi ? 'Junis plant …' : 'Projekt erstellen'}</Button></>}>
      <Field label="Titel">{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="z. B. Eigene Wetter-App" />}</Field>
      <Field label="Ziel des Projekts" optional>{(id) => <Input id={id} value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} placeholder="Was soll am Ende existieren?" />}</Field>
      <Field label="Beschreibung" optional>{(id) => <Textarea id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field>
      {goals.data?.goals.length > 0 && (
        <Field label="Gehört zu Ziel" optional>{(id) => (
          <Select id={id} value={f.goalId} onChange={(e) => setF({ ...f, goalId: e.target.value })}>
            <option value="">— keinem —</option>
            {goals.data.goals.filter((g) => g.status === 'active').map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </Select>
        )}</Field>
      )}
      {catalog.data && <Field label="Benötigte / trainierte Skills" hint="Beim Abschluss zählen sie als angewandter Nachweis."><SkillPicker skills={catalog.data.skills} value={f.skills} onChange={(skills) => setF({ ...f, skills })} /></Field>}
      <Field label="Aufgaben" optional hint="Eine Aufgabe pro Zeile.">{(id) => <Textarea id={id} value={f.tasks} onChange={(e) => setF({ ...f, tasks: e.target.value })} />}</Field>
      <Checkbox checked={f.planWithAi} onChange={(v) => setF({ ...f, planWithAi: v })} label="Mit Junis planen" description="Junis schlägt Aufgaben vor (wenn keine angegeben) und ergänzt passende Skills." />
      <InlineError error={error} />
    </Modal>
  )
}

export function Projects() {
  useDocumentTitle('Projects')
  const [params, setParams] = useSearchParams()
  const { data, error, loading, hardReload } = useApi('/projects')
  const [filter, setFilter] = useState('active')
  const creating = params.get('new') === '1'
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Deine Projekte" onRetry={hardReload} />
  const list = data.projects.filter((p) => filter === 'all' || p.status === filter)
  const activeCount = data.projects.filter((p) => p.status === 'active').length
  return (
    <>
      <PageHeader title="Projects" subtitle="Eigene Projekte machen Wissen sichtbar. Abgeschlossene Projekte werden zu Nachweisen im Skill Graph und Portfolio."
        actions={<Button variant="primary" onClick={() => setParams({ new: '1' })}>Projekt erstellen</Button>} />
      {data.projects.length === 0 ? (
        <EmptyState title="Noch keine Projekte vorhanden." text="Starte ein eigenes Projekt oder eine Mission mit vorbereitetem Ablauf." action={<Button variant="primary" onClick={() => setParams({ new: '1' })}>Projekt erstellen</Button>} secondary={<Button to="/missions">Missions ansehen</Button>} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <Segmented value={filter} onChange={setFilter} options={[{ value: 'active', label: 'Aktiv' }, { value: 'completed', label: 'Abgeschlossen' }, { value: 'archived', label: 'Archiviert' }, { value: 'all', label: 'Alle' }]} />
            <span className="text-xs text-muted">{activeCount} von {data.limit} aktiven Projekten in deinem Tarif</span>
          </div>
          {list.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {list.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`}>
                  <Card className="p-5 hover:border-line-strong h-full">
                    <div className="flex justify-between gap-3"><p className="font-medium">{p.title}</p>{p.mission_id && <Badge>Mission</Badge>}</div>
                    <p className="text-sm text-muted mt-1 line-clamp-2">{p.objective || p.description || '—'}</p>
                    <div className="flex justify-between text-xs text-muted mt-4 mb-1.5"><span>{p.doneCount} / {p.taskCount} Aufgaben · {PROJECT_STATUS[p.status]}</span><span className="tabular-nums">{p.progress} %</span></div>
                    <Progress value={p.progress} tone={p.status === 'completed' ? 'ok' : 'accent'} />
                    {p.skills.length > 0 && <p className="text-xs text-faint mt-3 truncate">{p.skills.map((s) => s.name).join(' · ')}</p>}
                  </Card>
                </Link>
              ))}
            </div>
          ) : <p className="text-sm text-muted">Keine Projekte in dieser Ansicht.</p>}
        </>
      )}
      {creating && <NewProjectModal onClose={() => setParams({})} defaultGoal={params.get('goal')} />}
    </>
  )
}

const NEXT_STATUS = { todo: 'doing', doing: 'done', done: 'todo' }
const TASK_MARK = { todo: '○', doing: '●', done: '✓' }

export function ProjectView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, loading, reload, hardReload } = useApi(`/projects/${id}`)
  const catalog = useApi('/catalog')
  useDocumentTitle(data?.title)
  const [task, setTask] = useState('')
  const [note, setNote] = useState('')
  const [completing, setCompleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [result, setResult] = useState({ result: '', resultUrl: '' })
  const fileRef = useRef(null)
  const action = useAction()
  const feedback = useAction()
  const upload = useAction()
  const [confirm, dialog] = useConfirm()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Das Projekt" onRetry={hardReload} />
  const p = data
  const active = p.status === 'active'

  const addTask = (e) => {
    e.preventDefault()
    if (!task.trim()) return
    action.run(() => post(`/projects/${id}/tasks`, { title: task })).then(() => { setTask(''); reload() }).catch(() => {})
  }
  const cycle = (t) => action.run(() => patch(`/tasks/${t.id}`, { status: NEXT_STATUS[t.status] })).then(reload).catch(() => {})
  const askFeedback = () => feedback.run(() => post(`/projects/${id}/feedback`)).then(reload).catch(() => {})
  const addNote = () => feedback.run(() => post(`/projects/${id}/feedback`, { content: note })).then(() => { setNote(''); reload() }).catch(() => {})
  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    form.append('projectId', id)
    upload.run(() => api('/documents', { method: 'POST', form })).then(() => { toast('Datei hochgeladen.'); reload() }).catch(() => {}).finally(() => { e.target.value = '' })
  }
  const complete = () => action.run(() => post(`/projects/${id}/complete`, result)).then(() => {
    setCompleting(false)
    toast('Projekt abgeschlossen und ins Portfolio übernommen.')
    reload()
  }).catch(() => {})
  const remove = async () => {
    if (!(await confirm({ title: 'Projekt löschen?', text: 'Aufgaben und Feedback werden gelöscht. Bereits erfasste Skill-Nachweise bleiben bestehen.', confirmLabel: 'Löschen', danger: true }))) return
    await del(`/projects/${id}`)
    navigate('/projects')
  }

  return (
    <div className="max-w-5xl">
      {dialog}
      <PageHeader back={{ to: '/projects', label: 'Projects' }} title={p.title} subtitle={p.objective}
        actions={<>
          <AskJunisButton label="Frag Junis zu diesem Projekt" contextType="project" contextId={p.id} />
          <Button onClick={() => setEditing(true)}>Bearbeiten</Button>
        </>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-10">
        <div className="lg:col-span-2">
          <Card className="p-5 mb-8">
            <div className="flex justify-between text-sm mb-2"><span className="text-muted">Fortschritt</span><span className="font-semibold tabular-nums">{p.progress} %</span></div>
            <Progress value={p.progress} tone={p.status === 'completed' ? 'ok' : 'accent'} />
            {p.description && <p className="text-sm text-ink-2 mt-4 whitespace-pre-wrap">{p.description}</p>}
            {p.goal && <p className="text-xs text-muted mt-3">Ziel: <Link to={`/goals/${p.goal.id}`} className="text-accent hover:underline">{p.goal.title}</Link></p>}
            {p.mission && <p className="text-xs text-muted mt-1">Teil einer <Link to={`/missions/${p.mission.id}`} className="text-accent hover:underline">Mission</Link></p>}
          </Card>

          <Section title="Aufgaben">
            <Card className="divide-y divide-line">
              {p.tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 group">
                  <button disabled={!active || !!p.mission} onClick={() => cycle(t)} className={cx('size-6 rounded-md text-sm flex items-center justify-center', t.status === 'done' ? 'text-ok' : t.status === 'doing' ? 'text-accent' : 'text-faint', active && !p.mission && 'hover:bg-subtle')} aria-label={`Status von ${t.title}: ${t.status}`} title="Status wechseln: offen → in Arbeit → erledigt">
                    {TASK_MARK[t.status]}
                  </button>
                  <span className={cx('text-sm flex-1', t.status === 'done' && 'text-muted')}>{t.title}</span>
                  {t.status === 'doing' && <Badge tone="accent">In Arbeit</Badge>}
                  {active && !p.mission && <button onClick={() => del(`/tasks/${t.id}`).then(reload)} className="text-xs text-faint hover:text-bad sm:opacity-0 group-hover:opacity-100 focus:opacity-100">Entfernen</button>}
                </div>
              ))}
              {!p.tasks.length && <p className="px-4 py-4 text-sm text-muted">Noch keine Aufgaben.</p>}
              {active && !p.mission && (
                <form className="flex gap-2 p-3" onSubmit={addTask}>
                  <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Neue Aufgabe" className="h-9" aria-label="Neue Aufgabe" />
                  <Button type="submit" size="sm" disabled={!task.trim()}>Hinzufügen</Button>
                </form>
              )}
            </Card>
            {p.mission && <p className="text-xs text-muted mt-2">Aufgaben dieser Mission werden in der Mission abgehakt.</p>}
            <InlineError error={action.error} />
          </Section>

          {p.status === 'completed' && (
            <Section title="Ergebnis">
              <Card className="p-5">
                <p className="text-sm whitespace-pre-wrap">{p.result}</p>
                {p.result_url && <a href={p.result_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline mt-2 inline-block">{p.result_url}</a>}
                <p className="text-xs text-muted mt-3">Abgeschlossen am {formatDate(p.completed_at)}</p>
              </Card>
            </Section>
          )}

          <Section title="Feedback" action={p.aiAvailable && <Button size="sm" onClick={askFeedback} loading={feedback.pending}>Feedback von Junis</Button>}>
            {p.feedback.map((f) => (
              <Card key={f.id} className="p-5 mb-3">
                <p className="text-xs text-muted mb-2">{f.source === 'junis' ? 'Junis' : 'Eigene Notiz'} · {relative(f.created_at)}</p>
                <Markdown>{f.content}</Markdown>
              </Card>
            ))}
            {!p.feedback.length && <p className="text-sm text-muted mb-3">Noch kein Feedback. Junis bewertet nur, was im Projekt beschrieben ist.</p>}
            <div className="flex gap-2">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Eigene Notiz oder Feedback einer anderen Person" aria-label="Notiz" />
              <Button onClick={addNote} disabled={!note.trim()}>Speichern</Button>
            </div>
            <InlineError error={feedback.error} />
          </Section>
        </div>

        <div>
          <Section title="Aktionen">
            <Card className="p-4 flex flex-col gap-2">
              {active && !p.mission && <Button variant="primary" onClick={() => setCompleting(true)}>Projekt abschließen</Button>}
              {!p.mission && p.status !== 'completed' && <Button onClick={() => post(`/projects/${id}/archive`).then(reload)}>{p.status === 'archived' ? 'Wiederherstellen' : 'Archivieren'}</Button>}
              <Button variant="ghost" onClick={remove}>Löschen</Button>
            </Card>
          </Section>
          <Section title="Skills">
            {p.skills.length ? (
              <Card className="divide-y divide-line">
                {p.skills.map((s) => (
                  <Link key={s.id} to={`/skills/${s.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-subtle/60">
                    <span className="text-sm">{s.name}</span><StatusBadge status={s.status} label={`${s.level} %`} />
                  </Link>
                ))}
              </Card>
            ) : <p className="text-sm text-muted">Keine Skills zugeordnet. <button className="text-accent hover:underline" onClick={() => setEditing(true)}>Zuordnen</button></p>}
          </Section>
          <Section title="Dateien" action={<><input ref={fileRef} type="file" className="hidden" onChange={onFile} accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.csv,.json" /><Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} loading={upload.pending}>Hochladen</Button></>}>
            {p.files.length ? (
              <Card className="divide-y divide-line">
                {p.files.map((f) => <Link key={f.id} to={`/knowledge/documents/${f.id}`} className="block px-4 py-2.5 text-sm truncate hover:bg-subtle/60">{f.filename}</Link>)}
              </Card>
            ) : <p className="text-sm text-muted">Noch keine Dateien.</p>}
            <InlineError error={upload.error} />
          </Section>
        </div>
      </div>

      <Modal open={completing} onClose={() => setCompleting(false)} title="Projekt abschließen"
        footer={<><Button variant="ghost" onClick={() => setCompleting(false)}>Abbrechen</Button><Button variant="primary" onClick={complete} loading={action.pending} disabled={!result.result.trim()}>Abschließen</Button></>}>
        <p className="text-sm text-muted mb-4">Das Ergebnis wird im Portfolio gezeigt und zählt als angewandter Nachweis für: {p.skills.map((s) => s.name).join(', ') || 'keine Skills (bitte zuerst zuordnen)'}.</p>
        <Field label="Was ist das Ergebnis?">{(fid) => <Textarea id={fid} value={result.result} onChange={(e) => setResult({ ...result, result: e.target.value })} />}</Field>
        <Field label="Link" optional>{(fid) => <Input id={fid} type="url" value={result.resultUrl} onChange={(e) => setResult({ ...result, resultUrl: e.target.value })} placeholder="https://" />}</Field>
        <InlineError error={action.error} />
      </Modal>
      {editing && catalog.data && <EditProject project={p} catalog={catalog.data} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload() }} />}
    </div>
  )
}

function EditProject({ project, catalog, onClose, onSaved }) {
  const [f, setF] = useState({ title: project.title, objective: project.objective || '', description: project.description || '', skills: project.skills.map((s) => s.id) })
  const { pending, error, run } = useAction()
  return (
    <Modal open onClose={onClose} title="Projekt bearbeiten" width="max-w-2xl"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} onClick={() => run(() => patch(`/projects/${project.id}`, f)).then(onSaved).catch(() => {})}>Speichern</Button></>}>
      <Field label="Titel">{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field>
      <Field label="Ziel des Projekts">{(id) => <Input id={id} value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} />}</Field>
      <Field label="Beschreibung">{(id) => <Textarea id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field>
      <Field label="Skills"><SkillPicker skills={catalog.skills} value={f.skills} onChange={(skills) => setF({ ...f, skills })} /></Field>
      <InlineError error={error} />
    </Modal>
  )
}
