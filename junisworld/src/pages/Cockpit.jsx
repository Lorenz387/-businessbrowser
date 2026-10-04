// Cockpit: alle Apps des aktuellen Arbeitsbereichs auf einen Blick — Kennzahlen und „Was jetzt zu tun ist“.
import { Link } from 'react-router-dom'
import { useApi, useDocumentTitle } from '../lib/hooks.js'
import { useWorkspace } from '../lib/workspace.jsx'
import { useJunis } from '../components/AskJunis.jsx'
import { Badge, Button, Card, EmptyState, ErrorState, Loading, PageHeader, Section, Stat } from '../components/ui.jsx'

const URGENCY = { high: ['bad', 'Dringend'], medium: ['warn', 'Bald'], low: ['neutral', 'Info'] }

export default function Cockpit() {
  useDocumentTitle('Cockpit')
  const { current } = useWorkspace()
  const openJunis = useJunis()
  const { data, error, loading, hardReload } = useApi('/cockpit')
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Das Cockpit" onRetry={hardReload} />
  const org = data.workspace.type === 'org'
  const hasData = data.sections.some((s) => s.stats.some((x) => x.value && x.value !== '0,00 €' && x.value !== '–'))
  return (
    <>
      <PageHeader title="Cockpit"
        subtitle={org ? `Alle freigegebenen Apps von ${data.workspace.name} — gefiltert auf deine Rechte.` : 'Deine Apps im privaten Bereich auf einen Blick.'}
        actions={<Button onClick={() => openJunis({ prompt: org ? 'Was ist in unserem Unternehmen gerade wichtig? Fasse Fristen, offene Aufgaben und Auffälligkeiten aus allen Apps zusammen und schlage die nächsten Schritte vor.' : 'Was steht in meinen Apps gerade an? Fasse Fristen und offene Punkte zusammen.', autoSend: true })}>Junis: Was ist wichtig?</Button>} />

      <Section title="Was jetzt zu tun ist">
        {data.tasks.length ? (
          <Card className="divide-y divide-line">
            {data.tasks.map((t, i) => (
              <Link key={`${t.link}-${i}`} to={t.link} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-subtle/60">
                <Badge tone={URGENCY[t.urgency][0]}>{URGENCY[t.urgency][1]}</Badge>
                <div className="flex-1 min-w-48">
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted">{t.app} · {t.detail}</p>
                </div>
                <span className="text-muted">→</span>
              </Link>
            ))}
          </Card>
        ) : <p className="text-sm text-muted">Nichts Dringendes. Fristen, Nachbestellungen, kritische Barrieren, Bewertungen und Bewerbungen erscheinen hier automatisch.</p>}
      </Section>

      {data.sections.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.sections.map((s) => (
            <Card key={s.app} className="p-5">
              <div className="flex justify-between gap-2 mb-4">
                <p className="font-semibold">{s.name}</p>
                <Link to={s.link} className="text-sm text-accent hover:underline">Öffnen →</Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 [&>*]:min-w-0 [overflow-wrap:anywhere]">{s.stats.map((x) => <Stat key={x.label} label={x.label} value={x.value} />)}</div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Keine Apps in diesem Bereich." text={org ? 'Für dieses Unternehmen ist noch keine App freigegeben. Admins schalten Apps unter Business → Apps & Sicherheit frei.' : 'Öffne eine App, um loszulegen.'} action={<Button to="/apps">Apps ansehen</Button>} />
      )}
      {!hasData && data.sections.length > 0 && <p className="text-sm text-muted mt-4">Noch leer — sobald in den Apps Daten erfasst sind, erscheinen sie hier{current.type === 'org' ? ' für alle Berechtigten im Unternehmen' : ''}.</p>}
      <p className="text-xs text-muted mt-6">Lernen, Ziele, Skills und PersonalAI sind nicht Teil des Cockpits — sie bleiben immer privat.</p>
    </>
  )
}
