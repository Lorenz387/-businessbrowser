import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../lib/hooks.js'
import { Card, PageHeader } from '../components/ui.jsx'

// Only apps that actually exist are listed. New apps are added here once they are built.
const APPS = [
  {
    id: 'personal-ai',
    name: 'PersonalAI',
    summary: 'Dein persönlicher KI-Agent: beantwortet Fragen, schreibt Code, führt Befehle aus und erledigt Aufgaben in mehreren Schritten. Anbieter, Verhalten und Rechte sind einstellbar.',
    to: '/apps/personal-ai',
  },
]

export default function Apps() {
  useDocumentTitle('Apps')
  return (
    <>
      <PageHeader title="Apps" subtitle="Software innerhalb von JunisWorld." />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {APPS.map((a) => (
          <Link key={a.id} to={a.to}>
            <Card className="p-5 h-full hover:border-line-strong">
              <p className="font-semibold">{a.name}</p>
              <p className="text-sm text-muted mt-1.5">{a.summary}</p>
            </Card>
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted mt-6">Weitere Apps werden hier erscheinen, sobald sie gebaut sind.</p>
    </>
  )
}
