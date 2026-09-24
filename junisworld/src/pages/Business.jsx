import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { post, patch, del } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { formatDate, euro } from '../lib/format.js'
import { useAuth, PLAN_NAMES } from '../lib/auth.jsx'
import { LevelBars } from '../components/charts.jsx'
import Markdown from '../components/Markdown.jsx'
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Section, Select, Segmented, Stat, Tabs, Textarea,
  useConfirm, useToast,
} from '../components/ui.jsx'

const KIND = { team: 'Team', business: 'Unternehmen', family: 'Familie' }

export function Business() {
  useDocumentTitle('Business')
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const { data, error, loading, reload, hardReload } = useApi('/orgs')
  const [creating, setCreating] = useState(false)
  const [f, setF] = useState({ name: '', kind: 'team' })
  const action = useAction()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Deine Organisationen" onRetry={hardReload} />
  const create = () => action.run(async () => {
    const r = await post('/orgs', f)
    navigate(`/business/${r.id}`)
  }).catch(() => {})
  return (
    <>
      <PageHeader title="Business" subtitle="Teams, Unternehmen und Familien. Persönliche Lerninhalte bleiben privat — Organisationen sehen nur, was Mitglieder ausdrücklich teilen."
        actions={<Button variant="primary" onClick={() => setCreating(true)}>Organisation erstellen</Button>} />
      {data.invites.length > 0 && (
        <Section title="Einladungen">
          <Card className="divide-y divide-line">
            {data.invites.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="text-sm flex-1"><b>{i.name}</b> <span className="text-muted">({KIND[i.kind]}) · Rolle: {data.roleLabels[i.role]}</span></span>
                <Button size="sm" variant="primary" onClick={() => post(`/invites/${i.id}/accept`).then(async (r) => { await refresh(); navigate(`/business/${r.orgId}`) })}>Annehmen</Button>
                <Button size="sm" variant="ghost" onClick={() => post(`/invites/${i.id}/decline`).then(reload)}>Ablehnen</Button>
              </div>
            ))}
          </Card>
        </Section>
      )}
      {data.orgs.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.orgs.map((o) => (
            <Link key={o.id} to={`/business/${o.id}`}>
              <Card className="p-5 hover:border-line-strong">
                <div className="flex justify-between gap-2"><p className="font-medium">{o.name}</p><Badge tone={PLAN_NAMES[o.plan] ? 'accent' : 'warn'}>{PLAN_NAMES[o.plan] ?? 'Kein aktiver Tarif'}</Badge></div>
                <p className="text-sm text-muted mt-1">{KIND[o.kind]} · {o.members} Mitglied(er) · deine Rolle: {data.roleLabels[o.role]}</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Du bist noch in keiner Organisation." text="Erstelle ein Team, ein Unternehmen oder eine Familie — oder nimm eine Einladung an." action={<Button variant="primary" onClick={() => setCreating(true)}>Organisation erstellen</Button>} />
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title="Organisation erstellen"
        footer={<><Button variant="ghost" onClick={() => setCreating(false)}>Abbrechen</Button><Button variant="primary" onClick={create} loading={action.pending} disabled={!f.name.trim()}>Erstellen</Button></>}>
        <Field label="Name">{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        <Field label="Art">
          <Segmented value={f.kind} onChange={(kind) => setF({ ...f, kind })} options={[{ value: 'team', label: 'Team' }, { value: 'business', label: 'Unternehmen' }, { value: 'family', label: 'Familie' }]} />
        </Field>
        <p className="text-xs text-muted">Die Organisation wird kostenlos angelegt. Tarif-Funktionen (Teams, Business, Family) werden erst nach einer ausdrücklich bestätigten Buchung aktiv.</p>
        <InlineError error={action.error} />
      </Modal>
    </>
  )
}

export function OrgView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const { user, refresh } = useAuth()
  const [team, setTeam] = useState('')
  const { data, error, loading, reload, hardReload } = useApi(`/orgs/${id}${team ? `?team=${team}` : ''}`, [team])
  useDocumentTitle(data?.name)
  const [tab, setTab] = useState('overview')
  const [confirm, dialog] = useConfirm()
  useEffect(() => { if (params.get('checkout') === 'success') { toast('Zahlung abgeschlossen. Der Tarif wird aktiv, sobald Stripe die Buchung bestätigt.'); refresh() } }, [params, toast, refresh])
  if (loading && !data) return <Loading />
  if (error) return <ErrorState error={error} what="Die Organisation" onRetry={hardReload} />
  const isAdmin = ['owner', 'admin'].includes(data.role)
  const isManager = isAdmin || data.role === 'manager'
  const family = data.kind === 'family'
  const tabs = [
    { value: 'overview', label: 'Übersicht' },
    { value: 'members', label: 'Mitglieder', count: data.members.length },
    ...(!family ? [{ value: 'programs', label: 'Lernprogramme', count: data.programs.length }, { value: 'knowledge', label: 'Wissen', count: data.knowledge.length }] : []),
    ...(isAdmin && !family ? [{ value: 'teams', label: 'Teams' }] : []),
    ...(isAdmin ? [{ value: 'settings', label: 'Verwaltung' }] : []),
  ]
  const leave = async () => {
    if (!(await confirm({ title: 'Organisation verlassen?', text: 'Du verlierst den Zugang zu Programmen und Wissen dieser Organisation. Deine persönlichen Daten bleiben erhalten.', confirmLabel: 'Verlassen', danger: true }))) return
    await del(`/orgs/${id}/members/${user.id}`)
    await refresh()
    navigate('/business')
  }

  return (
    <div className="max-w-5xl">
      {dialog}
      <PageHeader back={{ to: '/business', label: 'Business' }} title={data.name}
        subtitle={`${KIND[data.kind]} · ${data.planActive ? `Tarif ${PLAN_NAMES[data.plan]} · ${data.seats} Plätze` : 'Kein aktiver Tarif'} · deine Rolle: ${data.roleLabels[data.role]}`}
        actions={data.role !== 'owner' && <Button variant="ghost" onClick={leave}>Verlassen</Button>} />
      {!data.planActive && <PlanNotice org={data} />}
      <Tabs value={tab} onChange={setTab} tabs={tabs} />

      {tab === 'overview' && (
        family ? (
          <Card className="p-5 text-sm text-ink-2">
            In Familien bleiben alle persönlichen Inhalte strikt getrennt. Kein Mitglied sieht Ziele, Skills, Projekte oder Gespräche eines anderen Mitglieds. Die Familie teilt sich nur den Tarif.
          </Card>
        ) : !isManager ? (
          <Card className="p-5 text-sm text-ink-2">
            Als Team Member siehst du Lernprogramme und Organisationswissen. Ob Manager deinen gemessenen Skill-Stand sehen dürfen, entscheidest du in den <Link to="/settings" className="text-accent hover:underline">Einstellungen</Link>.
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <p className="text-sm text-muted">{data.analytics.sharingMembers} von {data.analytics.totalMembers} Mitgliedern teilen ihren Skill-Stand.</p>
              {data.teams.length > 0 && (
                <Select value={team} onChange={(e) => setTeam(e.target.value)} className="w-auto" aria-label="Team filtern">
                  <option value="">Gesamte Organisation</option>
                  {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              )}
            </div>
            {data.analytics.sharingMembers === 0 ? (
              <EmptyState title="Noch keine geteilten Skill-Daten." text="Mitglieder können in ihren Einstellungen zustimmen, ihren gemessenen Skill-Stand mit der Organisation zu teilen. Ohne Zustimmung werden keine Daten angezeigt." />
            ) : (
              <>
                <Section title="Team Skills nach Bereich"><Card className="p-5"><LevelBars rows={data.analytics.categories} labelKey="category" meta={(r) => `${r.people} Pers.`} /></Card></Section>
                <Section title="Skills im Detail">
                  <Card className="p-5"><LevelBars rows={data.analytics.skills.slice(0, 20)} meta={(r) => `${r.people} Pers.${r.verified ? ` · ${r.verified} verif.` : ''}`} /></Card>
                </Section>
                {data.analytics.programGaps.length > 0 && (
                  <Section title="Skill Gap der Lernprogramme" description="Durchschnittlicher gemessener Stand der teilenden Mitglieder, Ziel: 60 %.">
                    {data.analytics.programGaps.map((p) => (
                      <Card key={p.id} className="p-5 mb-3">
                        <p className="font-medium mb-3">{p.title}</p>
                        <LevelBars rows={p.skills} meta={(r) => `${r.people} Pers.`} />
                      </Card>
                    ))}
                  </Section>
                )}
                <Section title="Mitglieder (geteilt)">
                  <Card className="divide-y divide-line">
                    {data.analytics.members.map((m) => (
                      <details key={m.id} className="px-4 py-3">
                        <summary className="text-sm cursor-pointer">{m.name} <span className="text-muted">· {m.skills.length} gemessene Skills</span></summary>
                        <div className="mt-3"><LevelBars rows={m.skills.map((s) => ({ name: s.name, avg: s.level }))} /></div>
                      </details>
                    ))}
                  </Card>
                </Section>
              </>
            )}
          </>
        )
      )}

      {tab === 'members' && <Members org={data} isAdmin={isAdmin} reload={reload} />}
      {tab === 'programs' && <Programs org={data} isManager={isManager} reload={reload} />}
      {tab === 'knowledge' && <OrgKnowledge org={data} isManager={isManager} reload={reload} />}
      {tab === 'teams' && <Teams org={data} reload={reload} />}
      {tab === 'settings' && <OrgSettings org={data} reload={reload} />}
    </div>
  )
}

function PlanNotice({ org }) {
  const [seats, setSeats] = useState(org.kind === 'business' ? 10 : 5)
  const [cycle, setCycle] = useState('monthly')
  const plans = useApi('/plans')
  const action = useAction()
  const planId = org.kind === 'family' ? 'family' : org.kind === 'business' ? 'business' : 'teams'
  const plan = plans.data?.plans.find((p) => p.id === planId)
  if (org.role !== 'owner') return <Card className="p-4 mb-6 text-sm text-muted">Für diese Organisation ist noch kein Tarif aktiv. Nur der Owner kann ihn buchen.</Card>
  if (!plan) return null
  const price = cycle === 'yearly' ? plan.yearly : plan.monthly
  const total = plan.perSeat ? price * seats : price
  return (
    <Card className="p-5 mb-6">
      <p className="font-medium">Tarif {plan.name} aktivieren</p>
      <p className="text-sm text-muted mt-1">{plan.summary}</p>
      <div className="flex flex-wrap items-end gap-4 mt-4">
        {plan.perSeat && <Field label="Plätze">{(fid) => <Input id={fid} type="number" min={org.kind === 'business' ? 10 : 2} max={5000} value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="w-28" />}</Field>}
        <div className="mb-4"><Segmented value={cycle} onChange={setCycle} options={[{ value: 'monthly', label: 'Monatlich' }, { value: 'yearly', label: 'Jährlich' }]} /></div>
        <div className="mb-4 text-sm">Summe: <b>{euro(total)}</b> {cycle === 'yearly' ? 'pro Jahr' : 'pro Monat'}{plan.perSeat && <span className="text-muted"> ({euro(price)} × {seats})</span>}</div>
        <Button className="mb-4" variant="primary" loading={action.pending} onClick={() => action.run(async () => { const r = await post(`/orgs/${org.id}/checkout`, { plan: planId, seats, cycle }); window.location.href = r.url }).catch(() => {})}>Weiter zur kostenpflichtigen Buchung</Button>
      </div>
      <p className="text-xs text-muted">Kosten entstehen erst nach Bestätigung beim Zahlungsanbieter Stripe.</p>
      <InlineError error={action.error} />
    </Card>
  )
}

function Members({ org, isAdmin, reload }) {
  const [f, setF] = useState({ email: '', role: 'member' })
  const action = useAction()
  const toast = useToast()
  const invite = (e) => {
    e.preventDefault()
    action.run(() => post(`/orgs/${org.id}/invites`, f)).then((r) => {
      toast(r.registered ? 'Einladung erstellt. Die Person sieht sie in JunisWorld unter Business.' : 'Einladung erstellt. Sobald sich die Person mit dieser E-Mail registriert, sieht sie die Einladung unter Business.')
      setF({ ...f, email: '' })
      reload()
    }).catch(() => {})
  }
  return (
    <>
      {isAdmin && (
        <Card className="p-5 mb-6">
          <form onSubmit={invite} className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-56"><Field label="E-Mail einladen">{(id) => <Input id={id} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field></div>
            {org.kind !== 'family' && (
              <Field label="Rolle">{(id) => <Select id={id} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className="w-40"><option value="member">Team Member</option><option value="manager">Manager</option>{org.role === 'owner' && <option value="admin">Admin</option>}</Select>}</Field>
            )}
            <Button type="submit" className="mb-4" loading={action.pending} disabled={!f.email}>Einladen</Button>
          </form>
          <p className="text-xs text-muted">JunisWorld verschickt keine E-Mails. Informiere die eingeladene Person selbst.</p>
          <InlineError error={action.error} />
        </Card>
      )}
      <Card className="divide-y divide-line">
        {org.members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{m.name}</p>
              <p className="text-xs text-muted">{m.email ? `${m.email} · ` : ''}seit {formatDate(m.joined_at)}{m.share_with_org ? ' · teilt Skill-Stand' : ''}</p>
            </div>
            {isAdmin && m.role !== 'owner' && org.kind !== 'family' ? (
              <>
                <Select value={m.role} onChange={(e) => patch(`/orgs/${org.id}/members/${m.id}`, { role: e.target.value }).then(reload).catch((err) => toast(err.message, 'bad'))} className="h-8 w-auto text-sm" aria-label="Rolle">
                  <option value="member">Team Member</option><option value="manager">Manager</option><option value="admin">Admin</option>
                </Select>
                {org.teams.length > 0 && (
                  <Select value={m.team_id ?? ''} onChange={(e) => patch(`/orgs/${org.id}/members/${m.id}`, { teamId: e.target.value || null }).then(reload)} className="h-8 w-auto text-sm" aria-label="Team">
                    <option value="">Kein Team</option>{org.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                )}
                <button className="text-xs text-faint hover:text-bad" onClick={() => del(`/orgs/${org.id}/members/${m.id}`).then(reload)}>Entfernen</button>
              </>
            ) : <Badge>{org.roleLabels[m.role]}</Badge>}
          </div>
        ))}
      </Card>
      {org.invites.length > 0 && (
        <Section title="Offene Einladungen" className="mt-8">
          <Card className="divide-y divide-line">
            {org.invites.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex-1">{i.email} <span className="text-muted">· {org.roleLabels[i.role]}</span></span>
                <button className="text-xs text-faint hover:text-bad" onClick={() => del(`/orgs/${org.id}/invites/${i.id}`).then(reload)}>Zurückziehen</button>
              </div>
            ))}
          </Card>
        </Section>
      )}
    </>
  )
}

function Programs({ org, isManager, reload }) {
  const navigate = useNavigate()
  const catalog = useApi('/catalog')
  const [creating, setCreating] = useState(false)
  const [f, setF] = useState({ title: '', description: '', skillIds: [], teamId: '' })
  const action = useAction()
  const save = () => action.run(() => post(`/orgs/${org.id}/programs`, { ...f, teamId: f.teamId || null })).then(() => { setCreating(false); setF({ title: '', description: '', skillIds: [], teamId: '' }); reload() }).catch(() => {})
  return (
    <>
      {isManager && <Button variant="primary" className="mb-4" onClick={() => setCreating(true)}>Lernprogramm erstellen</Button>}
      {org.programs.length ? org.programs.map((p) => (
        <Card key={p.id} className="p-5 mb-3">
          <div className="flex flex-wrap justify-between gap-2">
            <p className="font-medium">{p.title}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={() => action.run(() => post(`/orgs/${org.id}/programs/${p.id}/join`)).then((r) => navigate(`/goals/${r.goalId}`)).catch(() => {})}>Als persönliches Ziel übernehmen</Button>
              {isManager && <Button size="sm" variant="ghost" onClick={() => del(`/orgs/${org.id}/programs/${p.id}`).then(reload)}>Löschen</Button>}
            </div>
          </div>
          {p.description && <p className="text-sm text-muted mt-1">{p.description}</p>}
          <p className="text-xs text-faint mt-2">{p.skills.map((s) => s.name).join(' · ')}{p.team_id ? ` · Team: ${org.teams.find((t) => t.id === p.team_id)?.name ?? ''}` : ''}</p>
        </Card>
      )) : <EmptyState title="Noch keine Lernprogramme." text={isManager ? 'Definiere Programme aus Skills. Mitglieder übernehmen sie als persönliches Ziel mit eigenem Lernweg.' : 'Deine Organisation hat noch keine Programme veröffentlicht.'} />}
      <InlineError error={action.error} />
      <Modal open={creating} onClose={() => setCreating(false)} title="Lernprogramm erstellen" width="max-w-2xl"
        footer={<><Button variant="ghost" onClick={() => setCreating(false)}>Abbrechen</Button><Button variant="primary" onClick={save} loading={action.pending} disabled={!f.title.trim() || !f.skillIds.length}>Erstellen</Button></>}>
        <Field label="Titel">{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="z. B. Datenkompetenz für das Vertriebsteam" />}</Field>
        <Field label="Beschreibung" optional>{(id) => <Textarea id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field>
        {org.teams.length > 0 && <Field label="Für Team" optional>{(id) => <Select id={id} value={f.teamId} onChange={(e) => setF({ ...f, teamId: e.target.value })}><option value="">Alle</option>{org.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>}</Field>}
        {catalog.data && (
          <Field label="Skills">
            <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
              {catalog.data.skills.filter((s) => !s.custom).map((s) => (
                <button key={s.id} type="button" onClick={() => setF({ ...f, skillIds: f.skillIds.includes(s.id) ? f.skillIds.filter((x) => x !== s.id) : [...f.skillIds, s.id] })}
                  className={`px-2.5 h-7 rounded-md border text-[12.5px] ${f.skillIds.includes(s.id) ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-2'}`}>{s.name}</button>
              ))}
            </div>
          </Field>
        )}
        <InlineError error={action.error} />
      </Modal>
    </>
  )
}

function OrgKnowledge({ org, isManager, reload }) {
  const [f, setF] = useState({ title: '', content: '' })
  const [open, setOpen] = useState(false)
  const action = useAction()
  return (
    <>
      {isManager && <Button variant="primary" className="mb-4" onClick={() => setOpen(true)}>Eintrag erstellen</Button>}
      {org.knowledge.length ? org.knowledge.map((k) => (
        <Card key={k.id} className="p-5 mb-3">
          <div className="flex justify-between gap-2"><p className="font-medium">{k.title}</p>{isManager && <button className="text-xs text-faint hover:text-bad" onClick={() => del(`/orgs/${org.id}/knowledge/${k.id}`).then(reload)}>Löschen</button>}</div>
          <p className="text-xs text-muted mb-3">{k.author ?? 'Ehemaliges Mitglied'} · {formatDate(k.created_at)}</p>
          <Markdown>{k.content}</Markdown>
        </Card>
      )) : <EmptyState title="Noch kein Organisationswissen." text="Prozesse, Leitfäden und internes Wissen an einem Ort — für alle Mitglieder lesbar." />}
      <Modal open={open} onClose={() => setOpen(false)} title="Wissenseintrag" width="max-w-2xl"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button><Button variant="primary" loading={action.pending} disabled={!f.title.trim() || !f.content.trim()} onClick={() => action.run(() => post(`/orgs/${org.id}/knowledge`, f)).then(() => { setOpen(false); setF({ title: '', content: '' }); reload() }).catch(() => {})}>Speichern</Button></>}>
        <Field label="Titel">{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field>
        <Field label="Inhalt" hint="Markdown wird unterstützt.">{(id) => <Textarea id={id} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} className="min-h-56" />}</Field>
        <InlineError error={action.error} />
      </Modal>
    </>
  )
}

function Teams({ org, reload }) {
  const [name, setName] = useState('')
  return (
    <>
      <form className="flex gap-2 mb-4 max-w-md" onSubmit={(e) => { e.preventDefault(); post(`/orgs/${org.id}/teams`, { name }).then(() => { setName(''); reload() }) }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Teamname" aria-label="Teamname" />
        <Button type="submit" disabled={!name.trim()}>Team anlegen</Button>
      </form>
      {org.teams.length ? (
        <Card className="divide-y divide-line">
          {org.teams.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="flex-1">{t.name} <span className="text-muted">· {org.members.filter((m) => m.team_id === t.id).length} Mitglieder</span></span>
              <button className="text-xs text-faint hover:text-bad" onClick={() => del(`/orgs/${org.id}/teams/${t.id}`).then(reload)}>Löschen</button>
            </div>
          ))}
        </Card>
      ) : <p className="text-sm text-muted">Noch keine Teams. Teams erlauben gefilterte Skill-Übersichten und teambezogene Programme.</p>}
    </>
  )
}

function OrgSettings({ org, reload }) {
  const navigate = useNavigate()
  const [name, setName] = useState(org.name)
  const action = useAction()
  const [confirm, dialog] = useConfirm()
  const remove = async () => {
    if (!(await confirm({ title: 'Organisation löschen?', text: 'Programme, Teams und Organisationswissen werden gelöscht. Persönliche Daten der Mitglieder bleiben unberührt.', confirmLabel: 'Löschen', danger: true }))) return
    action.run(() => del(`/orgs/${org.id}`)).then(() => navigate('/business')).catch(() => {})
  }
  return (
    <div className="max-w-md">
      {dialog}
      <Field label="Name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
      <Button onClick={() => action.run(() => patch(`/orgs/${org.id}`, { name })).then(reload).catch(() => {})} loading={action.pending}>Speichern</Button>
      <div className="grid grid-cols-2 gap-6 my-8">
        <Stat label="Plätze" value={org.seats} />
        <Stat label="Belegt" value={org.members.length + org.invites.length} hint="inkl. offener Einladungen" />
      </div>
      {org.role === 'owner' && <Button variant="danger" onClick={remove}>Organisation löschen</Button>}
      <InlineError error={action.error} />
    </div>
  )
}
