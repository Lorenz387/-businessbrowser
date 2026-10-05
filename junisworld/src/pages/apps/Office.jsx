// Büro-Assistent: Aufgaben & Wiedervorlagen, Posteingang mit KI-Einordnung, Briefe & Vorlagen.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, post, patch, del, getWorkspace } from '../../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../../lib/hooks.js'
import {
  Badge, Button, Card, Checkbox, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Section, Segmented, Select, Tabs, Textarea,
  useConfirm, useToast, cx,
} from '../../components/ui.jsx'

const today = () => new Date().toISOString().slice(0, 10)
const plusDays = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const fmt = (d) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('de-DE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : '')
const euro = (n) => (n == null ? '' : n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }))
const PRIO_TONE = { high: 'bad', normal: 'neutral', low: 'neutral' }
const INBOX_TONE = { new: 'accent', assigned: 'warn', done: 'ok', archived: 'neutral' }

export default function Office() {
  useDocumentTitle('Büro-Assistent')
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'tasks'
  const { data, error, loading, reload, hardReload } = useApi('/apps/office')
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Der Büro-Assistent" onRetry={hardReload} />
  const org = data.workspace.type === 'org'
  const setTab = (t) => setParams({ tab: t })
  const myOpen = data.tasks.filter((t) => t.status !== 'done' && (t.assignee_id === data.me || (!org && !t.assignee_id))).length
  return (
    <>
      <PageHeader back={{ to: '/apps', label: 'Apps' }} title="Büro-Assistent"
        subtitle={org ? `Aufgaben, Posteingang und Briefe von ${data.workspace.name} — gemeinsam im Team.` : 'Aufgaben, Wiedervorlagen, Posteingang und Briefe — für dich allein.'} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'tasks', label: 'Aufgaben', count: myOpen },
        { value: 'inbox', label: 'Posteingang', count: data.inbox.filter((i) => i.status === 'new').length },
        { value: 'letters', label: 'Briefe & Vorlagen' },
      ]} />
      {tab === 'tasks' && <Tasks data={data} reload={reload} focusId={Number(params.get('task')) || null} />}
      {tab === 'inbox' && <Inbox data={data} reload={reload} openId={Number(params.get('item')) || null} onReply={(i) => setParams({ tab: 'letters', reply: i.id })} />}
      {tab === 'letters' && <Letters data={data} reload={reload} replyTo={data.inbox.find((i) => i.id === Number(params.get('reply'))) || null} />}
    </>
  )
}

// =================== Aufgaben ===================

function Tasks({ data, reload, focusId }) {
  const org = data.workspace.type === 'org'
  const [filter, setFilter] = useState(org ? 'mine' : 'open')
  const [editing, setEditing] = useState(null)
  const [quick, setQuick] = useState({ title: '', dueDate: '', assigneeId: org ? '' : String(data.me), kind: 'task' })
  const toast = useToast()
  const add = useAction()
  useEffect(() => {
    if (focusId) {
      const t = data.tasks.find((x) => x.id === focusId)
      if (t) setEditing(t)
    }
  }, [focusId, data.tasks])

  const list = data.tasks.filter((t) => {
    if (filter === 'done') return t.status === 'done'
    if (t.status === 'done') return false
    if (filter === 'mine') return t.assignee_id === data.me
    if (filter === 'unassigned') return !t.assignee_id
    return true
  })
  const t0 = today()
  const week = plusDays(7)
  const groups = filter === 'done' ? [['Erledigt (letzte 30 Tage)', list]] : [
    ['Überfällig', list.filter((t) => t.overdue)],
    ['Heute', list.filter((t) => t.due_date === t0)],
    ['Nächste 7 Tage', list.filter((t) => t.due_date > t0 && t.due_date <= week)],
    ['Später', list.filter((t) => t.due_date > week)],
    ['Ohne Datum', list.filter((t) => !t.due_date)],
  ]
  const quickAdd = (e) => {
    e.preventDefault()
    if (!quick.title.trim()) return
    if (quick.kind === 'followup' && !quick.dueDate) { toast('Eine Wiedervorlage braucht ein Datum.', 'bad'); return }
    add.run(() => post('/apps/office/tasks', { ...quick, assigneeId: quick.assigneeId || null })).then(() => { setQuick({ ...quick, title: '', dueDate: '', assigneeId: org ? '' : String(data.me) }); reload() }).catch(() => {})
  }
  const toggleDone = (t) => patch(`/apps/office/tasks/${t.id}`, { status: t.status === 'done' ? 'open' : 'done' }).then(reload).catch((e) => toast(e.message, 'bad'))
  const takeOver = (t) => patch(`/apps/office/tasks/${t.id}`, { assigneeId: data.me }).then(() => { toast('Du bist jetzt zuständig.'); reload() }).catch((e) => toast(e.message, 'bad'))

  return (
    <>
      <Card className="p-4 mb-5">
        <form onSubmit={quickAdd} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-56"><Field label="Neue Aufgabe">{(id) => <Input id={id} value={quick.title} onChange={(e) => setQuick({ ...quick, title: e.target.value })} placeholder="z. B. Angebot für Büromöbel einholen" />}</Field></div>
          <Field label="Art">{(id) => <Select id={id} value={quick.kind} onChange={(e) => setQuick({ ...quick, kind: e.target.value })} className="w-40"><option value="task">Aufgabe</option><option value="followup">Wiedervorlage</option></Select>}</Field>
          <Field label="Fällig" optional={quick.kind === 'task'}>{(id) => <Input id={id} type="date" value={quick.dueDate} onChange={(e) => setQuick({ ...quick, dueDate: e.target.value })} className="w-40" />}</Field>
          {org && <Field label="Zuständig" optional>{(id) => <Select id={id} value={quick.assigneeId} onChange={(e) => setQuick({ ...quick, assigneeId: e.target.value })} className="w-44"><option value="">— niemand —</option>{data.assignees.map((a) => <option key={a.id} value={a.id}>{a.id === data.me ? `${a.name} (ich)` : a.name}</option>)}</Select>}</Field>}
          <div className="mb-4"><Button type="submit" variant="primary" loading={add.pending} disabled={!quick.title.trim()}>Anlegen</Button></div>
        </form>
        <InlineError error={add.error} />
        <p className="text-xs text-muted">Wiedervorlage = Erinnerung an einem Datum (z. B. „Antwort von Lieferant prüfen“). Fällige Aufgaben erscheinen im Cockpit und als Mitteilung{org ? ' bei der zuständigen Person' : ''}.</p>
      </Card>

      <Segmented className="mb-4" value={filter} onChange={setFilter} options={[
        ...(org ? [{ value: 'mine', label: 'Meine' }, { value: 'unassigned', label: 'Ohne Zuständigkeit' }] : []),
        { value: 'open', label: org ? 'Alle offenen' : 'Offen' },
        { value: 'done', label: 'Erledigt' },
      ]} />

      {list.length ? groups.filter(([, g]) => g.length).map(([label, g]) => (
        <Section key={label} title={label}>
          <Card className="divide-y divide-line">
            {g.map((t) => (
              <div key={t.id} className={cx('flex flex-wrap items-center gap-3 px-4 py-2.5', t.id === focusId && 'bg-accent-soft/40')}>
                <input type="checkbox" className="size-4 accent-accent" checked={t.status === 'done'} onChange={() => toggleDone(t)} aria-label={`${t.title} erledigt`} />
                <button className="flex-1 min-w-48 text-left" onClick={() => setEditing(t)}>
                  <span className={cx('text-sm font-medium', t.status === 'done' && 'line-through text-muted')}>{t.title}</span>
                  <span className="block text-xs text-muted">
                    {t.kind === 'followup' ? 'Wiedervorlage · ' : ''}{t.due_date ? `fällig ${fmt(t.due_date)}` : 'ohne Datum'}{org ? ` · ${t.assignee_name || 'niemand zuständig'}` : ''}{t.inbox_id ? ' · aus dem Posteingang' : ''}
                  </span>
                </button>
                {t.priority === 'high' && <Badge tone={PRIO_TONE.high}>Hoch</Badge>}
                {t.overdue && <Badge tone="bad">Überfällig</Badge>}
                {t.status === 'in_progress' && <Badge tone="accent">In Arbeit</Badge>}
                {t.status === 'waiting' && <Badge tone="warn">Wartet</Badge>}
                {org && !t.assignee_id && t.status !== 'done' && <Button size="sm" onClick={() => takeOver(t)}>Übernehmen</Button>}
              </div>
            ))}
          </Card>
        </Section>
      )) : <EmptyState title={filter === 'mine' ? 'Keine offenen Aufgaben für dich.' : filter === 'done' ? 'Noch nichts erledigt.' : 'Keine offenen Aufgaben.'} text="Lege oben eine Aufgabe oder Wiedervorlage an — oder erzeuge Aufgaben direkt aus einem Dokument im Posteingang." />}
      {editing && <TaskForm data={data} task={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    </>
  )
}

function TaskForm({ data, task, onClose, onSaved }) {
  const org = data.workspace.type === 'org'
  const [f, setF] = useState({ title: task.title, notes: task.notes || '', status: task.status, priority: task.priority, kind: task.kind, dueDate: task.due_date || '', assigneeId: task.assignee_id ? String(task.assignee_id) : '' })
  const save = useAction()
  const remove = useAction()
  const [confirm, dialog] = useConfirm()
  const set = (x) => setF((y) => ({ ...y, ...x }))
  const submit = () => save.run(() => patch(`/apps/office/tasks/${task.id}`, { ...f, assigneeId: f.assigneeId || null })).then(onSaved).catch(() => {})
  const onDelete = async () => {
    if (!(await confirm({ title: 'Aufgabe löschen?', text: `„${task.title}“ wird gelöscht.`, confirmLabel: 'Löschen', danger: true }))) return
    remove.run(() => del(`/apps/office/tasks/${task.id}`)).then(onSaved).catch(() => {})
  }
  return (
    <Modal open onClose={onClose} title={task.kind === 'followup' ? 'Wiedervorlage' : 'Aufgabe'} width="max-w-xl"
      footer={<><Button variant="ghost" onClick={onDelete} className="mr-auto">Löschen</Button><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={save.pending} disabled={!f.title.trim()} onClick={submit}>Speichern</Button></>}>
      {dialog}
      <Field label="Titel">{(id) => <Input id={id} value={f.title} onChange={(e) => set({ title: e.target.value })} />}</Field>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Status">{(id) => <Select id={id} value={f.status} onChange={(e) => set({ status: e.target.value })}>{Object.entries(data.taskStatus).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
        <Field label="Priorität">{(id) => <Select id={id} value={f.priority} onChange={(e) => set({ priority: e.target.value })}>{Object.entries(data.priority).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
        <Field label="Art">{(id) => <Select id={id} value={f.kind} onChange={(e) => set({ kind: e.target.value })}>{Object.entries(data.kinds).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
        <Field label="Fällig" optional={f.kind === 'task'}>{(id) => <Input id={id} type="date" value={f.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />}</Field>
      </div>
      {org && <Field label="Zuständig" optional>{(id) => <Select id={id} value={f.assigneeId} onChange={(e) => set({ assigneeId: e.target.value })}><option value="">— niemand —</option>{data.assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>}</Field>}
      <Field label="Notizen" optional>{(id) => <Textarea id={id} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />}</Field>
      {org && <p className="text-xs text-muted">Angelegt von {task.creator_name || 'gelöschtem Konto'}. Ändern dürfen die zuständige Person, wer die Aufgabe angelegt hat, und Manager.</p>}
      <InlineError error={save.error || remove.error} />
    </Modal>
  )
}

// =================== Posteingang ===================

function Inbox({ data, reload, openId, onReply }) {
  const org = data.workspace.type === 'org'
  const fileRef = useRef(null)
  const [showDone, setShowDone] = useState(false)
  const [open, setOpen] = useState(openId)
  const [manual, setManual] = useState(false)
  const upload = useAction()
  const toast = useToast()
  useEffect(() => { if (openId) setOpen(openId) }, [openId])
  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    upload.run(() => api('/apps/office/inbox', { method: 'POST', form })).then((r) => { toast('Dokument im Posteingang.'); reload(); setOpen(r.id) }).catch(() => {}).finally(() => { e.target.value = '' })
  }
  const list = data.inbox.filter((i) => showDone || i.status === 'new' || i.status === 'assigned')
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" onChange={onFile} />
        <Button variant="primary" onClick={() => fileRef.current?.click()} loading={upload.pending}>Dokument hochladen</Button>
        <Button onClick={() => setManual(true)}>Ohne Datei erfassen</Button>
        <span className="flex-1" />
        <Checkbox label="Erledigte anzeigen" checked={showDone} onChange={setShowDone} />
      </div>
      <InlineError error={upload.error} />
      {list.length ? (
        <Card className="divide-y divide-line">
          {list.map((i) => (
            <button key={i.id} onClick={() => setOpen(i.id)} className="w-full text-left flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-subtle/60">
              <div className="flex-1 min-w-48">
                <p className="text-sm font-medium">{i.title}</p>
                <p className="text-xs text-muted">{[i.sender, i.categoryLabel, i.reference].filter(Boolean).join(' · ')}{i.amount != null ? ` · ${euro(i.amount)}` : ''}</p>
              </div>
              {i.deadline && <span className={cx('text-xs tabular-nums', i.deadline <= plusDays(2) ? 'text-bad' : 'text-muted')}>Frist {fmt(i.deadline)}</span>}
              {org && <span className="text-xs text-muted">{i.assignee_name || 'nicht zugeordnet'}</span>}
              <Badge tone={INBOX_TONE[i.status]}>{data.inboxStatus[i.status]}</Badge>
            </button>
          ))}
        </Card>
      ) : <EmptyState title="Posteingang leer." text="Lade eingehende Post hoch (PDF, Foto, Text). Junis AI erkennt Absender, Art, Frist und Betrag und schlägt Aufgaben vor. Verträge lassen sich direkt in den Fristen-Manager übernehmen." action={<Button variant="primary" onClick={() => fileRef.current?.click()}>Dokument hochladen</Button>} />}
      {open && <InboxItem data={data} id={open} onClose={() => setOpen(null)} onChanged={reload} onReply={onReply} />}
      {manual && <ManualInbox data={data} onClose={() => setManual(false)} onSaved={(id) => { setManual(false); reload(); setOpen(id) }} />}
    </>
  )
}

function ManualInbox({ data, onClose, onSaved }) {
  const [f, setF] = useState({ title: '', sender: '', category: 'sonstiges', summary: '' })
  const { pending, error, run } = useAction()
  return (
    <Modal open onClose={onClose} title="Eingang erfassen"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!f.title.trim()} onClick={() => run(() => {
        const form = new FormData()
        Object.entries(f).forEach(([k, v]) => form.append(k, v))
        return api('/apps/office/inbox', { method: 'POST', form })
      }).then((r) => onSaved(r.id)).catch(() => {})}>Speichern</Button></>}>
      <Field label="Titel">{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="z. B. Anruf Steuerberater: Unterlagen fehlen" />}</Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Absender" optional>{(id) => <Input id={id} value={f.sender} onChange={(e) => setF({ ...f, sender: e.target.value })} />}</Field>
        <Field label="Kategorie">{(id) => <Select id={id} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{Object.entries(data.categories).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
      </div>
      <Field label="Inhalt" optional>{(id) => <Textarea id={id} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />}</Field>
      <InlineError error={error} />
    </Modal>
  )
}

function InboxItem({ data, id, onClose, onChanged, onReply }) {
  const org = data.workspace.type === 'org'
  const navigate = useNavigate()
  const toast = useToast()
  const item = useApi(`/apps/office/inbox/${id}`, [id])
  const [f, setF] = useState(null)
  const [picked, setPicked] = useState([])
  const save = useAction()
  const ai = useAction()
  const act = useAction()
  const [confirm, dialog] = useConfirm()
  useEffect(() => {
    if (item.data) {
      const d = item.data
      setF({ title: d.title, sender: d.sender || '', category: d.category, reference: d.reference || '', deadline: d.deadline || '', amount: d.amount ?? '', summary: d.summary || '', assigneeId: d.assignee_id ? String(d.assignee_id) : '' })
      // Suggestions that already became tasks are not pre-selected again (no duplicates).
      const existing = new Set((d.tasks || []).map((t) => t.title))
      setPicked((d.extraction?.tasks || []).map((t, i) => (existing.has(t.title) ? -1 : i)).filter((i) => i >= 0))
    }
  }, [item.data])
  if (item.loading || !f) return <Modal open onClose={onClose} title="Posteingang"><Loading /></Modal>
  if (item.error) return <Modal open onClose={onClose} title="Posteingang"><ErrorState error={item.error} compact /></Modal>
  const d = item.data
  const ex = d.extraction
  const set = (x) => setF((y) => ({ ...y, ...x }))
  const done = () => { item.reload(); onChanged() }
  const submit = (extra = {}) => save.run(() => patch(`/apps/office/inbox/${id}`, { ...f, assigneeId: f.assigneeId || null, ...extra })).then(() => { toast('Gespeichert.'); done() }).catch(() => {})
  // Applying the suggestion saves right away, so it can't get lost by a later reload.
  const applyAi = () => submit({ title: ex.title || f.title, sender: ex.sender || f.sender, category: ex.category, summary: ex.summary, reference: ex.reference || f.reference, deadline: ex.deadline || f.deadline || null, amount: ex.amount >= 0 ? ex.amount : f.amount })
  const createTasks = () => act.run(() => post(`/apps/office/inbox/${id}/tasks`, { tasks: picked.map((i) => ex.tasks[i]), assigneeId: f.assigneeId || null })).then((r) => { toast(`${r.created} Aufgabe(n) angelegt.`); done() }).catch(() => {})
  const toContract = () => act.run(() => post(`/apps/office/inbox/${id}/to-contract`)).then((r) => navigate(`/apps/contracts/${r.contractId}?extract=1`)).catch(() => {})
  const remove = async () => {
    if (!(await confirm({ title: 'Eingang löschen?', text: 'Der Eintrag wird gelöscht. Verknüpfte Aufgaben bleiben erhalten.', confirmLabel: 'Löschen', danger: true }))) return
    act.run(() => del(`/apps/office/inbox/${id}`)).then(() => { onChanged(); onClose() }).catch(() => {})
  }
  return (
    <Modal open onClose={onClose} title="Posteingang" width="max-w-3xl"
      footer={d.canEdit ? <>
        <Button variant="ghost" onClick={remove} className="mr-auto">Löschen</Button>
        {d.status !== 'archived' && <Button variant="ghost" onClick={() => submit({ status: 'archived' })}>Archivieren</Button>}
        {d.status !== 'done' && <Button onClick={() => submit({ status: 'done' })}>Erledigt</Button>}
        <Button variant="primary" loading={save.pending} onClick={() => submit()}>Speichern</Button>
      </> : <Button onClick={onClose}>Schließen</Button>}>
      {dialog}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge tone={INBOX_TONE[d.status]}>{data.inboxStatus[d.status]}</Badge>
        {d.document && <a className="text-sm text-accent hover:underline" href={`/api/apps/office/inbox/${id}/file?ws=${getWorkspace()}`} target="_blank" rel="noopener noreferrer">{d.document.filename} öffnen</a>}
        <span className="flex-1" />
        {d.canEdit && d.document && data.aiAvailable && <Button size="sm" loading={ai.pending} onClick={() => ai.run(() => post(`/apps/office/inbox/${id}/classify`)).then(done).catch(() => {})}>{ex ? 'Neu einordnen' : 'Mit KI einordnen'}</Button>}
        <Button size="sm" onClick={() => onReply(d)}>Antwort schreiben</Button>
        {d.canEdit && data.contractsAvailable && !d.contract_id && <Button size="sm" onClick={toContract} loading={act.pending}>Als Vertrag übernehmen</Button>}
        {d.contract_id && <Button size="sm" variant="ghost" to={`/apps/contracts/${d.contract_id}`}>Zum Vertrag</Button>}
      </div>
      <InlineError error={ai.error || act.error} />

      {ex && (
        <Card className="p-4 mb-4 bg-accent-soft/30">
          <div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-medium">Vorschlag von Junis AI</p>{d.canEdit && <Button size="sm" onClick={applyAi}>Felder übernehmen</Button>}</div>
          <p className="text-sm mt-1">{ex.summary}</p>
          <p className="text-xs text-muted mt-1">{[ex.sender, data.categories[ex.category], ex.reference, ex.deadline && `Frist ${fmt(ex.deadline)}`, ex.amount >= 0 && euro(ex.amount)].filter(Boolean).join(' · ')}{ex.isContract ? ' · wirkt wie ein Vertrag' : ''}</p>
          {ex.tasks.length > 0 && d.canEdit && (
            <div className="mt-3">
              <p className="text-xs text-muted mb-1">Vorgeschlagene Aufgaben</p>
              {ex.tasks.map((t, i) => <Checkbox key={i} label={`${t.title}${t.due ? ` (bis ${fmt(t.due)})` : ''}${d.tasks.some((x) => x.title === t.title) ? ' — bereits angelegt' : ''}`} checked={picked.includes(i)} onChange={(v) => setPicked(v ? [...picked, i] : picked.filter((x) => x !== i))} />)}
              <Button size="sm" className="mt-1" disabled={!picked.length} loading={act.pending} onClick={createTasks}>Aufgaben anlegen</Button>
            </div>
          )}
          <p className="text-[11px] text-muted mt-2">KI-Vorschlag — vor dem Übernehmen prüfen.</p>
        </Card>
      )}

      <fieldset disabled={!d.canEdit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Field label="Titel">{(fid) => <Input id={fid} value={f.title} onChange={(e) => set({ title: e.target.value })} />}</Field>
          <Field label="Absender" optional>{(fid) => <Input id={fid} value={f.sender} onChange={(e) => set({ sender: e.target.value })} />}</Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Kategorie">{(fid) => <Select id={fid} value={f.category} onChange={(e) => set({ category: e.target.value })}>{Object.entries(data.categories).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
          <Field label="Zeichen / Nr." optional>{(fid) => <Input id={fid} value={f.reference} onChange={(e) => set({ reference: e.target.value })} />}</Field>
          <Field label="Frist" optional>{(fid) => <Input id={fid} type="date" value={f.deadline} onChange={(e) => set({ deadline: e.target.value })} />}</Field>
          <Field label="Betrag (€)" optional>{(fid) => <Input id={fid} inputMode="decimal" value={f.amount} onChange={(e) => set({ amount: e.target.value })} />}</Field>
        </div>
        {org && <Field label="Zuständig" optional>{(fid) => <Select id={fid} value={f.assigneeId} onChange={(e) => set({ assigneeId: e.target.value })}><option value="">— nicht zugeordnet —</option>{data.assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>}</Field>}
        <Field label="Inhalt / Notiz" optional>{(fid) => <Textarea id={fid} value={f.summary} onChange={(e) => set({ summary: e.target.value })} />}</Field>
      </fieldset>
      {!d.canEdit && org && !d.assignee_id && <Button size="sm" onClick={() => patch(`/apps/office/inbox/${id}`, { assigneeId: data.me }).then(done)}>Übernehmen</Button>}
      {d.tasks.length > 0 && <p className="text-sm mt-2">Aufgaben daraus: {d.tasks.map((t) => `${t.title}${t.status === 'done' ? ' ✓' : ''}`).join(' · ')}</p>}
      <InlineError error={save.error} />
    </Modal>
  )
}

// =================== Briefe & Vorlagen ===================

function Letters({ data, reload, replyTo }) {
  const toast = useToast()
  const [tpl, setTpl] = useState(null)
  const [editingTpl, setEditingTpl] = useState(null)
  const [confirm, dialog] = useConfirm()
  const start = (t) => setTpl(t)
  useEffect(() => {
    if (replyTo) setTpl({ id: 'reply', name: 'Antwort', subject: `Ihr Schreiben${replyTo.reference ? ` (${replyTo.reference})` : ''}`, body: 'Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihr Schreiben.\n\n\n\nMit freundlichen Grüßen', recipient: replyTo.sender || '', placeholders: [] })
  }, [replyTo])
  const removeTpl = async (t) => {
    if (!(await confirm({ title: `Vorlage „${t.name}“ löschen?`, confirmLabel: 'Löschen', danger: true }))) return
    del(`/apps/office/templates/${t.id}`).then(() => { toast('Vorlage gelöscht.'); reload() })
  }
  if (tpl) return <Composer data={data} template={tpl} onBack={() => setTpl(null)} onSavedTemplate={reload} />
  return (
    <>
      {dialog}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="primary" onClick={() => start({ id: 'blank', name: 'Freier Brief', subject: '', body: 'Sehr geehrte Damen und Herren,\n\n\n\nMit freundlichen Grüßen', placeholders: [] })}>Neuer Brief</Button>
        <Button onClick={() => setEditingTpl({})}>Eigene Vorlage anlegen</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.templates.map((t) => (
          <Card key={t.id} className="p-4 flex flex-col">
            <div className="flex justify-between gap-2"><p className="font-medium">{t.name}</p>{t.builtin ? <Badge>Vorlage</Badge> : <Badge tone="accent">Eigene</Badge>}</div>
            <p className="text-xs text-muted mt-1 line-clamp-1">{t.subject}</p>
            <p className="text-sm text-muted mt-2 line-clamp-3 flex-1 whitespace-pre-line">{t.body}</p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="primary" onClick={() => start(t)}>Verwenden</Button>
              {!t.builtin && <Button size="sm" variant="ghost" onClick={() => setEditingTpl(t)}>Bearbeiten</Button>}
              {!t.builtin && <Button size="sm" variant="ghost" onClick={() => removeTpl(t)}>Löschen</Button>}
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted mt-4">Platzhalter in doppelten geschweiften Klammern, z. B. {'{{rechnungsnummer}}'}, werden beim Verwenden als Felder abgefragt. Startvorlagen orientieren sich an DIN 5008.</p>
      {editingTpl && <TemplateForm template={editingTpl} onClose={() => setEditingTpl(null)} onSaved={() => { setEditingTpl(null); reload() }} />}
    </>
  )
}

function TemplateForm({ template, onClose, onSaved }) {
  const [f, setF] = useState({ name: template.name || '', subject: template.subject || '', body: template.body || 'Sehr geehrte Damen und Herren,\n\n\n\nMit freundlichen Grüßen' })
  const { pending, error, run } = useAction()
  return (
    <Modal open onClose={onClose} title={template.id ? 'Vorlage bearbeiten' : 'Eigene Vorlage'} width="max-w-2xl"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!f.name.trim() || !f.body.trim()} onClick={() => run(() => (template.id ? patch(`/apps/office/templates/${template.id}`, f) : post('/apps/office/templates', f))).then(onSaved).catch(() => {})}>Speichern</Button></>}>
      <Field label="Name">{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
      <Field label="Betreff">{(id) => <Input id={id} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />}</Field>
      <Field label="Text" hint="Platzhalter: {{name}}">{(id) => <Textarea id={id} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} className="min-h-64 font-mono text-sm" />}</Field>
      <InlineError error={error} />
    </Modal>
  )
}

const fillText = (text, values) => String(text).replace(/\{\{\s*([a-z0-9_äöüß]+)\s*\}\}/gi, (m, k) => (values[k] ? values[k] : m))
const labelOf = (k) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

function Composer({ data, template, onBack, onSavedTemplate }) {
  const toast = useToast()
  const [values, setValues] = useState({})
  const [letter, setLetter] = useState({ sender: data.senderName || '', recipient: template.recipient || '', place: '', date: today(), subject: template.subject || '', body: template.body || '' })
  const [instruction, setInstruction] = useState('')
  const ai = useAction()
  const saveTpl = useAction()
  const set = (x) => setLetter((l) => ({ ...l, ...x }))
  const keys = useMemo(() => [...new Set([...`${template.subject} ${template.body}`.matchAll(/\{\{\s*([a-z0-9_äöüß]+)\s*\}\}/gi)].map((m) => m[1]))], [template])
  const subject = fillText(letter.subject, values)
  const body = fillText(letter.body, values)
  const open = [...`${subject} ${body}`.matchAll(/\{\{\s*([a-z0-9_äöüß]+)\s*\}\}/gi)].map((m) => m[1])
  const draft = () => ai.run(() => post('/apps/office/letters/draft', { instruction, recipient: letter.recipient, subject, current: body.trim().length > 60 ? body : '' })).then((r) => { set({ body: r.body }); setValues({}) }).catch(() => {})
  const print = () => {
    const w = window.open('', '_blank')
    if (!w) { toast('Pop-up blockiert — bitte erlauben.', 'bad'); return }
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    w.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(subject || 'Brief')}</title>
<style>@page{size:A4;margin:20mm 20mm 20mm 25mm}body{font:11pt/1.45 Arial,Helvetica,sans-serif;color:#000;max-width:165mm;margin:0 auto}
.sender{font-size:8pt;border-bottom:1px solid #000;display:inline-block;margin:27mm 0 2mm}.addr{white-space:pre-line;min-height:27mm}.date{text-align:right;margin:8mm 0}.subj{font-weight:bold;margin-bottom:8mm}.body{white-space:pre-wrap}</style></head>
<body><div class="sender">${esc(letter.sender)}</div><div class="addr">${esc(letter.recipient)}</div><div class="date">${esc(letter.place ? `${letter.place}, ` : '')}${esc(fmt(letter.date))}</div><div class="subj">${esc(subject)}</div><div class="body">${esc(body)}${letter.sender ? `\n\n${esc(letter.sender)}` : ''}</div></body></html>`)
    w.document.close(); w.focus(); w.print()
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button variant="ghost" onClick={onBack}>← Vorlagen</Button>
        <p className="font-medium">{template.name}</p>
        <span className="flex-1" />
        <Button onClick={() => navigator.clipboard?.writeText(`${subject}\n\n${body}`).then(() => toast('Kopiert.'))}>Kopieren</Button>
        <Button variant="primary" onClick={print}>Drucken / PDF</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Card className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
              <Field label="Absender (Kurzzeile)">{(id) => <Input id={id} value={letter.sender} onChange={(e) => set({ sender: e.target.value })} />}</Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ort" optional>{(id) => <Input id={id} value={letter.place} onChange={(e) => set({ place: e.target.value })} />}</Field>
                <Field label="Datum">{(id) => <Input id={id} type="date" value={letter.date} onChange={(e) => set({ date: e.target.value })} />}</Field>
              </div>
            </div>
            <Field label="Empfänger (Anschrift)">{(id) => <Textarea id={id} value={letter.recipient} onChange={(e) => set({ recipient: e.target.value })} className="min-h-24" placeholder={'Muster GmbH\nFrau Anna Beispiel\nHauptstraße 1\n12345 Musterstadt'} />}</Field>
            <Field label="Betreff">{(id) => <Input id={id} value={letter.subject} onChange={(e) => set({ subject: e.target.value })} />}</Field>
            <Field label="Text">{(id) => <Textarea id={id} value={letter.body} onChange={(e) => set({ body: e.target.value })} className="min-h-72" />}</Field>
            {open.length > 0 && <p className="text-xs text-warn">Noch offene Platzhalter: {[...new Set(open)].join(', ')}</p>}
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {keys.length > 0 && (
            <Card className="p-5">
              <p className="font-medium mb-2">Platzhalter ausfüllen</p>
              {keys.map((k) => <Field key={k} label={labelOf(k)}>{(id) => <Input id={id} value={values[k] || ''} onChange={(e) => setValues({ ...values, [k]: e.target.value })} />}</Field>)}
            </Card>
          )}
          {data.aiAvailable && (
            <Card className="p-5">
              <p className="font-medium mb-2">Mit Junis AI schreiben</p>
              <Textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} className="min-h-20" placeholder="z. B. Höflich um einen neuen Liefertermin bitten, da die Ware beschädigt ankam." aria-label="Auftrag an Junis" />
              <Button className="mt-2" loading={ai.pending} disabled={instruction.trim().length < 5} onClick={draft}>{body.trim().length > 60 ? 'Text überarbeiten' : 'Text entwerfen'}</Button>
              <p className="text-xs text-muted mt-2">Ersetzt den Text. Fehlende Angaben bleiben als Platzhalter — nichts wird erfunden.</p>
              <InlineError error={ai.error} />
            </Card>
          )}
          <Card className="p-5">
            <p className="text-sm text-muted mb-2">Diesen Brief als eigene Vorlage speichern (Platzhalter bleiben erhalten).</p>
            <Button size="sm" loading={saveTpl.pending} onClick={() => saveTpl.run(() => post('/apps/office/templates', { name: `${template.name} (eigene)`, subject: letter.subject, body: letter.body })).then(() => { toast('Vorlage gespeichert.'); onSavedTemplate() }).catch(() => {})}>Als Vorlage speichern</Button>
            <InlineError error={saveTpl.error} />
          </Card>
        </div>
      </div>
    </>
  )
}
