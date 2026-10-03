import { Link } from 'react-router-dom'
import { useApi, useDocumentTitle } from '../lib/hooks.js'
import { formatDate, EVIDENCE_LABELS } from '../lib/format.js'
import Markdown from '../components/Markdown.jsx'
import { Badge, Button, Card, EmptyState, ErrorState, Loading, PageHeader, Section, StatusBadge, SkillBar } from '../components/ui.jsx'

const TIMELINE = { project_completed: 'Projekt abgeschlossen', mission_completed: 'Mission abgeschlossen', goal_completed: 'Ziel erreicht', milestone: 'Meilenstein' }

export default function Portfolio() {
  useDocumentTitle('Portfolio')
  const { data, error, loading, hardReload } = useApi('/portfolio')
  if (loading) return <Loading />
  if (error) return <><PageHeader title="Portfolio" /><ErrorState error={error} what="Dein Portfolio" onRetry={hardReload} /></>
  const empty = !data.skills.length && !data.projects.length
  return (
    <div className="max-w-4xl">
      <PageHeader title="Portfolio" subtitle="Automatisch aus nachweisbaren Leistungen erstellt: bestandene Tests, abgeschlossene Projekte und Missions. Keine Selbsteinschätzungen, keine erfundenen Zertifikate."
        actions={!empty && <Button onClick={() => window.print()}>Drucken / PDF</Button>} />
      {empty ? (
        <EmptyState title="Noch keine nachweisbaren Leistungen." text="Schließe eine Übung, ein Projekt oder eine Mission ab — Nachweise erscheinen hier automatisch." action={<Button variant="primary" to="/missions">Mission starten</Button>} secondary={<Button to="/practice">Üben</Button>} />
      ) : (
        <>
          <p className="text-lg font-semibold mb-8">{data.name}</p>
          <Section title="Skills">
            <Card className="divide-y divide-line">
              {data.skills.map((s) => (
                <div key={s.id} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link to={`/skills/${s.id}`} className="font-medium text-sm hover:underline">{s.name}</Link>
                    <span className="text-sm text-muted">{s.band}</span>
                    <StatusBadge status={s.status} label={s.statusLabel} />
                    <span className="ml-auto text-sm tabular-nums">{s.level} %</span>
                  </div>
                  <SkillBar current={s.level} className="mt-2" />
                  <p className="text-xs text-muted mt-2">Nachweise: {s.evidence.slice(0, 4).map((e) => `✓ ${EVIDENCE_LABELS[e.type]}: ${e.title}`).join(' · ')}{s.evidence.length > 4 ? ` · +${s.evidence.length - 4}` : ''}</p>
                </div>
              ))}
            </Card>
          </Section>
          <Section title="Projekte & Missions">
            {data.projects.length ? data.projects.map((p) => (
              <Card key={p.id} className="p-5 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/projects/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                  {p.mission_id && <Badge>Mission</Badge>}
                  <span className="text-xs text-muted ml-auto">{formatDate(p.completed_at)}</span>
                </div>
                {p.objective && <p className="text-sm text-muted mt-1">{p.objective}</p>}
                <p className="text-sm mt-3 whitespace-pre-wrap">{p.result}</p>
                {p.result_url && <a href={p.result_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline mt-1 inline-block break-all">{p.result_url}</a>}
                {p.skills.length > 0 && <p className="text-xs text-faint mt-3">Skills entwickelt: {p.skills.join(' · ')}</p>}
              </Card>
            )) : <p className="text-sm text-muted">Noch keine abgeschlossenen Projekte.</p>}
          </Section>
          <Section title="Bestandene Prüfungen" description="Tests ab Stufe 3 mit mindestens 80 %.">
            {data.tests.length ? (
              <Card className="divide-y divide-line">
                {data.tests.map((t) => (
                  <Link key={t.id} to={`/practice/${t.id}`} className="flex justify-between px-4 py-2.5 text-sm hover:bg-subtle/60">
                    <span>{t.skillName} · Stufe {t.difficulty}</span>
                    <span className="tabular-nums">{Math.round(t.score * 100)} % · <span className="text-muted">{formatDate(t.completed_at)}</span></span>
                  </Link>
                ))}
              </Card>
            ) : <p className="text-sm text-muted">Noch keine bestandene Prüfung ab Stufe 3.</p>}
          </Section>
          {data.feedback.length > 0 && (
            <Section title="Feedback">
              {data.feedback.map((f, i) => (
                <Card key={i} className="p-5 mb-3">
                  <p className="text-xs text-muted mb-2">Junis zu „{f.title}“ · {formatDate(f.created_at)}</p>
                  <Markdown>{f.content}</Markdown>
                </Card>
              ))}
            </Section>
          )}
          <Section title="Entwicklungsverlauf">
            {data.timeline.length ? (
              <ol className="border-l border-line pl-5 space-y-3">
                {data.timeline.map((t, i) => <li key={i} className="text-sm"><span className="text-muted">{formatDate(t.created_at)} · {TIMELINE[t.type]}</span><br />{t.title}</li>)}
              </ol>
            ) : <p className="text-sm text-muted">—</p>}
          </Section>
          <p className="text-xs text-muted">Dieses Portfolio zeigt Leistungen, die in JunisWorld erbracht und automatisch erfasst wurden. Es ist kein staatlich anerkanntes Zertifikat.</p>
        </>
      )}
    </div>
  )
}
