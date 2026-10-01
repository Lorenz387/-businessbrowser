import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../lib/hooks.js'
import { Badge, Card, PageHeader, Section } from '../components/ui.jsx'

// Only apps that are built are listed as available. Planned apps are shown separately and clearly marked.
const APPS = [
  {
    id: 'personal-ai',
    name: 'PersonalAI',
    audience: 'Alle',
    summary: 'Persönlicher KI-Agent: beantwortet Fragen, schreibt Code, führt Befehle aus und erledigt Aufgaben in mehreren Schritten. Anbieter, Verhalten und Rechte einstellbar.',
    to: '/apps/personal-ai',
  },
  {
    id: 'accessibility',
    name: 'Barrierefreiheit-Scanner',
    audience: 'Webagenturen & Unternehmen',
    summary: 'Scannt Websites regelmäßig auf Barrieren (WCAG), zeigt jeden Fund mit fertigem Korrektur-Code und meldet neue kritische Probleme.',
    to: '/apps/accessibility',
  },
  {
    id: 'contracts',
    name: 'Fristen- & Kündigungsmanager',
    audience: 'Geschäftsführung & Finanzen',
    summary: 'Verträge als PDF hochladen, Laufzeiten und Kündigungsfristen per KI auslesen lassen und rechtzeitig vor der Verlängerung erinnert werden (in der App, per Slack, im Kalender).',
    to: '/apps/contracts',
  },
]

const PLANNED = [
  ['Standgeld-Management', 'Speditionen', 'Wartezeiten an Laderampen per Standort minutengenau belegen und abrechnen.'],
  ['Werkstatt-Betriebssystem', 'Kfz-Werkstätten & Lackierereien', 'Fahrzeugannahme per Tablet, Ersatzteile, Aufträge und Abrechnung.'],
  ['Makler-CRM', 'Immobilienmakler', 'Objekte, Interessenten, Besichtigungen und Exposés.'],
  ['Agentur-Reporting', 'Marketing- & SEO-Agenturen', 'White-Label-Kundenportal mit Performance-Daten.'],
  ['Cross-Border-Steuerhelfer', 'E-Commerce-Händler', 'Umsatzsteuer internationaler Verkäufe aufbereiten.'],
  ['Recht', 'Rechtswissenschaften', 'Umfang wird noch festgelegt.'],
]

export default function Apps() {
  useDocumentTitle('Apps')
  return (
    <>
      <PageHeader title="Apps" subtitle="Das JunisWorld-Ökosystem: KI-gestützte Software für Menschen und Unternehmen." />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {APPS.map((a) => (
          <Link key={a.id} to={a.to}>
            <Card className="p-5 h-full hover:border-line-strong">
              <p className="font-semibold">{a.name}</p>
              <p className="text-xs text-muted mt-0.5">{a.audience}</p>
              <p className="text-sm text-ink-2 mt-2">{a.summary}</p>
            </Card>
          </Link>
        ))}
      </div>
      <Section title="In Planung" className="mt-10" description="Diese Apps sind noch nicht verfügbar.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLANNED.map(([name, audience, summary]) => (
            <Card key={name} className="p-5 bg-subtle/50">
              <div className="flex items-center justify-between gap-2"><p className="font-medium text-ink-2">{name}</p><Badge>Geplant</Badge></div>
              <p className="text-xs text-muted mt-0.5">{audience}</p>
              <p className="text-sm text-muted mt-2">{summary}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  )
}
