import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { post, patch, del } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { formatDate } from '../lib/format.js'
import { AskJunisButton } from '../components/AskJunis.jsx'
import { Roadmap } from '../components/charts.jsx'
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Progress, Section, Select, Textarea,
  UpgradeNotice, StatusBadge, cx,
} from '../components/ui.jsx'

const OPP_TYPES = { internship: 'Praktikum', competition: 'Wettbewerb', program: 'Lernprogramm', project: 'Projekt', training: 'Weiterbildung', job: 'Job', research: 'Forschungsprogramm' }
const OPP_STATUS = { interested: 'Interessant', preparing: 'In Vorbereitung', applied: 'Beworben', accepted: 'Zusage', rejected: 'Absage', closed: 'Geschlossen' }

export function Career() {
  useDocumentTitle('Career')
  const { data, error, loading, reload, hardReload } = useApi('/career')
  const [adding, setAdding] = useState(false)
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Der Karrierebereich" onRetry={hardReload} />
  return (
    <>
      <PageHeader title="Career" subtitle="Karrierewege als konkrete Schritte — mit deinem gemessenen Stand an jedem Punkt. Junis zeigt Optionen, keine Erfolgsgarantien." />
      {!data.enabled ? (
        <>
          <UpgradeNotice message="Career Intelligence ist Teil von Pro: Karrierewege mit Skill-Abgleich, Schritt-für-Schritt-Status und Chancen-Tracker." />
          <Section title="Verfügbare Karrierewege" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.paths.map((p) => <Card key={p.id} className="p-5"><p className="font-medium">{p.title}</p><p className="text-sm text-muted mt-1">{p.summary}</p></Card>)}
            </div>
          </Section>
        </>
      ) : (
        <>
          {data.careerGoal && <p className="text-sm text-muted mb-6">Dein Karriereziel: <span className="text-ink font-medium">{data.careerGoal}</span></p>}
          <Section title="Karrierewege">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.paths.map((p) => (
                <Link key={p.id} to={`/career/${p.id}`}>
                  <Card className="p-5 hover:border-line-strong h-full">
                    <div className="flex justify-between gap-2"><p className="font-medium">{p.title}</p>{p.adopted && <Badge tone="accent">Verfolgt</Badge>}</div>
                    <p className="text-sm text-muted mt-1">{p.summary}</p>
                    <p className="text-xs text-faint mt-3">{p.field} · {p.stepCount} Schritte</p>
                  </Card>
                </Link>
              ))}
            </div>
          </Section>
          <Section title="Chancen" description="Praktika, Wettbewerbe, Programme und Jobs, die du verfolgst. Junis bewirbt dich nie automatisch."
            action={<div className="flex gap-2"><Button size="sm" to={`/knowledge?tab=research&q=${encodeURIComponent(`Aktuelle Praktika, Wettbewerbe oder Programme für: ${data.careerGoal || 'meine Ziele'}`)}`}>Mit Research suchen</Button><Button size="sm" variant="primary" onClick={() => setAdding(true)}>Chance hinzufügen</Button></div>}>
            {data.opportunities.length ? (
              <Card className="divide-y divide-line">
                {data.opportunities.map((o) => (
                  <div key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{o.url ? <a href={o.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{o.title}</a> : o.title}</p>
                      <p className="text-xs text-muted">{OPP_TYPES[o.type]}{o.organization ? ` · ${o.organization}` : ''}{o.deadline ? ` · Frist ${formatDate(o.deadline)}` : ''}</p>
                    </div>
                    <Select value={o.status} onChange={(e) => patch(`/opportunities/${o.id}`, { status: e.target.value }).then(reload)} className="h-8 w-auto text-sm" aria-label="Status">
                      {Object.entries(OPP_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                    <button onClick={() => del(`/opportunities/${o.id}`).then(reload)} className="text-xs text-faint hover:text-bad">Entfernen</button>
                  </div>
                ))}
              </Card>
            ) : <EmptyState title="Noch keine Chancen gespeichert." text="Speichere Chancen, die du gefunden hast, oder lass Junis Research nach aktuellen Angeboten suchen — mit Quellen." />}
          </Section>
        </>
      )}
      {adding && <AddOpportunity onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload() }} />}
    </>
  )
}

function AddOpportunity({ onClose, onSaved }) {
  const [f, setF] = useState({ title: '', type: 'internship', organization: '', url: '', deadline: '', notes: '' })
  const { pending, error, run } = useAction()
  return (
    <Modal open onClose={onClose} title="Chance hinzufügen"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!f.title.trim()} onClick={() => run(() => post('/opportunities', f)).then(onSaved).catch(() => {})}>Speichern</Button></>}>
      <Field label="Titel">{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Art">{(id) => <Select id={id} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{Object.entries(OPP_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
        <Field label="Frist" optional>{(id) => <Input id={id} type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />}</Field>
      </div>
      <Field label="Organisation" optional>{(id) => <Input id={id} value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} />}</Field>
      <Field label="Link" optional>{(id) => <Input id={id} type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" />}</Field>
      <Field label="Notizen" optional>{(id) => <Textarea id={id} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />}</Field>
      <InlineError error={error} />
    </Modal>
  )
}

export function CareerPathView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, error, loading, reload, hardReload } = useApi(`/career/${id}`)
  useDocumentTitle(data?.title)
  const [open, setOpen] = useState(null)
  const adopt = useAction()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Der Karriereweg" onRetry={hardReload} />
  const doneCount = data.steps.filter((s) => s.done).length

  return (
    <div className="max-w-4xl">
      <PageHeader back={{ to: '/career', label: 'Career' }} title={data.title} subtitle={data.summary}
        actions={<>
          <AskJunisButton label="Frag Junis zu diesem Weg" contextType="career" contextId={data.title} />
          {data.adopted
            ? <Button onClick={() => navigate(`/goals/${data.goalId}`)} disabled={!data.goalId}>Zum Ziel</Button>
            : <Button variant="primary" loading={adopt.pending} onClick={() => adopt.run(() => post(`/career/${id}/adopt`)).then((r) => navigate(`/goals/${r.goalId}`)).catch(() => {})}>Diesen Weg verfolgen</Button>}
        </>} />
      <InlineError error={adopt.error} />
      <Card className="p-4 mb-8">
        <div className="flex justify-between text-sm"><span className="text-muted">{doneCount} von {data.steps.length} Schritten erreicht</span></div>
        <Progress value={(doneCount / data.steps.length) * 100} className="mt-2" />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-10">
        <div className="lg:col-span-2">
          <Section title="Weg">
            <p className="text-sm text-muted mb-4"><span className="text-ink font-medium">Heute</span> — dein aktueller Stand ist bei jedem Schritt eingetragen.</p>
            <Roadmap steps={data.steps} renderStep={(s, i) => (
              <div>
                <button onClick={() => setOpen(open === i ? null : i)} className="text-left w-full" aria-expanded={open === i}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cx('font-medium', s.type === 'role' && 'text-accent')}>{s.title}</p>
                    {s.done && <Badge tone="ok">Erreicht</Badge>}
                    {s.current && <Badge tone="accent">Nächster Schritt</Badge>}
                    {s.type === 'project' && <Badge>Projekte</Badge>}
                    {s.type === 'role' && <Badge>Rolle</Badge>}
                  </div>
                  {s.progress != null && s.type !== 'role' && <p className="text-xs text-muted mt-1">{s.detail}</p>}
                </button>
                {open === i && (
                  <Card className="p-4 mt-3">
                    {s.type === 'role' && <p className="text-sm text-muted">{s.detail}</p>}
                    {s.type === 'project' && (
                      <>
                        <p className="text-sm">Schließe {s.count} Projekt(e) ab, die diese Skills anwenden. Abgeschlossene Projekte zählen automatisch.</p>
                        <div className="flex gap-2 mt-3"><Button size="sm" to={`/missions?skill=${s.skills[0]}`}>Passende Mission</Button><Button size="sm" to="/projects?new=1">Projekt erstellen</Button></div>
                      </>
                    )}
                    {s.skills?.length > 0 && (
                      <div className="divide-y divide-line mt-2">
                        {s.skills.map((k) => (
                          <Link key={k.id} to={`/skills/${k.id}`} className="flex justify-between items-center py-2 text-sm hover:underline">
                            <span>{k.name}</span><StatusBadge status={k.status} label={`${k.level} %`} />
                          </Link>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            )} />
          </Section>
        </div>
        <div>
          <Section title="Mögliche Wege dorthin">
            <ul className="text-sm space-y-2">{data.routes.map((r) => <li key={r}>— {r}</li>)}</ul>
          </Section>
          <Section title="Spezialisierungen">
            <div className="flex flex-wrap gap-1.5">{data.specializations.map((x) => <Badge key={x}>{x}</Badge>)}</div>
          </Section>
          <p className="text-xs text-muted">Hinweis: Dieser Weg ist eine Orientierung. Tatsächliche Anforderungen unterscheiden sich je nach Arbeitgeber, Land und Zeitpunkt. Junis garantiert keine Anstellung oder Zulassung.</p>
          {data.adopted && <Button size="sm" variant="ghost" className="mt-4" onClick={() => del(`/career/${id}/adopt`).then(reload)}>Nicht mehr verfolgen</Button>}
        </div>
      </div>
    </div>
  )
}
