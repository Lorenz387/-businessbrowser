import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { post, del } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { AskJunisButton } from '../components/AskJunis.jsx'
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Progress, Section, StatusBadge, Tabs, Textarea, useConfirm, useToast, cx,
} from '../components/ui.jsx'

export function Missions() {
  useDocumentTitle('Missions')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data, error, loading, hardReload } = useApi('/missions')
  const [tab, setTab] = useState(params.get('m') || params.get('skill') ? 'catalog' : 'mine')
  const [open, setOpen] = useState(params.get('m'))
  const { pending, error: startError, run } = useAction()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Die Missions" onRetry={hardReload} />
  const skillFilter = params.get('skill')
  const catalog = data.catalog
    .filter((m) => !skillFilter || m.skills.includes(skillFilter))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended))
  const active = data.mine.filter((m) => m.status === 'active')
  const mission = data.catalog.find((m) => m.id === open)

  const startMission = (id) => run(async () => {
    const r = await post(`/missions/${id}/start`)
    navigate(`/missions/${r.id}`)
  }).catch(() => {})

  return (
    <>
      <PageHeader title="Missions" subtitle="Reale Aufgaben mit echtem Ergebnis. Jede abgeschlossene Mission ist ein Nachweis für die trainierten Skills." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'mine', label: 'Meine Missions', count: data.mine.length }, { value: 'catalog', label: 'Alle Missions', count: data.catalog.length }]} />
      {tab === 'mine' && (
        data.mine.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.mine.map((m) => (
              <Link key={m.id} to={`/missions/${m.id}`}>
                <Card className="p-5 hover:border-line-strong h-full">
                  <div className="flex justify-between gap-3"><p className="font-medium">{m.mission?.title}</p><Badge tone={m.status === 'completed' ? 'ok' : m.status === 'active' ? 'accent' : 'neutral'}>{{ active: 'Aktiv', completed: 'Abgeschlossen', abandoned: 'Abgebrochen' }[m.status]}</Badge></div>
                  <p className="text-xs text-muted mt-3 mb-1.5">{m.stepsDone.length} von {m.mission?.steps.length} Schritten</p>
                  <Progress value={m.progress} />
                </Card>
              </Link>
            ))}
          </div>
        ) : <EmptyState title="Noch keine Mission gestartet." text="Missions verbinden Lernen mit echten Ergebnissen — z. B. deine erste Wetter-App oder eine Unternehmensanalyse." action={<Button variant="primary" onClick={() => setTab('catalog')}>Missions entdecken</Button>} />
      )}
      {tab === 'catalog' && (
        <>
          {skillFilter && <p className="text-sm text-muted mb-4">Gefiltert nach Skill. <Link to="/missions" className="text-accent hover:underline" onClick={() => setTab('catalog')}>Filter entfernen</Link></p>}
          <p className="text-xs text-muted mb-4">{active.length} von {data.limit} aktiven Missions in deinem Tarif</p>
          {catalog.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {catalog.map((m) => (
                <button key={m.id} onClick={() => setOpen(m.id)} className="text-left">
                  <Card className="p-5 hover:border-line-strong h-full">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{m.title}</p>
                      {m.recommended && <Badge tone="accent">Passt zu deinen Zielen</Badge>}
                    </div>
                    <p className="text-sm text-muted mt-1.5">{m.summary}</p>
                    <p className="text-xs text-faint mt-3">{m.level} · ca. {m.hours} Std. · {m.steps.length} Schritte</p>
                  </Card>
                </button>
              ))}
            </div>
          ) : <EmptyState title="Für diesen Skill gibt es noch keine Mission." text="Lege stattdessen ein eigenes Projekt an — Junis hilft beim Planen." action={<Button variant="primary" to="/projects?new=1">Projekt erstellen</Button>} />}
        </>
      )}
      {mission && (
        <Modal open onClose={() => setOpen(null)} title={mission.title} width="max-w-xl"
          footer={<><Button variant="ghost" onClick={() => setOpen(null)}>Schließen</Button><Button variant="primary" onClick={() => startMission(mission.id)} loading={pending} disabled={data.mine.some((x) => x.mission_id === mission.id && x.status === 'active')}>{data.mine.some((x) => x.mission_id === mission.id && x.status === 'active') ? 'Läuft bereits' : 'Mission starten'}</Button></>}>
          <p className="text-sm text-ink-2">{mission.summary}</p>
          <p className="text-xs text-muted mt-3">Benötigte Skills: {mission.skillNames.join(', ')}</p>
          <ol className="mt-4 space-y-2">
            {mission.steps.map((s, i) => <li key={i} className="text-sm"><span className="text-faint tabular-nums mr-2">{i + 1}.</span><span className="font-medium">{s.title}</span> <span className="text-muted">— {s.detail}</span></li>)}
          </ol>
          <p className="text-sm mt-4"><span className="text-muted">Ergebnis: </span>{mission.result}</p>
          <InlineError error={startError} />
        </Modal>
      )}
    </>
  )
}

export function MissionView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, loading, reload, hardReload } = useApi(`/user-missions/${id}`)
  useDocumentTitle(data?.mission.title)
  const [complete, setComplete] = useState(false)
  const [result, setResult] = useState({ result: '', resultUrl: '' })
  const action = useAction()
  const [confirm, dialog] = useConfirm()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Die Mission" onRetry={hardReload} />
  const m = data.mission
  const done = new Set(data.stepsDone)
  const allDone = done.size === m.steps.length

  const toggle = (i) => action.run(() => post(`/user-missions/${id}/steps/${i}`, { done: !done.has(i) })).then(reload).catch(() => {})
  const finish = () => action.run(() => post(`/user-missions/${id}/complete`, result)).then(() => {
    setComplete(false)
    toast('Mission abgeschlossen. Die Skills wurden als angewandt nachgewiesen.')
    reload()
  }).catch(() => {})
  const abandon = async () => {
    if (!(await confirm({ title: 'Mission abbrechen?', text: 'Dein Fortschritt bleibt im Projekt erhalten, die Mission zählt aber nicht als abgeschlossen.', confirmLabel: 'Abbrechen', danger: true }))) return
    await del(`/user-missions/${id}`)
    navigate('/missions')
  }

  return (
    <div className="max-w-4xl">
      {dialog}
      <PageHeader back={{ to: '/missions', label: 'Missions' }} title={m.title} subtitle={m.summary}
        actions={<AskJunisButton label="Frag Junis zur Mission" contextType="mission" contextId={`${m.title}: ${m.summary}`} />} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-10">
        <div className="lg:col-span-2">
          <Section title="Ablauf">
            <Card className="divide-y divide-line">
              {m.steps.map((s, i) => (
                <label key={i} className={cx('flex gap-3 px-4 py-4', data.status === 'active' && 'cursor-pointer hover:bg-subtle/50')}>
                  <input type="checkbox" className="mt-1 size-4 accent-accent" checked={done.has(i)} disabled={data.status !== 'active' || action.pending} onChange={() => toggle(i)} />
                  <div>
                    <p className={cx('text-sm font-medium', done.has(i) && 'text-muted line-through')}>{i + 1}. {s.title}</p>
                    <p className="text-sm text-muted mt-0.5">{s.detail}</p>
                    <p className="text-xs text-faint mt-1">Ergebnis: {s.deliverable}</p>
                  </div>
                </label>
              ))}
            </Card>
            <InlineError error={action.error} />
          </Section>
          {data.status === 'completed' && data.project && (
            <Card className="p-5 mb-8">
              <p className="text-xs text-muted">Ergebnis</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{data.project.result}</p>
              {data.project.result_url && <a href={data.project.result_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline mt-2 inline-block">{data.project.result_url}</a>}
            </Card>
          )}
        </div>
        <div>
          <Section title="Status">
            <Card className="p-4">
              <p className="text-sm">{done.size} von {m.steps.length} Schritten</p>
              <Progress value={(done.size / m.steps.length) * 100} className="mt-2" />
              {data.status === 'active' && (
                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="primary" disabled={!allDone} onClick={() => setComplete(true)}>Mission abschließen</Button>
                  {!allDone && <p className="text-xs text-muted">Hake alle Schritte ab, um die Mission abzuschließen.</p>}
                  {data.project && <Button to={`/projects/${data.project.id}`}>Projekt, Dateien & Feedback</Button>}
                  <Button variant="ghost" onClick={abandon}>Mission abbrechen</Button>
                </div>
              )}
              {data.status === 'completed' && <Badge tone="ok" className="mt-3">Abgeschlossen</Badge>}
            </Card>
          </Section>
          <Section title="Trainierte Skills">
            <Card className="divide-y divide-line">
              {m.skillDetails.map((s) => (
                <Link key={s.id} to={`/skills/${s.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-subtle/60">
                  <span className="text-sm">{s.name}</span>
                  <StatusBadge status={s.status} label={`${s.level} %`} />
                </Link>
              ))}
            </Card>
          </Section>
        </div>
      </div>
      <Modal open={complete} onClose={() => setComplete(false)} title="Mission abschließen"
        footer={<><Button variant="ghost" onClick={() => setComplete(false)}>Abbrechen</Button><Button variant="primary" onClick={finish} loading={action.pending} disabled={!result.result.trim()}>Abschließen</Button></>}>
        <p className="text-sm text-muted mb-4">Beschreibe das Ergebnis. Es erscheint in deinem Portfolio als Nachweis für: {m.skillDetails.map((s) => s.name).join(', ')}.</p>
        <Field label="Was hast du erreicht?">{(fid) => <Textarea id={fid} value={result.result} onChange={(e) => setResult({ ...result, result: e.target.value })} />}</Field>
        <Field label="Link zum Ergebnis" optional>{(fid) => <Input id={fid} type="url" value={result.resultUrl} onChange={(e) => setResult({ ...result, resultUrl: e.target.value })} placeholder="https://" />}</Field>
        <InlineError error={action.error} />
      </Modal>
    </div>
  )
}
