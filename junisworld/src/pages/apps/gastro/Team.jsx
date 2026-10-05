import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { post, patch, del } from '../../../lib/api.js'
import { useApi, useAction } from '../../../lib/hooks.js'
import { useAuth } from '../../../lib/auth.jsx'
import { Badge, Button, Card, ErrorState, Field, Input, InlineError, Loading, Modal, Section, Select, useConfirm, useToast } from '../../../components/ui.jsx'
import { useGastro, ROLE_LABEL, EMP_ROLE, parseNum } from './shared.jsx'

const ROLE_INFO = {
  owner: 'Vollzugriff inkl. Löschen des Restaurants',
  manager: 'Alles außer Restaurant löschen und Inhaber/innen ernennen',
  kitchen: 'Rezepte, Lager, Speisekarte, KI-Kochstudio; Schichtplan lesen',
  service: 'Reservierungen, Tischplan, Gäste, Feedback; Speisekarte und Schichtplan lesen',
}

export default function Team() {
  const g = useGastro()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, loading, reload, hardReload } = useApi(`${g.base}/team`)
  const [inviting, setInviting] = useState(false)
  const [emp, setEmp] = useState(null)
  const [confirm, dialog] = useConfirm()
  const canWrite = g.permissions.team.write
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Das Team" onRetry={hardReload} />
  const setRole = (m, role) => patch(`${g.base}/team/members/${m.user_id}`, { role }).then(reload).catch((e) => toast(e.message, 'bad'))
  const removeMember = async (m) => {
    const self = m.user_id === user.id
    if (!(await confirm({ title: self ? 'Restaurant verlassen?' : `${m.name} entfernen?`, text: self ? 'Du verlierst den Zugriff auf dieses Restaurant.' : 'Die Person verliert den Zugriff.', confirmLabel: self ? 'Verlassen' : 'Entfernen', danger: true }))) return
    del(`${g.base}/team/members/${m.user_id}`).then(() => (self ? navigate('/apps/gastro') : reload())).catch((e) => toast(e.message, 'bad'))
  }
  const removeEmp = async (e) => {
    if (!(await confirm({ title: `${e.name} entfernen?`, text: 'Zugewiesene Schichten werden wieder offen.', confirmLabel: 'Entfernen', danger: true }))) return
    del(`${g.base}/employees/${e.id}`).then(reload)
  }
  return (
    <>
      {dialog}
      <Section title="Zugänge" description="Personen mit JunisWorld-Konto und Rolle in diesem Restaurant." action={canWrite && <Button size="sm" variant="primary" onClick={() => setInviting(true)}>Person einladen</Button>}>
        <Card className="divide-y divide-line">
          {data.members.map((m) => (
            <div key={m.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-40"><p className="text-sm font-medium">{m.name}{m.user_id === user.id ? ' (du)' : ''}</p><p className="text-xs text-muted">{m.email}</p></div>
              {canWrite && m.user_id !== user.id && (g.role === 'owner' || m.role !== 'owner') ? (
                <Select value={m.role} onChange={(e) => setRole(m, e.target.value)} className="h-8 w-44 text-sm" aria-label="Rolle">
                  {Object.entries(ROLE_LABEL).filter(([v]) => v !== 'owner' || g.role === 'owner').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              ) : <Badge>{ROLE_LABEL[m.role]}</Badge>}
              {(m.user_id === user.id || (canWrite && (g.role === 'owner' || m.role !== 'owner'))) && <button onClick={() => removeMember(m)} className="text-xs text-faint hover:text-bad">{m.user_id === user.id ? 'Verlassen' : 'Entfernen'}</button>}
            </div>
          ))}
          {data.invites.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3 bg-subtle/40">
              <div className="flex-1 min-w-40"><p className="text-sm">{i.email}</p><p className="text-xs text-muted">Einladung ausstehend · {ROLE_LABEL[i.role]}</p></div>
              {canWrite && <button onClick={() => del(`${g.base}/team/invites/${i.id}`).then(reload)} className="text-xs text-faint hover:text-bad">Zurückziehen</button>}
            </div>
          ))}
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {Object.entries(ROLE_INFO).map(([r, t]) => <p key={r} className="text-xs text-muted"><b className="text-ink-2">{ROLE_LABEL[r]}:</b> {t}</p>)}
        </div>
      </Section>

      <Section title="Mitarbeitende" description="Für die Schichtplanung — unabhängig davon, ob die Person ein Konto hat." action={canWrite && <Button size="sm" onClick={() => setEmp({})}>Mitarbeiter/in anlegen</Button>}>
        {data.employees.length ? (
          <Card className="divide-y divide-line">
            {data.employees.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-40"><p className="text-sm font-medium">{e.name}</p><p className="text-xs text-muted">{e.contact || 'Kein Kontakt'}{e.weekly_hours ? ` · ${e.weekly_hours} Std./Woche` : ''}</p></div>
                <Badge>{EMP_ROLE[e.role]}</Badge>
                {canWrite && <Button size="sm" variant="ghost" onClick={() => setEmp(e)}>Bearbeiten</Button>}
                {canWrite && <button onClick={() => removeEmp(e)} className="text-xs text-faint hover:text-bad">Entfernen</button>}
              </div>
            ))}
          </Card>
        ) : <p className="text-sm text-muted">Noch keine Mitarbeitenden angelegt.</p>}
      </Section>
      {inviting && <Invite onClose={() => setInviting(false)} onSaved={(r) => { setInviting(false); toast(r.registered ? 'Einladung gesendet — die Person sieht sie in GastroFlow.' : 'Einladung gespeichert. Sobald sich die Person mit dieser E-Mail bei JunisWorld registriert, kann sie annehmen.'); reload() }} />}
      {emp && <EmployeeForm initial={emp} onClose={() => setEmp(null)} onSaved={() => { setEmp(null); reload() }} />}
    </>
  )
}

function Invite({ onClose, onSaved }) {
  const g = useGastro()
  const [f, setF] = useState({ email: '', role: 'service' })
  const { pending, error, run } = useAction()
  return (
    <Modal open onClose={onClose} title="Person einladen"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!f.email.includes('@')} onClick={() => run(() => post(`${g.base}/team/invite`, f)).then(onSaved).catch(() => {})}>Einladen</Button></>}>
      <Field label="E-Mail">{(id) => <Input id={id} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@restaurant.de" />}</Field>
      <Field label="Rolle" hint={ROLE_INFO[f.role]}>{(id) => <Select id={id} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{Object.entries(ROLE_LABEL).filter(([v]) => v !== 'owner' || g.role === 'owner').map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
      <InlineError error={error} />
    </Modal>
  )
}

function EmployeeForm({ initial, onClose, onSaved }) {
  const g = useGastro()
  const [f, setF] = useState({ name: initial.name || '', role: initial.role || 'service', contact: initial.contact || '', weeklyHours: initial.weekly_hours ?? '' })
  const { pending, error, run } = useAction()
  const set = (x) => setF((y) => ({ ...y, ...x }))
  const body = () => ({ ...f, weeklyHours: parseNum(f.weeklyHours) })
  return (
    <Modal open onClose={onClose} title={initial.id ? 'Mitarbeiter/in bearbeiten' : 'Mitarbeiter/in anlegen'}
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!f.name.trim()} onClick={() => run(() => (initial.id ? patch(`${g.base}/employees/${initial.id}`, body()) : post(`${g.base}/employees`, body()))).then(onSaved).catch(() => {})}>Speichern</Button></>}>
      <Field label="Name">{(id) => <Input id={id} value={f.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bereich">{(id) => <Select id={id} value={f.role} onChange={(e) => set({ role: e.target.value })}>{Object.entries(EMP_ROLE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
        <Field label="Wochenstunden" optional>{(id) => <Input id={id} inputMode="decimal" value={f.weeklyHours} onChange={(e) => set({ weeklyHours: e.target.value })} />}</Field>
      </div>
      <Field label="Kontakt" optional>{(id) => <Input id={id} value={f.contact} onChange={(e) => set({ contact: e.target.value })} placeholder="E-Mail oder Telefon" />}</Field>
      <InlineError error={error} />
    </Modal>
  )
}
