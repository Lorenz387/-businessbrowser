import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { post, patch, del } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { formatDate } from '../lib/format.js'
import { useAuth } from '../lib/auth.jsx'
import Markdown from '../components/Markdown.jsx'
import {
  Badge, Button, Card, Checkbox, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Section, Select, Textarea, useConfirm, useToast,
} from '../components/ui.jsx'

const ITEM_TYPES = { path: 'Lernpfad', course: 'Kurs', mission: 'Mission', skill_pack: 'Skill Pack', project: 'Projekt', test: 'Test' }
const MODULE_TYPES = { lesson: 'Lektion', task: 'Aufgabe', project: 'Projekt', test: 'Test' }

export function Creator() {
  useDocumentTitle('Creator')
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, error, loading, hardReload } = useApi(user.isCreator ? '/creator/items' : null)
  const [creating, setCreating] = useState(false)
  const [f, setF] = useState({ type: 'path', title: '', summary: '' })
  const action = useAction()
  if (!user.isCreator) {
    return (
      <>
        <PageHeader title="Creator" />
        <EmptyState title="Der Creator-Modus ist nicht aktiv." text="Als Creator veröffentlichst du Lernpfade, Missions, Skill Packs und Tests im Marketplace. Junis hilft beim Strukturieren." action={<Button variant="primary" to="/settings">In den Einstellungen aktivieren</Button>} />
      </>
    )
  }
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Deine Inhalte" onRetry={hardReload} />
  return (
    <>
      <PageHeader title="Creator" subtitle="Teile dein Wissen als strukturierte Lernangebote. Du bleibst für fachliche Richtigkeit verantwortlich." actions={<Button variant="primary" onClick={() => setCreating(true)}>Neuer Inhalt</Button>} />
      {data.items.length ? (
        <Card className="divide-y divide-line">
          {data.items.map((i) => (
            <Link key={i.id} to={`/creator/${i.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-subtle/60">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{i.title}</p>
                <p className="text-xs text-muted">{ITEM_TYPES[i.type]} · {i.modules.length} Module · {i.enrollments} Teilnehmende</p>
              </div>
              <Badge tone={i.status === 'published' ? 'ok' : 'neutral'}>{i.status === 'published' ? 'Veröffentlicht' : 'Entwurf'}</Badge>
            </Link>
          ))}
        </Card>
      ) : <EmptyState title="Noch keine Inhalte." text="Erstelle deinen ersten Lernpfad, eine Mission oder ein Skill Pack." action={<Button variant="primary" onClick={() => setCreating(true)}>Neuer Inhalt</Button>} />}
      <Modal open={creating} onClose={() => setCreating(false)} title="Neuer Inhalt"
        footer={<><Button variant="ghost" onClick={() => setCreating(false)}>Abbrechen</Button><Button variant="primary" loading={action.pending} disabled={!f.title.trim()} onClick={() => action.run(() => post('/creator/items', f)).then((r) => navigate(`/creator/${r.id}`)).catch(() => {})}>Erstellen</Button></>}>
        <Field label="Art">{(id) => <Select id={id} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{Object.entries(ITEM_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
        <Field label="Titel">{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field>
        <Field label="Beschreibung" optional>{(id) => <Textarea id={id} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />}</Field>
        <InlineError error={action.error} />
      </Modal>
    </>
  )
}

export function CreatorItemEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { aiAvailable } = useAuth()
  const { data, error, loading, reload, hardReload } = useApi(`/creator/items/${id}`)
  const catalog = useApi('/catalog')
  useDocumentTitle(data?.title)
  const [f, setF] = useState(null)
  const [notes, setNotes] = useState('')
  const [publishOpen, setPublishOpen] = useState(false)
  const [confirmOwn, setConfirmOwn] = useState(false)
  const save = useAction()
  const ai = useAction()
  const [confirm, dialog] = useConfirm()
  useEffect(() => { if (data) setF({ type: data.type, title: data.title, summary: data.summary || '', skillIds: data.skill_ids, modules: data.modules }) }, [data])
  if (loading || !f) return error ? <ErrorState error={error} what="Der Inhalt" onRetry={hardReload} /> : <Loading />

  const persist = () => save.run(() => patch(`/creator/items/${id}`, f)).then(() => { toast('Gespeichert.'); reload() }).catch(() => {})
  const structure = () => ai.run(async () => {
    const r = await post(`/creator/items/${id}/structure`, { notes })
    const ok = f.modules.length === 0 || (await confirm({ title: 'Vorschlag übernehmen?', text: 'Die vorgeschlagenen Module ersetzen die aktuellen Module. Du kannst danach alles bearbeiten.', confirmLabel: 'Übernehmen' }))
    if (ok) setF({ ...f, summary: f.summary || r.summary, skillIds: [...new Set([...f.skillIds, ...r.skills])], modules: r.modules })
  }).catch(() => {})
  const setModule = (i, patch2) => setF({ ...f, modules: f.modules.map((m, j) => (j === i ? { ...m, ...patch2 } : m)) })
  const move = (i, d) => {
    const mods = [...f.modules]
    const [x] = mods.splice(i, 1)
    mods.splice(i + d, 0, x)
    setF({ ...f, modules: mods })
  }
  const publish = (on) => save.run(async () => {
    await patch(`/creator/items/${id}`, f)
    await post(`/creator/items/${id}/publish`, { publish: on, confirmOwnContent: confirmOwn })
    setPublishOpen(false)
    toast(on ? 'Veröffentlicht.' : 'Zurückgezogen.')
    reload()
  }).catch(() => {})
  const remove = async () => {
    if (!(await confirm({ title: 'Inhalt löschen?', text: 'Der Inhalt wird gelöscht. Teilnehmende verlieren den Zugang.', confirmLabel: 'Löschen', danger: true }))) return
    await del(`/creator/items/${id}`)
    navigate('/creator')
  }

  return (
    <div className="max-w-4xl">
      {dialog}
      <PageHeader back={{ to: '/creator', label: 'Creator' }} title={f.title || 'Ohne Titel'} subtitle={`${ITEM_TYPES[f.type]} · ${data.status === 'published' ? `veröffentlicht am ${formatDate(data.published_at)}` : 'Entwurf'}`}
        actions={<>
          <Button onClick={persist} loading={save.pending}>Speichern</Button>
          {data.status === 'published'
            ? <Button onClick={() => publish(false)}>Zurückziehen</Button>
            : <Button variant="primary" onClick={() => setPublishOpen(true)}>Veröffentlichen</Button>}
        </>} />
      <InlineError error={save.error} />
      <Card className="p-5 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
          <Field label="Art">{(fid) => <Select id={fid} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{Object.entries(ITEM_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
          <div className="sm:col-span-2"><Field label="Titel">{(fid) => <Input id={fid} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field></div>
        </div>
        <Field label="Beschreibung">{(fid) => <Textarea id={fid} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />}</Field>
        {catalog.data && (
          <Field label="Trainierte Skills">
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {catalog.data.skills.filter((s) => !s.custom).map((s) => (
                <button key={s.id} type="button" onClick={() => setF({ ...f, skillIds: f.skillIds.includes(s.id) ? f.skillIds.filter((x) => x !== s.id) : [...f.skillIds, s.id] })}
                  className={`px-2.5 h-7 rounded-md border text-[12.5px] ${f.skillIds.includes(s.id) ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-2'}`}>{s.name}</button>
              ))}
            </div>
          </Field>
        )}
      </Card>

      {aiAvailable && (
        <Section title="Junis hilft beim Strukturieren">
          <Card className="p-5">
            <Field label="Deine Notizen" optional hint="Stichpunkte, Zielgruppe, Inhalte. Junis erstellt einen Modul-Entwurf — du prüfst und ergänzt die Fachinhalte.">{(fid) => <Textarea id={fid} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
            <Button onClick={structure} loading={ai.pending}>Struktur vorschlagen</Button>
            <InlineError error={ai.error} />
          </Card>
        </Section>
      )}

      <Section title={`Module (${f.modules.length})`} action={<Button size="sm" onClick={() => setF({ ...f, modules: [...f.modules, { title: '', type: 'lesson', body: '' }] })}>Modul hinzufügen</Button>}>
        {f.modules.map((m, i) => (
          <Card key={i} className="p-4 mb-3">
            <div className="flex flex-wrap gap-2 items-center mb-3">
              <span className="text-xs text-faint tabular-nums w-5">{i + 1}.</span>
              <Select value={m.type} onChange={(e) => setModule(i, { type: e.target.value })} className="w-32 h-9" aria-label="Modultyp">{Object.entries(MODULE_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
              <Input value={m.title} onChange={(e) => setModule(i, { title: e.target.value })} placeholder="Titel" className="flex-1 h-9 min-w-40" aria-label="Modultitel" />
              <button onClick={() => move(i, -1)} disabled={i === 0} className="px-2 text-muted disabled:opacity-30" aria-label="Nach oben">↑</button>
              <button onClick={() => move(i, 1)} disabled={i === f.modules.length - 1} className="px-2 text-muted disabled:opacity-30" aria-label="Nach unten">↓</button>
              <button onClick={() => setF({ ...f, modules: f.modules.filter((_, j) => j !== i) })} className="text-xs text-faint hover:text-bad px-2">Entfernen</button>
            </div>
            <Textarea value={m.body} onChange={(e) => setModule(i, { body: e.target.value })} placeholder="Inhalt (Markdown)" className="min-h-32" aria-label="Modulinhalt" />
          </Card>
        ))}
        {!f.modules.length && <p className="text-sm text-muted">Noch keine Module.</p>}
      </Section>
      <Button variant="ghost" onClick={remove}>Inhalt löschen</Button>

      <Modal open={publishOpen} onClose={() => setPublishOpen(false)} title="Im Marketplace veröffentlichen"
        footer={<><Button variant="ghost" onClick={() => setPublishOpen(false)}>Abbrechen</Button><Button variant="primary" onClick={() => publish(true)} loading={save.pending} disabled={!confirmOwn}>Veröffentlichen</Button></>}>
        <p className="text-sm text-ink-2 mb-4">Der Inhalt wird für alle JunisWorld-Nutzer sichtbar — mit deinem Namen als Creator und kostenlos. Bezahlte Angebote sind derzeit nicht verfügbar.</p>
        <Checkbox checked={confirmOwn} onChange={setConfirmOwn} label="Ich besitze die Rechte an diesen Inhalten und habe sie fachlich geprüft." description="KI-generierte Entwürfe müssen vor der Veröffentlichung von dir überprüft werden." />
        <InlineError error={save.error} />
      </Modal>
    </div>
  )
}

export function Marketplace() {
  useDocumentTitle('Marketplace')
  const [q, setQ] = useState('')
  const { data, error, loading, hardReload } = useApi(`/marketplace?q=${encodeURIComponent(q)}`, [q])
  return (
    <>
      <PageHeader title="Marketplace" subtitle="Lernpfade, Missions und Skill Packs von Creators aus der Community. Alle Angebote sind derzeit kostenlos." />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen …" className="max-w-sm mb-6" aria-label="Marketplace durchsuchen" />
      {error ? <ErrorState error={error} what="Der Marketplace" onRetry={hardReload} /> : loading && !data ? <Loading /> : data.items.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.items.map((i) => (
            <Link key={i.id} to={`/marketplace/${i.id}`}>
              <Card className="p-5 hover:border-line-strong h-full">
                <div className="flex justify-between gap-2"><Badge>{ITEM_TYPES[i.type]}</Badge>{i.enrolled ? <Badge tone="accent">Gestartet</Badge> : null}</div>
                <p className="font-medium mt-2">{i.title}</p>
                <p className="text-sm text-muted mt-1 line-clamp-2">{i.summary}</p>
                <p className="text-xs text-faint mt-3">von {i.creator} · {i.moduleCount} Module · Community-Inhalt</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : q ? <p className="text-sm text-muted">Keine Treffer.</p> : (
        <EmptyState title="Noch keine Angebote im Marketplace." text="Sobald Creators Inhalte veröffentlichen, erscheinen sie hier. Du kannst selbst als Creator beginnen." action={<Button to="/creator">Creator werden</Button>} />
      )}
    </>
  )
}

export function MarketplaceItem() {
  const { id } = useParams()
  const { data, error, loading, reload, hardReload } = useApi(`/marketplace/${id}`)
  useDocumentTitle(data?.title)
  const action = useAction()
  const [open, setOpen] = useState(0)
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Das Angebot" onRetry={hardReload} />
  const done = new Set(data.progress)
  return (
    <div className="max-w-3xl">
      <PageHeader back={{ to: '/marketplace', label: 'Marketplace' }} title={data.title} subtitle={`${ITEM_TYPES[data.type]} von ${data.creator} · Community-Inhalt, nicht von JunisWorld geprüft · kostenlos`}
        actions={data.enrolled
          ? <Button variant="ghost" onClick={() => del(`/marketplace/${id}/enroll`).then(reload)}>Verlassen</Button>
          : <Button variant="primary" loading={action.pending} onClick={() => action.run(() => post(`/marketplace/${id}/enroll`)).then(reload).catch(() => {})}>Starten</Button>} />
      <p className="text-ink-2 mb-4">{data.summary}</p>
      {data.skills.length > 0 && <p className="text-sm text-muted mb-8">Skills: {data.skills.map((s, i) => <span key={s.id}>{i > 0 && ', '}<Link to={`/skills/${s.id}`} className="hover:underline">{s.name}</Link></span>)}</p>}
      <InlineError error={action.error} />
      <Section title={data.enrolled ? `Fortschritt: ${done.size} von ${data.modules.length}` : 'Inhalt'}>
        {data.modules.map((m, i) => (
          <Card key={i} className="mb-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              {data.enrolled && <input type="checkbox" className="size-4 accent-accent" checked={done.has(i)} onClick={(e) => e.stopPropagation()} onChange={(e) => post(`/marketplace/${id}/progress`, { index: i, done: e.target.checked }).then(reload)} aria-label={`${m.title} erledigt`} />}
              <span className="text-sm font-medium flex-1">{i + 1}. {m.title}</span>
              <Badge>{MODULE_TYPES[m.type]}</Badge>
            </button>
            {open === i && (data.enrolled ? <div className="px-4 pb-4"><Markdown>{m.body}</Markdown></div> : <p className="px-4 pb-4 text-sm text-muted">Starte das Angebot, um die Inhalte zu sehen.</p>)}
          </Card>
        ))}
      </Section>
      <p className="text-xs text-muted">Das Abhaken von Modulen ist eine Selbstauskunft und zählt nicht als Skill-Nachweis. Nachweise entstehen über Übungen, Projekte und Missions.</p>
    </div>
  )
}
