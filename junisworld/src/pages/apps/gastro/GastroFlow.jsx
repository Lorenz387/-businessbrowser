// GastroFlow — Restaurant-Betriebssystem als App in JunisWorld.
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { post } from '../../../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../../../lib/hooks.js'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Tabs, Textarea, useToast } from '../../../components/ui.jsx'
import { GastroCtx, ROLE_LABEL } from './shared.jsx'
import Dashboard from './Dashboard.jsx'
import Reservations from './Reservations.jsx'
import Guests from './Guests.jsx'
import MenuPage from './Menu.jsx'
import Kitchen from './Kitchen.jsx'
import Shifts from './Shifts.jsx'
import Revenue from './Revenue.jsx'
import Feedback from './Feedback.jsx'
import Studio from './Studio.jsx'
import Team from './Team.jsx'
import Settings from './Settings.jsx'

export function GastroHome() {
  useDocumentTitle('GastroFlow')
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, loading, reload, hardReload } = useApi('/apps/gastro')
  const [creating, setCreating] = useState(false)
  const action = useAction()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="GastroFlow" onRetry={hardReload} />
  const answer = (inv, act) => action.run(() => post(`/apps/gastro/invites/${inv.id}/${act}`)).then((r) => {
    if (act === 'accept') navigate(`/apps/gastro/${r.restaurantId}`)
    else { toast('Einladung abgelehnt.'); reload() }
  }).catch(() => {})
  return (
    <>
      <PageHeader back={{ to: '/apps', label: 'Apps' }} title="GastroFlow"
        subtitle="Restaurant-Betriebssystem: Reservierungen & Tischplan, Gäste, Speisekarte mit Wareneinsatz, Lager, Schichten, Kasse und KI-Kochstudio."
        actions={<Button variant="primary" onClick={() => setCreating(true)}>Restaurant anlegen</Button>} />
      {data.invites.length > 0 && (
        <Card className="divide-y divide-line mb-6">
          {data.invites.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="text-sm flex-1">Einladung ins Team von <b>{i.name}</b> · Rolle: {ROLE_LABEL[i.role]}</span>
              <Button size="sm" variant="primary" loading={action.pending} onClick={() => answer(i, 'accept')}>Annehmen</Button>
              <Button size="sm" variant="ghost" onClick={() => answer(i, 'decline')}>Ablehnen</Button>
            </div>
          ))}
        </Card>
      )}
      <InlineError error={action.error} />
      {data.restaurants.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.restaurants.map((r) => (
            <Link key={r.id} to={`/apps/gastro/${r.id}`}>
              <Card className="p-5 h-full hover:border-line-strong">
                <div className="flex justify-between gap-2"><p className="font-semibold">{r.name}</p><Badge>{ROLE_LABEL[r.role]}</Badge></div>
                <p className="text-xs text-muted mt-0.5">{r.address || 'Ohne Adresse'}</p>
                {r.concept && <p className="text-sm text-ink-2 mt-2 line-clamp-2">{r.concept}</p>}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Noch kein Restaurant angelegt." text="Lege deinen Betrieb an. Alles startet leer — es werden keine Beispieldaten erzeugt. Teammitglieder lädst du danach mit Rollen (Betriebsleitung, Küche, Service) ein."
          action={<Button variant="primary" onClick={() => setCreating(true)}>Restaurant anlegen</Button>} />
      )}
      {creating && <CreateRestaurant onClose={() => setCreating(false)} onCreated={(id) => navigate(`/apps/gastro/${id}`)} />}
    </>
  )
}

function CreateRestaurant({ onClose, onCreated }) {
  const [f, setF] = useState({ name: '', address: '', concept: '' })
  const { pending, error, run } = useAction()
  return (
    <Modal open onClose={onClose} title="Restaurant anlegen"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!f.name.trim()} onClick={() => run(() => post('/apps/gastro', f)).then((r) => onCreated(r.id)).catch(() => {})}>Anlegen</Button></>}>
      <Field label="Name">{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="z. B. Gasthaus Zur Linde" />}</Field>
      <Field label="Standort" optional>{(id) => <Input id={id} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Stadt oder Adresse" />}</Field>
      <Field label="Küchenkonzept" optional hint="Hilft dem KI-Kochstudio, passende Vorschläge zu machen.">{(id) => <Textarea id={id} value={f.concept} onChange={(e) => setF({ ...f, concept: e.target.value })} placeholder="z. B. regionale Küche, 45 Plätze, Mittagstisch und à la carte am Abend" />}</Field>
      <InlineError error={error} />
    </Modal>
  )
}

const SECTIONS = [
  ['dashboard', 'Dashboard', null],
  ['reservations', 'Reservierungen & Tischplan', 'floor'],
  ['guests', 'Gäste', 'floor'],
  ['menu', 'Speisekarte', null],
  ['kitchen', 'Rezepte & Lager', 'kitchen'],
  ['shifts', 'Personal & Schichten', 'shifts'],
  ['revenue', 'Kasse & Umsatz', 'revenue'],
  ['feedback', 'Feedback', 'floor'],
  ['studio', 'KI-Kochstudio', 'kitchenWrite'],
  ['team', 'Team', null],
  ['settings', 'Einstellungen', 'settings'],
]
const PAGES = { dashboard: Dashboard, reservations: Reservations, guests: Guests, menu: MenuPage, kitchen: Kitchen, shifts: Shifts, revenue: Revenue, feedback: Feedback, studio: Studio, team: Team, settings: Settings }

export function GastroWorkspace() {
  const { rid, section = 'dashboard' } = useParams()
  const navigate = useNavigate()
  const { data, error, loading, reload, hardReload } = useApi(`/apps/gastro/r/${rid}`, [rid])
  useDocumentTitle(data ? `${data.restaurant.name} · GastroFlow` : 'GastroFlow')
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Das Restaurant" onRetry={hardReload} />
  const p = data.permissions
  const allowed = (need) => !need || (need === 'kitchenWrite' ? p.kitchen.write : p[need].read)
  const visible = SECTIONS.filter(([, , need]) => allowed(need))
  if (!PAGES[section] || !visible.some(([id]) => id === section)) return <Navigate to={`/apps/gastro/${rid}`} replace />
  const Page = PAGES[section]
  const ctx = { ...data, rid, base: `/apps/gastro/r/${rid}`, reloadInfo: reload, go: (s) => navigate(`/apps/gastro/${rid}/${s}`) }
  return (
    <GastroCtx.Provider value={ctx}>
      <PageHeader back={{ to: '/apps/gastro', label: 'GastroFlow' }} title={data.restaurant.name}
        subtitle={`${data.restaurant.address ? `${data.restaurant.address} · ` : ''}Deine Rolle: ${ROLE_LABEL[data.role]}`} />
      <Tabs value={section} onChange={(s) => navigate(`/apps/gastro/${rid}${s === 'dashboard' ? '' : `/${s}`}`)} tabs={visible.map(([value, label]) => ({ value, label }))} />
      <Page key={section} />
    </GastroCtx.Provider>
  )
}
