// Junis Talent inside JunisWorld core pages: status, offers and market-based skill gaps.
import { Link } from 'react-router-dom'
import { useApi } from '../lib/hooks.js'
import { useJunis } from './AskJunis.jsx'
import { Badge, Button, Card, Section } from './ui.jsx'

const STAGE = {
  profile: ['Profil anlegen', 'Lade deinen Lebenslauf hoch oder fülle dein Profil aus.', '/talent?tab=profile'],
  interview: ['Fachinterview führen', 'Ca. 20 Minuten, mit vollständigem Feedback zu Stärken und Entwicklungsfeldern.', '/talent?tab=interview'],
  pool: ['In den Pool aufnehmen', 'Erst dann können Unternehmen dich (anonym) für Projekte finden.', '/talent?tab=profile'],
}

export function useTalentSummary() {
  return useApi('/apps/talent/summary')
}

/** Skill gaps derived from real open projects — each links into the JunisWorld skill graph. */
export function SkillGapList({ gaps }) {
  const openJunis = useJunis()
  if (!gaps?.length) return <p className="text-sm text-muted">Keine Lücken gegenüber aktuell offenen Projekten in deinen Fachgebieten.</p>
  return (
    <div className="divide-y divide-line">
      {gaps.map((g) => (
        <div key={g.name} className="flex flex-wrap items-center gap-2 py-2 text-sm">
          <span className="font-medium flex-1 min-w-0 truncate">{g.name}</span>
          <span className="text-xs text-muted">{g.projects} Projekt{g.projects === 1 ? '' : 'e'}{g.must ? ` · ${g.must}× Pflicht` : ''}</span>
          {g.skillId
            ? <Link to={`/skills/${g.skillId}`} className="text-accent hover:underline text-xs">Im Skill Graph trainieren →</Link>
            : <button onClick={() => openJunis({ prompt: `Wie baue ich den Skill „${g.name}“ gezielt auf? Bitte mit konkretem Lernweg und Übungsprojekt.`, autoSend: true })} className="text-accent hover:underline text-xs">Lernweg mit Junis →</button>}
        </div>
      ))}
    </div>
  )
}

/** Home: only shown when there is something to act on. */
export function TalentHomeCard() {
  const { data } = useTalentSummary()
  if (!data) return null
  const items = []
  if (data.invited) items.push(['warn', `${data.invited} Einladung${data.invited === 1 ? '' : 'en'} wartet auf deine Antwort`, '/talent?tab=offers'])
  if (data.matched) items.push(['accent', `${data.matched} passende${data.matched === 1 ? 's Projekt' : ' Projekte'} für dich`, '/talent?tab=offers'])
  if (data.interviewInProgress) items.push(['neutral', 'Dein Fachinterview ist noch nicht abgeschlossen', '/talent?tab=interview'])
  if (data.company?.accepted) items.push(['ok', `${data.company.accepted} Talent${data.company.accepted === 1 ? ' hat' : 's haben'} deine Einladung angenommen`, '/talent?side=company'])
  if (data.company?.interested) items.push(['accent', `${data.company.interested} Talent${data.company.interested === 1 ? ' zeigt' : 's zeigen'} Interesse an deinen Ausschreibungen`, '/talent?side=company'])
  if (!items.length) return null
  return (
    <Section title="Talent" action={<Link to="/talent" className="text-sm text-muted hover:text-ink">Öffnen</Link>}>
      <Card className="divide-y divide-line">
        {items.map(([tone, text, to]) => (
          <Link key={text} to={to} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-subtle/60">
            <Badge tone={tone}>Talent</Badge><span className="flex-1">{text}</span><span className="text-muted">→</span>
          </Link>
        ))}
      </Card>
    </Section>
  )
}

/** Career: the bridge from skill development to real projects. */
export function TalentCareerSection() {
  const { data, error } = useTalentSummary()
  if (error || !data) return null
  const next = STAGE[data.stage]
  return (
    <Section title="Talent · Projekte & Jobs" description="Dein Fachinterview, passende Projekte und welche Skills echte Ausschreibungen von dir verlangen."
      action={<Button size="sm" to="/talent">Talent öffnen</Button>}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted">Status</p>
          {next ? (
            <>
              <p className="font-medium mt-1">{next[0]}</p>
              <p className="text-xs text-muted mt-1">{next[1]}</p>
              <Button size="sm" variant="primary" className="mt-3" to={next[2]}>Weiter</Button>
            </>
          ) : (
            <>
              <p className="font-medium mt-1">Im Pool{data.interview?.overall != null ? ` · Interview ${data.interview.overall}/100` : ''}</p>
              <p className="text-xs text-muted mt-1">Unternehmen finden dich anonym, bis du eine Einladung annimmst.</p>
              <Link to="/talent?tab=interview" className="text-xs text-accent hover:underline mt-3 inline-block">Feedback ansehen →</Link>
            </>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Angebote</p>
          {data.offers.length ? (
            <div className="mt-1 space-y-2">
              {data.offers.map((o) => (
                <Link key={o.id} to="/talent?tab=offers" className="block text-sm hover:underline">
                  <span className="font-medium">{o.title}</span><span className="text-muted"> · {o.company} · {o.score} %</span>
                  {o.status === 'invited' && <Badge tone="warn" className="ml-1">Einladung</Badge>}
                </Link>
              ))}
            </div>
          ) : <p className="text-sm text-muted mt-1">{data.stage === 'ready' ? 'Noch keine passenden offenen Projekte.' : 'Erscheinen, sobald du im Pool bist.'}</p>}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Entwicklungsfelder aus dem Interview</p>
          {data.interview?.weaknesses.length
            ? <ul className="text-sm mt-1 space-y-1">{data.interview.weaknesses.map((w) => <li key={w}>— {w}</li>)}</ul>
            : <p className="text-sm text-muted mt-1">Erscheinen nach deinem ersten Fachinterview.</p>}
        </Card>
      </div>
      <Card className="p-4 mt-3">
        <p className="text-sm font-medium mb-1">Gefragte Skills, die dir noch fehlen</p>
        <p className="text-xs text-muted mb-2">Aus aktuell offenen Ausschreibungen in deinen Fachgebieten. Belegst du einen Skill in JunisWorld oder im Interview, steigt dein Match automatisch.</p>
        <SkillGapList gaps={data.skillGaps} />
      </Card>
    </Section>
  )
}
