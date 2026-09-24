import { useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, post, patch, del } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { relative, formatDate } from '../lib/format.js'
import { useAuth } from '../lib/auth.jsx'
import { AskJunisButton } from '../components/AskJunis.jsx'
import Markdown from '../components/Markdown.jsx'
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Section, Select, Segmented, Tabs, Textarea,
  UpgradeNotice, useConfirm, useToast,
} from '../components/ui.jsx'

const TYPES = { note: 'Notiz', summary: 'Zusammenfassung', source: 'Quelle', link: 'Link' }
const fmtSize = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`)

export function Knowledge() {
  useDocumentTitle('Knowledge')
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'notes'
  const setTab = (t) => setParams({ tab: t })
  return (
    <>
      <PageHeader title="Knowledge" subtitle="Deine persönliche Wissensbibliothek. Junis AI durchsucht sie, wenn du Fragen stellst." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'notes', label: 'Notizen & Quellen' }, { value: 'documents', label: 'Dokumente' }, { value: 'research', label: 'Research' }]} />
      {tab === 'notes' && <Notes creating={params.get('new') === '1'} onCloseNew={() => setParams({ tab: 'notes' })} onNew={() => setParams({ tab: 'notes', new: '1' })} />}
      {tab === 'documents' && <Documents />}
      {tab === 'research' && <Research initialQuestion={params.get('q') || ''} />}
    </>
  )
}

function Notes({ creating, onNew, onCloseNew }) {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const { data, error, loading, reload, hardReload } = useApi(`/knowledge?q=${encodeURIComponent(q)}&type=${type}`, [q, type])
  if (error) return <ErrorState error={error} what="Deine Notizen" onRetry={hardReload} />
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Durchsuchen …" className="max-w-xs" aria-label="Notizen durchsuchen" />
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto" aria-label="Typ">
          <option value="">Alle Typen</option>
          {Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Button variant="primary" className="ml-auto" onClick={onNew}>Notiz anlegen</Button>
      </div>
      {loading && !data ? <Loading /> : data.items.length ? (
        <Card className="divide-y divide-line">
          {data.items.map((k) => (
            <Link key={k.id} to={`/knowledge/${k.id}`} className="block px-4 py-3 hover:bg-subtle/60">
              <div className="flex items-center gap-2"><Badge>{TYPES[k.type]}</Badge><p className="text-sm font-medium truncate">{k.title}</p></div>
              <p className="text-xs text-muted mt-1 line-clamp-1">{k.content.slice(0, 200) || k.url || '—'}</p>
            </Link>
          ))}
        </Card>
      ) : q || type ? <p className="text-sm text-muted">Keine Treffer.</p> : (
        <EmptyState title="Noch keine Einträge." text="Speichere Notizen, Zusammenfassungen und Quellen. Junis nutzt sie als Kontext für deine Fragen." action={<Button variant="primary" onClick={onNew}>Notiz anlegen</Button>} />
      )}
      {creating && <NoteEditor onClose={onCloseNew} onSaved={() => { onCloseNew(); reload() }} />}
    </>
  )
}

function NoteEditor({ item, onClose, onSaved }) {
  const [f, setF] = useState({ type: item?.type || 'note', title: item?.title || '', content: item?.content || '', url: item?.url || '', tags: item?.tags || '' })
  const { pending, error, run } = useAction()
  const save = () => run(() => (item ? patch(`/knowledge/${item.id}`, f) : post('/knowledge', f))).then(onSaved).catch(() => {})
  return (
    <Modal open onClose={onClose} title={item ? 'Eintrag bearbeiten' : 'Neuer Eintrag'} width="max-w-2xl"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" onClick={save} loading={pending} disabled={!f.title.trim()}>Speichern</Button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Typ">{(id) => <Select id={id} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
        <div className="sm:col-span-2"><Field label="Titel">{(id) => <Input id={id} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field></div>
      </div>
      <Field label="Inhalt" hint="Markdown wird unterstützt.">{(id) => <Textarea id={id} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} className="min-h-56 font-[450]" />}</Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Quelle / Link" optional>{(id) => <Input id={id} type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" />}</Field>
        <Field label="Tags" optional>{(id) => <Input id={id} value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="python, api" />}</Field>
      </div>
      <InlineError error={error} />
    </Modal>
  )
}

export function KnowledgeItemView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, error, loading, reload, hardReload } = useApi(`/knowledge/${id}`)
  useDocumentTitle(data?.title)
  const [editing, setEditing] = useState(false)
  const [confirm, dialog] = useConfirm()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Der Eintrag" onRetry={hardReload} />
  const remove = async () => {
    if (!(await confirm({ title: 'Eintrag löschen?', text: 'Dieser Eintrag wird dauerhaft gelöscht.', confirmLabel: 'Löschen', danger: true }))) return
    await del(`/knowledge/${id}`)
    navigate('/knowledge')
  }
  return (
    <div className="max-w-3xl">
      {dialog}
      <PageHeader back={{ to: '/knowledge', label: 'Knowledge' }} title={data.title} subtitle={`${TYPES[data.type]} · aktualisiert ${relative(data.updated_at)}${data.tags ? ` · ${data.tags}` : ''}`}
        actions={<><AskJunisButton label="Frag Junis dazu" contextType="knowledge" prompt={`Bezogen auf meinen Eintrag „${data.title}“: `} /><Button onClick={() => setEditing(true)}>Bearbeiten</Button><Button variant="ghost" onClick={remove}>Löschen</Button></>} />
      {data.url && <p className="text-sm mb-6"><a href={data.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all">{data.url}</a></p>}
      {data.content ? <Card className="p-6"><Markdown>{data.content}</Markdown></Card> : <p className="text-sm text-muted">Kein Inhalt.</p>}
      {editing && <NoteEditor item={data} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload() }} />}
    </div>
  )
}

function Documents() {
  const toast = useToast()
  const fileRef = useRef(null)
  const { data, error, loading, reload, hardReload } = useApi('/knowledge')
  const upload = useAction()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Deine Dokumente" onRetry={hardReload} />
  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    upload.run(() => api('/documents', { method: 'POST', form })).then(() => { toast('Dokument hochgeladen.'); reload() }).catch(() => {}).finally(() => { e.target.value = '' })
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-muted">PDF, Bilder (PNG, JPG, GIF, WebP) und Textdateien bis 20 MB. {!data.documentsEnabled && 'Die Analyse mit Junis ist ab Plus enthalten.'}</p>
        <input ref={fileRef} type="file" className="hidden" onChange={onFile} accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.csv,.json" />
        <Button variant="primary" onClick={() => fileRef.current?.click()} loading={upload.pending}>Dokument hochladen</Button>
      </div>
      <InlineError error={upload.error} />
      {data.documents.length ? (
        <Card className="divide-y divide-line">
          {data.documents.map((d) => (
            <Link key={d.id} to={`/knowledge/documents/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-subtle/60">
              <span className="text-sm flex-1 truncate">{d.filename}</span>
              {d.analyzed ? <Badge tone="ok">Analysiert</Badge> : null}
              <span className="text-xs text-muted">{fmtSize(d.size)} · {relative(d.created_at)}</span>
            </Link>
          ))}
        </Card>
      ) : <EmptyState title="Noch keine Dokumente." text="Lade Skripte, Arbeitsblätter, Notizen oder Fotos hoch. Junis fasst sie zusammen und leitet Lernthemen ab." action={<Button variant="primary" onClick={() => fileRef.current?.click()}>Dokument hochladen</Button>} />}
    </>
  )
}

export function DocumentView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { aiAvailable } = useAuth()
  const { data, error, loading, reload, hardReload } = useApi(`/documents/${id}`)
  useDocumentTitle(data?.filename)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const analyze = useAction()
  const [confirm, dialog] = useConfirm()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Das Dokument" onRetry={hardReload} />
  const run = (q) => analyze.run(async () => {
    const r = await post(`/documents/${id}/analyze`, { question: q || undefined })
    if (q) setAnswer(r.summary)
    else reload()
    if (r.creditsUsed) toast(`${r.creditsUsed} Credits verwendet (große Datei).`)
  }).catch(() => {})
  const remove = async () => {
    if (!(await confirm({ title: 'Dokument löschen?', text: 'Die Datei und ihre Zusammenfassung werden dauerhaft gelöscht.', confirmLabel: 'Löschen', danger: true }))) return
    await del(`/documents/${id}`)
    navigate('/knowledge?tab=documents')
  }
  const isImage = data.mime.startsWith('image/')
  const large = data.size > 2 * 1024 * 1024
  return (
    <div className="max-w-4xl">
      {dialog}
      <PageHeader back={{ to: '/knowledge?tab=documents', label: 'Dokumente' }} title={data.filename} subtitle={`${fmtSize(data.size)} · hochgeladen ${formatDate(data.createdAt)}`}
        actions={<><Button href={`/api/documents/${id}/file`} target="_blank" rel="noopener">Öffnen</Button><Button variant="ghost" onClick={remove}>Löschen</Button></>} />
      {isImage && <img src={`/api/documents/${id}/file`} alt={data.filename} className="max-h-96 rounded-xl border border-line mb-8" />}
      {analyze.error?.code === 'plan_required' ? <UpgradeNotice message={analyze.error.message} /> : (
        <>
          <Section title="Zusammenfassung" action={aiAvailable && <Button size="sm" variant={data.summary ? 'secondary' : 'primary'} onClick={() => run()} loading={analyze.pending && !question}>{data.summary ? 'Neu analysieren' : 'Mit Junis analysieren'}</Button>}>
            {large && <p className="text-xs text-muted mb-3">Große Datei: Die Analyse kostet 3 Credits. Vor der Analyse wird nichts berechnet.</p>}
            {data.summary ? (
              <>
                <Card className="p-6"><Markdown>{data.summary}</Markdown></Card>
                <Button size="sm" className="mt-3" onClick={() => post(`/documents/${id}/to-knowledge`).then((r) => navigate(`/knowledge/${r.id}`))}>Als Notiz speichern</Button>
              </>
            ) : <p className="text-sm text-muted">{aiAvailable ? 'Noch nicht analysiert.' : 'Junis AI ist auf diesem Server noch nicht eingerichtet.'}</p>}
          </Section>
          {aiAvailable && (
            <Section title="Frage zum Dokument">
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (question.trim()) run(question.trim()) }}>
                <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="z. B. Welche Formeln brauche ich für Aufgabe 3?" aria-label="Frage" />
                <Button type="submit" loading={analyze.pending && !!question} disabled={!question.trim()}>Fragen</Button>
              </form>
              {answer && <Card className="p-6 mt-4"><Markdown>{answer}</Markdown></Card>}
            </Section>
          )}
          <InlineError error={analyze.error} />
        </>
      )}
    </div>
  )
}

function Research({ initialQuestion }) {
  const navigate = useNavigate()
  const { data, error, loading, hardReload } = useApi('/research')
  const [question, setQuestion] = useState(initialQuestion)
  const [depth, setDepth] = useState('standard')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const action = useAction()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Research" onRetry={hardReload} />
  if (!data.enabled) return <UpgradeNotice message="Junis Research (Webrecherche mit Quellenvergleich und Quellenangaben) ist Teil von Pro." />
  const cost = depth === 'deep' ? data.costs.deep : data.costs.standard
  const go = () => action.run(async () => {
    const r = await post('/research', { question, depth })
    navigate(`/knowledge/research/${r.id}`)
  }).catch(() => {})
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-10">
      <div className="lg:col-span-3">
        <Card className="p-5 mb-8">
          {!data.aiAvailable && <p className="text-sm text-muted mb-4">Junis AI ist auf diesem Server noch nicht eingerichtet.</p>}
          <Field label="Forschungsfrage">{(id) => <Textarea id={id} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="z. B. Welche Einstiegswege gibt es in die Biotechnologie in Deutschland?" />}</Field>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented value={depth} onChange={setDepth} options={[{ value: 'standard', label: `Standard · ${data.costs.standard} Credits` }, { value: 'deep', label: `Tief · ${data.costs.deep} Credits` }]} />
            <Button variant="primary" onClick={() => setConfirmOpen(true)} disabled={question.trim().length < 5 || !data.aiAvailable} loading={action.pending}>{action.pending ? 'Junis recherchiert …' : 'Recherche starten'}</Button>
          </div>
          <p className="text-xs text-muted mt-3">Guthaben: {data.credits} Credits. Monatliche Credits verfallen am Monatsende. Schlägt die Recherche fehl, werden die Credits erstattet.</p>
          <InlineError error={action.error} />
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Section title="Berichte">
          {data.reports.length ? (
            <Card className="divide-y divide-line">
              {data.reports.map((r) => (
                <Link key={r.id} to={`/knowledge/research/${r.id}`} className="block px-4 py-3 hover:bg-subtle/60">
                  <p className="text-sm line-clamp-2">{r.question}</p>
                  <p className="text-xs text-muted mt-1">{r.depth === 'deep' ? 'Tief' : 'Standard'} · {relative(r.created_at)}</p>
                </Link>
              ))}
            </Card>
          ) : <p className="text-sm text-muted">Noch keine Berichte.</p>}
        </Section>
      </div>
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Recherche starten?"
        footer={<><Button variant="ghost" onClick={() => setConfirmOpen(false)}>Abbrechen</Button><Button variant="primary" onClick={() => { setConfirmOpen(false); go() }}>{cost} Credits verwenden</Button></>}>
        <p className="text-sm">Diese Recherche verwendet <b>{cost} Credits</b> von deinem Guthaben ({data.credits}). Es entstehen keine zusätzlichen Kosten.</p>
      </Modal>
    </div>
  )
}

export function ResearchView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, error, loading, hardReload } = useApi(`/research/${id}`)
  useDocumentTitle('Research')
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Der Bericht" onRetry={hardReload} />
  const cited = data.sources.filter((s) => s.cited)
  const other = data.sources.filter((s) => !s.cited)
  return (
    <div className="max-w-4xl">
      <PageHeader back={{ to: '/knowledge?tab=research', label: 'Research' }} title={data.question} subtitle={`${data.depth === 'deep' ? 'Tiefe Recherche' : 'Recherche'} · ${formatDate(data.created_at)}`}
        actions={<><Button onClick={() => post(`/research/${id}/to-knowledge`).then((r) => navigate(`/knowledge/${r.id}`))}>In Knowledge speichern</Button><Button variant="ghost" onClick={() => del(`/research/${id}`).then(() => navigate('/knowledge?tab=research'))}>Löschen</Button></>} />
      <p className="text-xs text-muted mb-4">KI-gestützte Recherche. Aussagen mit [unsicher] sind nicht belegt. Prüfe wichtige Punkte in den Originalquellen.</p>
      <Card className="p-6 mb-8"><Markdown>{data.report}</Markdown></Card>
      <Section title={`Zitierte Quellen (${cited.length})`}>
        {cited.length ? <ol className="space-y-2 text-sm list-decimal pl-5">{cited.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{s.title}</a> <span className="text-xs text-muted break-all">{new URL(s.url).hostname}{s.pageAge ? ` · ${s.pageAge}` : ''}</span></li>)}</ol> : <p className="text-sm text-muted">Keine direkt zitierten Quellen.</p>}
      </Section>
      {other.length > 0 && (
        <Section title={`Weitere gefundene Quellen (${other.length})`}>
          <ul className="space-y-1.5 text-sm">{other.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-ink-2 hover:underline">{s.title}</a></li>)}</ul>
        </Section>
      )}
    </div>
  )
}
