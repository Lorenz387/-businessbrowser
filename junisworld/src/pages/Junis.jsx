import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { get, post, patch, del } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { relative } from '../lib/format.js'
import { useAuth } from '../lib/auth.jsx'
import Markdown from '../components/Markdown.jsx'
import { LogoMark } from '../components/Logo.jsx'
import {
  Badge, Button, Card, EmptyState, ErrorState, Input, InlineError, Loading, PageHeader, Section, Spinner, Stat, StatusBadge, Tabs,
  useConfirm, cx,
} from '../components/ui.jsx'

export default function Junis() {
  useDocumentTitle('Junis AI')
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'chat'
  return (
    <>
      <PageHeader title="Junis AI" subtitle="Dein persönlicher Assistent — kennt deine Ziele, Skills, Projekte und Wissensbibliothek. Überall über „Frag Junis“ erreichbar." />
      <Tabs value={tab} onChange={(t) => setParams(t === 'chat' ? {} : { tab: t })} tabs={[{ value: 'chat', label: 'Gespräche' }, { value: 'memory', label: 'Memory' }, { value: 'twin', label: 'Junis Twin' }]} />
      {tab === 'chat' && <Chat />}
      {tab === 'memory' && <Memory />}
      {tab === 'twin' && <Twin />}
    </>
  )
}

const STARTERS = [
  'Was sollte ich diese Woche lernen, um meinem Ziel am schnellsten näherzukommen?',
  'Erkläre mir meine größte Skill-Lücke in einfachen Worten.',
  'Schlag mir ein kleines Projekt vor, das zu meinem aktuellen Stand passt.',
  'Wo mache ich laut meinen Übungen die meisten Fehler?',
]

function Chat() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { aiAvailable } = useAuth()
  const list = useApi('/conversations')
  const [messages, setMessages] = useState([])
  const [loadingConv, setLoadingConv] = useState(false)
  const [convError, setConvError] = useState(null)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const endRef = useRef(null)
  const [confirm, dialog] = useConfirm()

  useEffect(() => {
    setError(null)
    if (!id) { setMessages([]); return }
    setLoadingConv(true)
    setConvError(null)
    get(`/conversations/${id}`).then((c) => setMessages(c.messages)).catch(setConvError).finally(() => setLoadingConv(false))
  }, [id])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages, pending])

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || pending) return
    setInput('')
    setError(null)
    setMessages((m) => [...m, { role: 'user', content: msg }])
    setPending(true)
    try {
      const r = await post('/chat', { message: msg, conversationId: id ? Number(id) : undefined })
      setMessages((m) => [...m, { role: 'assistant', content: r.reply, usedKnowledge: r.usedKnowledge }])
      if (!id) navigate(`/junis/${r.conversationId}`, { replace: true })
      list.reload()
    } catch (e) {
      setError(e)
      setMessages((m) => m.slice(0, -1))
      setInput(msg)
    } finally {
      setPending(false)
    }
  }
  const remove = async (cid) => {
    if (!(await confirm({ title: 'Gespräch löschen?', text: 'Das Gespräch wird dauerhaft gelöscht.', confirmLabel: 'Löschen', danger: true }))) return
    await del(`/conversations/${cid}`)
    list.reload()
    if (String(cid) === id) navigate('/junis')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      {dialog}
      <aside className="lg:border-r lg:border-line lg:pr-4">
        <Button variant="secondary" className="w-full mb-3" to="/junis">Neues Gespräch</Button>
        <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
          {list.data?.conversations.map((c) => (
            <div key={c.id} className={cx('group flex items-center rounded-lg', String(c.id) === id ? 'bg-subtle' : 'hover:bg-subtle/60')}>
              <Link to={`/junis/${c.id}`} className="flex-1 min-w-0 px-3 py-2">
                <p className="text-sm truncate">{c.title}</p>
                <p className="text-[11px] text-muted">{relative(c.updated_at)}</p>
              </Link>
              <button onClick={() => remove(c.id)} className="text-xs text-faint hover:text-bad px-2 sm:opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label="Gespräch löschen">✕</button>
            </div>
          ))}
          {list.data && !list.data.conversations.length && <p className="text-xs text-muted px-3">Noch keine Gespräche.</p>}
        </div>
      </aside>
      <section className="min-w-0 flex flex-col min-h-[60vh]">
        {!aiAvailable && <Card className="p-4 mb-4 text-sm text-muted">Junis AI ist auf diesem Server noch nicht eingerichtet. Der Betreiber muss einen Anthropic-API-Schlüssel hinterlegen (ANTHROPIC_API_KEY).</Card>}
        {loadingConv ? <Loading /> : convError ? <ErrorState error={convError} what="Das Gespräch" compact /> : (
          <div className="flex-1 space-y-6 pb-6">
            {!messages.length && aiAvailable && (
              <div className="pt-6">
                <LogoMark className="size-8 mb-4" />
                <p className="font-medium">Womit kann Junis helfen?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                  {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="text-left text-sm rounded-xl border border-line bg-surface px-4 py-3 hover:border-line-strong">{s}</button>)}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cx(m.role === 'user' ? 'ml-auto max-w-[85%] bg-subtle rounded-2xl px-4 py-3 text-[14.5px]' : 'max-w-3xl')}>
                {m.role === 'user' ? <p className="whitespace-pre-wrap">{m.content}</p> : (
                  <>
                    <Markdown>{m.content}</Markdown>
                    {m.usedKnowledge?.length > 0 && <p className="text-xs text-muted mt-2">Aus deiner Wissensbibliothek: {m.usedKnowledge.join(', ')}</p>}
                  </>
                )}
              </div>
            ))}
            {pending && <div className="flex items-center gap-2 text-sm text-muted"><Spinner className="size-3.5" /> Junis denkt nach …</div>}
            <InlineError error={error} />
            <div ref={endRef} />
          </div>
        )}
        <form className="sticky bottom-20 lg:bottom-4 bg-canvas pt-2" onSubmit={(e) => { e.preventDefault(); send() }}>
          <div className="rounded-2xl border border-line bg-surface focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/10">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Frag Junis …"
              rows={2}
              disabled={!aiAvailable}
              className="w-full resize-none bg-transparent px-4 pt-3 text-[15px] outline-none"
              aria-label="Nachricht an Junis"
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <span className="text-[11px] text-faint">Enter senden · Shift+Enter neue Zeile · Junis kann sich irren</span>
              <Button type="submit" size="sm" variant="primary" loading={pending} disabled={!input.trim() || !aiAvailable}>Senden</Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}

const MEMORY_KINDS = ['Ziel', 'Interessen', 'Lernweise', 'Häufige Fehler', 'Karriereziel', 'Situation', 'Lernzeit', 'Notiz']

function Memory() {
  const { data, error, loading, reload, hardReload } = useApi('/memory')
  const [f, setF] = useState({ kind: 'Notiz', content: '' })
  const [editing, setEditing] = useState(null)
  const action = useAction()
  const [confirm, dialog] = useConfirm()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Junis Memory" onRetry={hardReload} />
  const add = (e) => {
    e.preventDefault()
    action.run(() => post('/memory', f)).then(() => { setF({ ...f, content: '' }); reload() }).catch(() => {})
  }
  const clear = async () => {
    if (!(await confirm({ title: 'Gesamtes Memory löschen?', text: 'Junis vergisst alle gespeicherten Informationen. Ziele, Skills und Projekte bleiben erhalten.', confirmLabel: 'Alles löschen', danger: true }))) return
    await del('/memory')
    reload()
  }
  return (
    <div className="max-w-3xl">
      {dialog}
      <p className="text-sm text-muted mb-4">Das merkt sich Junis über dich. Du kannst jeden Eintrag bearbeiten oder löschen.</p>
      {!data.active && <Card className="p-4 mb-6 text-sm">Junis Memory wird ab Plus in Gesprächen genutzt. In deinem Tarif werden Einträge gespeichert, aber nicht als Kontext verwendet. <Link to="/billing" className="text-accent hover:underline">Tarife ansehen</Link></Card>}
      <form onSubmit={add} className="flex flex-wrap gap-2 mb-6">
        <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className="h-10 rounded-lg border border-line bg-surface px-3 text-sm" aria-label="Art">
          {MEMORY_KINDS.map((k) => <option key={k}>{k}</option>)}
        </select>
        <Input value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} placeholder="z. B. Ich lerne am besten morgens mit Beispielen" className="flex-1 min-w-48" aria-label="Inhalt" />
        <Button type="submit" disabled={!f.content.trim()} loading={action.pending}>Hinzufügen</Button>
      </form>
      {data.memories.length ? (
        <Card className="divide-y divide-line">
          {data.memories.map((m) => (
            <div key={m.id} className="flex items-start gap-3 px-4 py-3 group">
              <Badge className="mt-0.5">{m.kind}</Badge>
              {editing?.id === m.id ? (
                <form className="flex-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); patch(`/memory/${m.id}`, { content: editing.content }).then(() => { setEditing(null); reload() }) }}>
                  <Input value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className="h-9" autoFocus aria-label="Eintrag bearbeiten" />
                  <Button size="sm" type="submit">Speichern</Button>
                </form>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{m.content}</p>
                    <p className="text-[11px] text-muted">{{ onboarding: 'Aus dem Onboarding', goal: 'Aus deinen Zielen', practice: 'Aus deinen Übungen', user: 'Von dir' }[m.source] ?? m.source} · {relative(m.created_at)}</p>
                  </div>
                  <button onClick={() => setEditing({ id: m.id, content: m.content })} className="text-xs text-muted hover:text-ink sm:opacity-0 group-hover:opacity-100 focus:opacity-100">Bearbeiten</button>
                  <button onClick={() => del(`/memory/${m.id}`).then(reload)} className="text-xs text-faint hover:text-bad sm:opacity-0 group-hover:opacity-100 focus:opacity-100">Löschen</button>
                </>
              )}
            </div>
          ))}
        </Card>
      ) : <EmptyState title="Junis hat sich noch nichts gemerkt." text="Einträge entstehen aus Onboarding, Zielen und wiederkehrenden Fehlern — oder du fügst sie selbst hinzu." />}
      {data.memories.length > 0 && <Button variant="ghost" size="sm" className="mt-4" onClick={clear}>Gesamtes Memory löschen</Button>}
    </div>
  )
}

function Twin() {
  const { data, error, loading, hardReload } = useApi('/twin')
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Dein Junis Twin" onRetry={hardReload} />
  const SkillList = ({ items, empty }) => items.length ? (
    <Card className="divide-y divide-line">
      {items.map((s) => (
        <Link key={s.id} to={`/skills/${s.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-subtle/60">
          <span className="text-sm truncate">{s.name}</span>
          <StatusBadge status={s.status} label={`${s.level} %`} />
        </Link>
      ))}
    </Card>
  ) : <p className="text-sm text-muted">{empty}</p>
  return (
    <div className="max-w-4xl">
      <Card className="p-4 mb-8 text-sm text-ink-2">
        Der Junis Twin ist ein <b>datenbasiertes Modell deines Entwicklungsstands</b> — abgeleitet aus {data.dataPoints} Messpunkten (Übungen und Nachweise).
        Er bildet dich weder vollständig noch objektiv ab: Er kennt nur, was in JunisWorld passiert ist, und kann sich irren.
      </Card>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 mb-10">
        <Stat label="Skills im Graph" value={data.trackedSkills} />
        <Stat label="Verifiziert" value={data.verified} />
        <Stat label="Lektionen" value={data.history.lessons} />
        <Stat label="Übungen" value={data.history.practice} hint={data.history.avgScore != null ? `Ø ${data.history.avgScore} % richtig` : undefined} />
        <Stat label="Projekte & Missions" value={data.history.projects + data.history.missions} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
        <Section title="Stärken"><SkillList items={data.strengths} empty="Noch keine gemessenen Stärken (ab 50 %)." /></Section>
        <Section title="In Entwicklung"><SkillList items={data.developing} empty="Noch keine gemessenen Skills." /></Section>
        <Section title="Braucht Aufmerksamkeit"><SkillList items={data.needsAttention} empty="Nichts Auffälliges." /></Section>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <Section title="Häufige Fehler">
          {data.frequentErrors.length ? <ul className="text-sm space-y-1.5">{data.frequentErrors.map((e, i) => <li key={i}>— {e.content}</li>)}</ul> : <p className="text-sm text-muted">Keine wiederkehrenden Fehler erkannt.</p>}
        </Section>
        <Section title="Ziele">
          {data.goals.length ? data.goals.map((g) => <Link key={g.id} to={`/goals/${g.id}`} className="flex justify-between text-sm py-1 hover:underline"><span>{g.title}</span><span className="tabular-nums text-muted">{g.progress} %</span></Link>) : <p className="text-sm text-muted">Keine aktiven Ziele.</p>}
        </Section>
      </div>
      {data.selfOnly > 0 && <p className="text-sm text-muted">{data.selfOnly} Skill(s) beruhen nur auf Selbsteinschätzung und fließen nicht in das Modell ein.</p>}
    </div>
  )
}
