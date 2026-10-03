import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { post, patch, del } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { relative, formatDate, EVIDENCE_LABELS, PRACTICE_KINDS } from '../lib/format.js'
import { useStartStep } from '../lib/steps.js'
import { AskJunisButton } from '../components/AskJunis.jsx'
import { SkillGraph, SkillHistoryChart } from '../components/charts.jsx'
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Section, Select, Segmented,
  SkillBar, Stat, StatusBadge, useConfirm, useToast,
} from '../components/ui.jsx'

export function Skills() {
  useDocumentTitle('Skills')
  const { data, error, loading, reload, hardReload } = useApi('/skills')
  const [view, setView] = useState('list')
  const [adding, setAdding] = useState(false)
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Dein Skill Graph" onRetry={hardReload} />
  const byCat = new Map()
  for (const s of data.skills) {
    if (!byCat.has(s.category)) byCat.set(s.category, [])
    byCat.get(s.category).push(s)
  }
  const counts = {
    verified: data.skills.filter((s) => s.status === 'verified').length,
    evidenced: data.skills.filter((s) => s.status === 'evidenced').length,
    self: data.skills.filter((s) => s.status === 'self').length,
  }
  return (
    <>
      <PageHeader title="Skill Graph" subtitle="Jeder Skill mit Wissensstand, praktischer Erfahrung, Sicherheit der Messung, Fehlerquote und Nachweisen. Selbsteinschätzungen zählen nicht als Fortschritt."
        actions={<><Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'Liste' }, { value: 'graph', label: 'Abhängigkeiten' }]} /><Button variant="primary" onClick={() => setAdding(true)}>Skill hinzufügen</Button></>} />
      {data.skills.length === 0 ? (
        <EmptyState title="Dein Skill Graph ist noch leer." text="Lege ein Ziel an — Junis bestimmt die benötigten Skills automatisch. Oder füge Skills direkt hinzu." action={<Button variant="primary" to="/goals/new">Ziel erstellen</Button>} secondary={<Button onClick={() => setAdding(true)}>Skill hinzufügen</Button>} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
            <Stat label="Skills" value={data.skills.length} />
            <Stat label="Verifiziert" value={counts.verified} hint="Test + angewandter Nachweis" />
            <Stat label="Teilweise nachgewiesen" value={counts.evidenced} />
            <Stat label="Nur Selbsteinschätzung" value={counts.self} />
          </div>
          {view === 'graph' ? (
            <Card className="p-5">
              {data.edges.length ? <SkillGraph skills={data.skills} edges={data.edges} /> : <p className="text-sm text-muted">Zwischen deinen aktuellen Skills gibt es noch keine Abhängigkeiten. Sie erscheinen, sobald verwandte Skills (z. B. Python Grundlagen → Funktionen) im Graph sind.</p>}
            </Card>
          ) : (
            [...byCat.entries()].map(([cat, skills]) => (
              <Section key={cat} title={cat}>
                <Card className="divide-y divide-line">
                  {skills.sort((a, b) => b.level - a.level).map((s) => (
                    <Link key={s.id} to={`/skills/${s.id}`} className="grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,14rem)_1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-subtle/60">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted">{s.band}{s.errorRate != null ? ` · Fehlerquote ${s.errorRate} %` : ''}{s.reviewDue ? ' · Wiederholung fällig' : ''}</p>
                      </div>
                      <SkillBar current={s.level} self={s.level === 0 ? s.selfLevel : null} className="col-span-2 sm:col-span-1 order-last sm:order-none" />
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm tabular-nums w-10 text-right">{s.level} %</span>
                        <StatusBadge status={s.status} label={s.statusLabel} />
                      </div>
                    </Link>
                  ))}
                </Card>
              </Section>
            ))
          )}
        </>
      )}
      {adding && <AddSkill onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload() }} />}
    </>
  )
}

function AddSkill({ onClose, onSaved }) {
  const catalog = useApi('/catalog')
  const [f, setF] = useState({ skillId: '', name: '', category: '', selfLevel: '' })
  const { pending, error, run } = useAction()
  const save = () => run(() => post('/skills', { ...f, skillId: f.skillId || undefined, selfLevel: f.selfLevel === '' ? undefined : Number(f.selfLevel) })).then(onSaved).catch(() => {})
  return (
    <Modal open onClose={onClose} title="Skill hinzufügen" footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" onClick={save} loading={pending} disabled={!f.skillId && !f.name.trim()}>Hinzufügen</Button></>}>
      {catalog.data && (
        <Field label="Aus dem Katalog">{(id) => (
          <Select id={id} value={f.skillId} onChange={(e) => setF({ ...f, skillId: e.target.value })}>
            <option value="">— auswählen —</option>
            {catalog.data.categories.map((c) => <optgroup key={c} label={c}>{catalog.data.skills.filter((s) => s.category === c).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>)}
          </Select>
        )}</Field>
      )}
      {!f.skillId && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Oder eigener Skill">{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
          <Field label="Kategorie" optional>{(id) => <Input id={id} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />}</Field>
        </div>
      )}
      <Field label="Selbsteinschätzung" optional hint="Dient nur als Startpunkt. Der gemessene Stand entsteht durch Übungen und Projekte.">{(id) => (
        <Select id={id} value={f.selfLevel} onChange={(e) => setF({ ...f, selfLevel: e.target.value })}>
          <option value="">Keine Angabe</option>
          <option value="15">Einstieg</option><option value="35">Grundlagen</option><option value="60">Fortgeschritten</option><option value="85">Sicher</option>
        </Select>
      )}</Field>
      <InlineError error={error} />
    </Modal>
  )
}

export function SkillView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, loading, reload, hardReload } = useApi(`/skills/${id}`)
  useDocumentTitle(data?.skill.name)
  const { start, pending, error: stepError } = useStartStep()
  const test = useAction()
  const [confirm, dialog] = useConfirm()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Der Skill" onRetry={hardReload} />
  const { skill: s, evidence, history, requires, neededBy, goals, projects, lessons, sessions, missions } = data

  const verificationTest = () => test.run(async () => {
    const r = await post('/practice', { skillId: s.id, kind: 'exam', difficulty: Math.max(3, s.difficulty) })
    navigate(`/practice/${r.id}`)
  }).catch(() => {})
  const setSelf = (v) => patch(`/skills/${s.id}`, { selfLevel: v === '' ? null : Number(v) }).then(() => { toast('Selbsteinschätzung gespeichert.'); reload() })
  const remove = async () => {
    if (!(await confirm({ title: 'Skill aus dem Graph entfernen?', text: 'Messwerte und Verlauf dieses Skills werden gelöscht. Nachweise (Tests, Projekte) bleiben erhalten.', confirmLabel: 'Entfernen', danger: true }))) return
    await del(`/skills/${s.id}`)
    navigate('/skills')
  }

  return (
    <div className="max-w-5xl">
      {dialog}
      <PageHeader back={{ to: '/skills', label: 'Skills' }} title={s.name} subtitle={`${s.category}${s.subcategory ? ` · ${s.subcategory}` : ''}${s.description ? ` — ${s.description}` : ''}`}
        actions={<AskJunisButton label="Wie verbessere ich diesen Skill?" contextType="skill" contextId={s.name} prompt={`Wie verbessere ich meinen Skill „${s.name}“ am effektivsten? Mein Stand: ${s.level} %.`} autoSend />} />

      <Card className="p-5 mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <StatusBadge status={s.status} label={s.statusLabel} />
          {s.level > 0 && <span className="text-sm text-muted">{s.band}</span>}
          {s.reviewDue && <Badge tone="warn">Wiederholung fällig</Badge>}
          {s.stale && <Badge tone="warn">Länger nicht genutzt</Badge>}
          {s.flag === 'reexplain' && <Badge tone="warn">Braucht neue Erklärung</Badge>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Gemessen" value={`${s.level} %`} hint="Ø aus Wissen und Praxis" />
          <Stat label="Wissen" value={`${s.knowledge} %`} />
          <Stat label="Praxis" value={`${s.practice} %`} />
          <Stat label="Sicherheit der Messung" value={`${s.confidence} %`} hint={s.confidence < 40 ? 'Wenig Daten' : 'Gut belegt'} />
          <Stat label="Fehlerquote" value={s.errorRate != null ? `${s.errorRate} %` : '—'} hint={`${s.attempts} Aufgaben`} />
          <Stat label="Letzte Nutzung" value={s.lastUsedAt ? relative(s.lastUsedAt) : '—'} />
          <Stat label="Letzte Prüfung" value={s.lastTestedAt ? relative(s.lastTestedAt) : '—'} />
          <Stat label="Nächste Wiederholung" value={s.nextReviewAt ? formatDate(s.nextReviewAt) : '—'} />
        </div>
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-line">
          <Button variant="primary" onClick={() => start({ type: s.knowledge < 35 ? 'lesson' : 'practice', skillId: s.id })} loading={pending}>{s.knowledge < 35 ? 'Lernen' : 'Üben'}</Button>
          <Button onClick={verificationTest} loading={test.pending}>Skill testen</Button>
          {s.reviewDue && <Button onClick={() => start({ type: 'review', skillId: s.id })} loading={pending}>Wiederholen</Button>}
          {missions.length > 0 && <Button variant="ghost" to={`/missions?skill=${s.id}`}>Anwenden in Mission</Button>}
        </div>
        <InlineError error={stepError || test.error} />
        {s.verificationLocked && <p className="text-sm text-muted mt-4">Die Nachweise für eine Verifizierung liegen vor. Das Verified-Badge ist Teil von Pro. <Link to="/billing" className="text-accent hover:underline">Tarife ansehen</Link></p>}
        {s.status !== 'verified' && !s.verificationLocked && (
          <p className="text-xs text-muted mt-4">Verifiziert wird ein Skill durch einen bestandenen Test ab Stufe 3 (mind. 80 %) <em>und</em> einen angewandten Nachweis (Projekt oder Mission).</p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-10">
        <div className="lg:col-span-2">
          <Section title="Entwicklungsverlauf">
            <Card className="p-5"><SkillHistoryChart history={history} /></Card>
          </Section>
          <Section title="Nachweise">
            {evidence.length ? (
              <Card className="divide-y divide-line">
                {evidence.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <Badge>{EVIDENCE_LABELS[e.type] ?? e.type}</Badge>
                    <span className="flex-1 truncate">{e.title}</span>
                    {e.score != null && <span className="tabular-nums text-muted">{Math.round(e.score * 100)} %</span>}
                    <span className="text-xs text-muted">{formatDate(e.created_at)}</span>
                  </div>
                ))}
              </Card>
            ) : <p className="text-sm text-muted">Noch keine Nachweise. Übungen, Projekte und Missions erzeugen Nachweise.</p>}
          </Section>
          {sessions.length > 0 && (
            <Section title="Übungen">
              <Card className="divide-y divide-line">
                {sessions.map((x) => (
                  <Link key={x.id} to={`/practice/${x.id}`} className="flex justify-between px-4 py-2.5 text-sm hover:bg-subtle/60">
                    <span>{PRACTICE_KINDS[x.kind]} · Stufe {x.difficulty}</span>
                    <span className="tabular-nums">{Math.round(x.score * 100)} % · <span className="text-muted">{relative(x.completed_at)}</span></span>
                  </Link>
                ))}
              </Card>
            </Section>
          )}
        </div>
        <div>
          <Section title="Voraussetzungen">
            {requires.length ? (
              <Card className="divide-y divide-line">
                {requires.map((r) => <Link key={r.id} to={`/skills/${r.id}`} className="flex justify-between px-4 py-2.5 text-sm hover:bg-subtle/60"><span>{r.name}</span><span className="tabular-nums text-muted">{r.level} %</span></Link>)}
              </Card>
            ) : <p className="text-sm text-muted">Keine.</p>}
          </Section>
          <Section title="Wird benötigt für">
            {neededBy.length ? <p className="text-sm">{neededBy.map((n, i) => <span key={n.id}>{i > 0 && ', '}<Link to={`/skills/${n.id}`} className="hover:underline">{n.name}</Link></span>)}</p> : <p className="text-sm text-muted">—</p>}
          </Section>
          <Section title="Ziele & Projekte">
            {goals.map((g) => <Link key={g.id} to={`/goals/${g.id}`} className="block text-sm hover:underline mb-1">{g.title} <span className="text-muted">· Ziel {g.target_level} %</span></Link>)}
            {projects.map((p) => <Link key={p.id} to={`/projects/${p.id}`} className="block text-sm hover:underline mb-1">{p.title} <span className="text-muted">· Projekt</span></Link>)}
            {!goals.length && !projects.length && <p className="text-sm text-muted">Keine Verknüpfungen.</p>}
          </Section>
          {lessons.length > 0 && (
            <Section title="Lektionen">
              {lessons.slice(0, 8).map((l) => <Link key={l.id} to={`/learn/lessons/${l.id}`} className="block text-sm hover:underline mb-1 truncate">{l.title}</Link>)}
            </Section>
          )}
          <Section title="Selbsteinschätzung">
            <Select value={s.selfLevel ?? ''} onChange={(e) => setSelf(e.target.value)} aria-label="Selbsteinschätzung">
              <option value="">Keine Angabe</option>
              <option value="15">Einstieg</option><option value="35">Grundlagen</option><option value="60">Fortgeschritten</option><option value="85">Sicher</option>
            </Select>
            <p className="text-xs text-muted mt-2">Nur ein Startwert. Bestätigt wird ein Skill ausschließlich durch Nachweise.</p>
            <Button size="sm" variant="ghost" className="mt-4" onClick={remove}>Aus Skill Graph entfernen</Button>
          </Section>
        </div>
      </div>
    </div>
  )
}
