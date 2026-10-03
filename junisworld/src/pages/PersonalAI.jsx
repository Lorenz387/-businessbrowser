import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { get, post, patch, del, api } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { relative } from '../lib/format.js'
import Markdown from '../components/Markdown.jsx'
import {
  Badge, Button, Card, Checkbox, ErrorState, Field, Input, InlineError, Loading, PageHeader, Section, Select, Spinner, Tabs, Textarea,
  useConfirm, useToast, cx,
} from '../components/ui.jsx'

const TOOL_LABELS = {
  run_command: 'Befehl ausführen',
  read_file: 'Datei lesen',
  write_file: 'Datei schreiben',
  list_directory: 'Ordner auflisten',
  web_fetch: 'Webseite laden',
  remember: 'Merken',
}
const MODE_LABELS = { strict: 'Immer nachfragen', ask: 'Bei Befehlen & Änderungen nachfragen', auto: 'Alles automatisch' }

function LocalBanner({ local, platform }) {
  if (local.enabled) return null
  return (
    <Card className="p-4 mb-4 text-sm">
      <p className="font-medium">Nur Chat-Modus: Befehle, Dateien und Web-Zugriff sind ausgeschaltet.</p>
      {local.reason === 'not_local' ? (
        <p className="text-muted mt-1">Diese Werkzeuge funktionieren nur, wenn du JunisWorld auf demselben Rechner im Browser öffnest (http://localhost). Auf einem Server bleiben sie aus Sicherheitsgründen gesperrt.</p>
      ) : (
        <div className="text-muted mt-1 space-y-1">
          <p>So schaltest du sie auf deinem eigenen PC ein:</p>
          <ol className="list-decimal pl-5 space-y-0.5">
            <li>Im Ordner <code>junisworld</code> eine Datei namens <code>.env</code> anlegen{platform === 'win32' ? ' (z. B. mit dem Editor, beim Speichern „Alle Dateien“ wählen)' : ''}.</li>
            <li>Diese Zeile hineinschreiben: <code>PERSONALAI_TOOLS=on</code></li>
            <li>JunisWorld neu starten (im Terminal Ctrl + C, dann erneut starten).</li>
          </ol>
        </div>
      )}
    </Card>
  )
}

function inputSummary(call) {
  const i = call.input || {}
  if (call.name === 'run_command') return i.command
  if (call.name === 'write_file') return `${i.path}\n\n${String(i.content ?? '').slice(0, 4000)}${String(i.content ?? '').length > 4000 ? '\n…' : ''}`
  if (call.name === 'read_file' || call.name === 'list_directory') return i.path || '.'
  if (call.name === 'web_fetch') return i.url
  if (call.name === 'remember') return i.fact
  return JSON.stringify(i, null, 2)
}

function ToolCard({ call, result, pending, decision, onDecide }) {
  const [open, setOpen] = useState(false)
  const state = result ? (result.denied ? 'denied' : result.isError ? 'error' : 'ok') : pending ? (pending.needsApproval ? 'approval' : 'queued') : 'none'
  return (
    <div className={cx('rounded-lg border text-sm my-2', state === 'approval' ? 'border-warn/40 bg-warn-soft/40' : 'border-line bg-surface')}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="font-medium">{TOOL_LABELS[call.name] ?? call.name}</span>
        {state === 'ok' && <Badge tone="ok">ausgeführt</Badge>}
        {state === 'error' && <Badge tone="bad">Fehler</Badge>}
        {state === 'denied' && <Badge>abgelehnt</Badge>}
        {state === 'approval' && <Badge tone="warn">wartet auf Freigabe</Badge>}
        {state === 'queued' && <Badge>wird mit ausgeführt</Badge>}
        {result && <button onClick={() => setOpen((o) => !o)} className="ml-auto text-xs text-muted hover:text-ink">{open ? 'Ausgabe verbergen' : 'Ausgabe anzeigen'}</button>}
      </div>
      <pre className="mx-3 mb-2 px-3 py-2 rounded-md bg-ink text-[#e2e8f0] text-[12.5px] whitespace-pre-wrap break-words max-h-64 overflow-y-auto font-mono">{inputSummary(call)}</pre>
      {state === 'approval' && (
        <div className="flex gap-2 px-3 pb-3">
          <Button size="sm" variant={decision === 'approve' ? 'primary' : 'secondary'} onClick={() => onDecide(call.id, 'approve')}>Erlauben</Button>
          <Button size="sm" variant={decision === 'deny' ? 'danger' : 'ghost'} onClick={() => onDecide(call.id, 'deny')}>Ablehnen</Button>
        </div>
      )}
      {open && result && <pre className="mx-3 mb-3 px-3 py-2 rounded-md bg-subtle text-[12.5px] whitespace-pre-wrap break-words max-h-80 overflow-y-auto font-mono">{result.output}</pre>}
    </div>
  )
}

export default function PersonalAI() {
  useDocumentTitle('PersonalAI')
  const { id } = useParams()
  const navigate = useNavigate()
  const status = useApi('/agent/status')
  const [conv, setConv] = useState(null)
  const [convError, setConvError] = useState(null)
  const [profileId, setProfileId] = useState(null)
  const [input, setInput] = useState('')
  const [decisions, setDecisions] = useState({})
  const [optimistic, setOptimistic] = useState(null)
  const action = useAction()
  const endRef = useRef(null)
  const [confirm, dialog] = useConfirm()

  useEffect(() => {
    setDecisions({})
    setConvError(null)
    if (!id) { setConv(null); return }
    get(`/agent/conversations/${id}`).then((c) => { setConv(c); if (c.profileId) setProfileId(c.profileId) }).catch(setConvError)
  }, [id])
  useEffect(() => {
    if (!profileId && status.data?.profiles.length) setProfileId(status.data.profiles[0].id)
  }, [status.data, profileId])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [conv, optimistic, action.pending])

  const results = useMemo(() => {
    const map = new Map()
    for (const m of conv?.messages || []) if (m.role === 'tool') for (const r of m.results) map.set(r.id, r)
    return map
  }, [conv])
  const pendingById = useMemo(() => new Map((conv?.pending || []).map((p) => [p.id, p])), [conv])

  if (status.loading) return <Loading />
  if (status.error) return <ErrorState error={status.error} what="PersonalAI" onRetry={status.hardReload} />
  const { local, providers, profiles, conversations, platform } = status.data
  const profile = profiles.find((p) => p.id === profileId) || profiles[0]
  const prov = providers.find((p) => p.id === profile?.provider)
  const model = profile?.model || prov?.defaultModel
  const setupProblem = !prov?.configured ? `Für ${prov?.label} fehlt noch ${prov?.needsKey ? 'ein API-Schlüssel' : 'die API-Adresse'}.` : !model ? 'Im Profil ist noch kein Modell eingetragen.' : null

  const apply = (c) => {
    setConv(c)
    setDecisions({})
    if (!id || String(c.id) !== id) navigate(`/apps/personal-ai/${c.id}`, { replace: !!id })
    status.reload()
  }
  const send = () => {
    const msg = input.trim()
    if (!msg || action.pending) return
    setInput('')
    setOptimistic(msg)
    action.run(() => post('/agent/chat', { message: msg, conversationId: conv?.id, profileId: profile.id }))
      .then(apply)
      .catch(() => setInput(msg))
      .finally(() => setOptimistic(null))
  }
  const approve = (all) => {
    const needs = conv.pending.filter((p) => p.needsApproval)
    const d = all ? Object.fromEntries(needs.map((p) => [p.id, all])) : decisions
    if (!all && needs.some((p) => !d[p.id])) return
    action.run(() => post(`/agent/conversations/${conv.id}/approve`, { decisions: d })).then(apply).catch(() => {})
  }
  const removeConv = async (cid) => {
    if (!(await confirm({ title: 'Gespräch löschen?', text: 'Das Gespräch wird dauerhaft gelöscht. Dateien im Workspace bleiben erhalten.', confirmLabel: 'Löschen', danger: true }))) return
    await del(`/agent/conversations/${cid}`)
    status.reload()
    if (String(cid) === id) navigate('/apps/personal-ai')
  }

  const pendingNeeds = (conv?.pending || []).filter((p) => p.needsApproval)
  const allDecided = pendingNeeds.length > 0 && pendingNeeds.every((p) => decisions[p.id])

  return (
    <div>
      {dialog}
      <PageHeader back={{ to: '/apps', label: 'Apps' }} title="PersonalAI"
        subtitle={<>{prov?.label} · {model || 'kein Modell'} · {MODE_LABELS[profile?.permissionMode]} · {local.enabled ? 'Lokaler Modus aktiv' : 'Nur Chat'}</>}
        actions={<>
          <Select value={profile?.id ?? ''} onChange={(e) => setProfileId(Number(e.target.value))} className="w-auto h-9" aria-label="Profil">
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Button to="/apps/personal-ai/settings">Einstellungen</Button>
        </>} />
      <LocalBanner local={local} platform={platform} />
      {setupProblem && (
        <Card className="p-4 mb-4 text-sm flex flex-wrap items-center justify-between gap-3">
          <span>{setupProblem}</span>
          <Button size="sm" variant="primary" to="/apps/personal-ai/settings">Jetzt einrichten</Button>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-6">
        <aside className="lg:border-r lg:border-line lg:pr-4">
          <Button className="w-full mb-3" to="/apps/personal-ai">Neues Gespräch</Button>
          <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
            {conversations.map((c) => (
              <div key={c.id} className={cx('group flex items-center rounded-lg', String(c.id) === id ? 'bg-subtle' : 'hover:bg-subtle/60')}>
                <Link to={`/apps/personal-ai/${c.id}`} className="flex-1 min-w-0 px-3 py-2">
                  <p className="text-sm truncate">{c.title}</p>
                  <p className="text-[11px] text-muted">{c.status === 'awaiting_approval' ? 'wartet auf Freigabe · ' : ''}{relative(c.updated_at)}</p>
                </Link>
                <button onClick={() => removeConv(c.id)} className="text-xs text-faint hover:text-bad px-2 sm:opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label="Gespräch löschen">✕</button>
              </div>
            ))}
            {!conversations.length && <p className="text-xs text-muted px-3">Noch keine Gespräche.</p>}
          </div>
        </aside>

        <section className="min-w-0 flex flex-col min-h-[60vh]">
          {convError ? <ErrorState error={convError} what="Das Gespräch" compact /> : (
            <div className="flex-1 space-y-5 pb-6">
              {!conv && !optimistic && (
                <div className="pt-4 text-sm text-muted max-w-xl">
                  <p className="text-ink font-medium text-base mb-2">Was soll PersonalAI für dich tun?</p>
                  <p>Beispiele: „Schreib ein Python-Skript, das alle PDFs im Workspace auflistet, und führ es aus.“ · „Erklär mir den Unterschied zwischen Git merge und rebase.“ · „Lies die Datei notizen.txt und fasse sie zusammen.“</p>
                  {local.enabled && <p className="mt-2">Workspace: <code>{profile.workspace}</code></p>}
                </div>
              )}
              {conv?.messages.map((m) => {
                if (m.role === 'user') return <div key={m.id} className="ml-auto max-w-[85%] bg-subtle rounded-2xl px-4 py-3 text-[14.5px] whitespace-pre-wrap w-fit">{m.text}</div>
                if (m.role === 'notice') return <p key={m.id} className={cx('text-sm', m.error ? 'text-bad' : 'text-muted')}>{m.text}</p>
                if (m.role === 'assistant') {
                  return (
                    <div key={m.id} className="max-w-3xl">
                      {m.text && <Markdown>{m.text}</Markdown>}
                      {m.toolCalls?.map((c) => (
                        <ToolCard key={c.id} call={c} result={results.get(c.id)} pending={pendingById.get(c.id)} decision={decisions[c.id]} onDecide={(cid, d) => setDecisions((x) => ({ ...x, [cid]: d }))} />
                      ))}
                      {m.truncated && <p className="text-xs text-warn">Antwort wurde wegen Längenbegrenzung abgeschnitten.</p>}
                    </div>
                  )
                }
                return null
              })}
              {optimistic && <div className="ml-auto max-w-[85%] bg-subtle rounded-2xl px-4 py-3 text-[14.5px] whitespace-pre-wrap w-fit">{optimistic}</div>}
              {conv?.status === 'awaiting_approval' && !action.pending && (
                <Card className="p-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm flex-1">{pendingNeeds.length === 1 ? '1 Aktion wartet auf deine Freigabe.' : `${pendingNeeds.length} Aktionen warten auf deine Freigabe.`}</span>
                  {pendingNeeds.length > 1 && <Button size="sm" onClick={() => approve()} disabled={!allDecided}>Auswahl bestätigen</Button>}
                  {pendingNeeds.length === 1 && <Button size="sm" variant="ghost" onClick={() => approve('deny')}>Ablehnen</Button>}
                  <Button size="sm" variant="primary" onClick={() => approve('approve')}>{pendingNeeds.length === 1 ? 'Erlauben & weiter' : 'Alle erlauben'}</Button>
                </Card>
              )}
              {action.pending && <div className="flex items-center gap-2 text-sm text-muted"><Spinner className="size-3.5" /> PersonalAI arbeitet …</div>}
              <InlineError error={action.error} />
              <div ref={endRef} />
            </div>
          )}
          <form className="sticky bottom-20 lg:bottom-4 bg-canvas pt-2" onSubmit={(e) => { e.preventDefault(); send() }}>
            <div className="rounded-2xl border border-line bg-surface focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/10">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={conv?.status === 'awaiting_approval' ? 'Neue Nachricht (offene Aktionen werden dann nicht ausgeführt) …' : 'Aufgabe oder Frage an PersonalAI …'}
                rows={2}
                className="w-full resize-none bg-transparent px-4 pt-3 text-[15px] outline-none"
                aria-label="Nachricht an PersonalAI"
              />
              <div className="flex items-center justify-between px-3 pb-2.5 gap-2">
                <span className="text-[11px] text-faint">Enter senden · Shift+Enter neue Zeile · Prüfe Befehle vor der Freigabe</span>
                <Button type="submit" size="sm" variant="primary" loading={action.pending} disabled={!input.trim() || !!setupProblem}>Senden</Button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

// ---------------- Settings ----------------

export function PersonalAISettings() {
  useDocumentTitle('PersonalAI · Einstellungen')
  const { data, error, loading, reload, hardReload } = useApi('/agent/status')
  const [tab, setTab] = useState('profiles')
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Die Einstellungen" onRetry={hardReload} />
  return (
    <div className="max-w-3xl">
      <PageHeader back={{ to: '/apps/personal-ai', label: 'PersonalAI' }} title="PersonalAI · Einstellungen" subtitle="Verhalten, Modelle und Rechte — pro Profil umstellbar." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'profiles', label: 'Profile' }, { value: 'providers', label: 'Anbieter & Schlüssel' }]} />
      {tab === 'profiles' && <Profiles data={data} reload={reload} />}
      {tab === 'providers' && <Providers data={data} reload={reload} />}
    </div>
  )
}

function Profiles({ data, reload }) {
  const toast = useToast()
  const [selected, setSelected] = useState(data.profiles[0].id)
  const profile = data.profiles.find((p) => p.id === selected) || data.profiles[0]
  const [f, setF] = useState(profile)
  const action = useAction()
  const [confirm, dialog] = useConfirm()
  useEffect(() => { setF(profile) }, [profile])
  const provider = data.providers.find((p) => p.id === f.provider)

  const save = () => action.run(() => patch(`/agent/profiles/${f.id}`, f)).then(() => { toast('Profil gespeichert.'); reload() }).catch(() => {})
  const create = () => action.run(() => post('/agent/profiles', { name: 'Neues Profil' })).then((r) => { reload(); setSelected(r.id) }).catch(() => {})
  const remove = async () => {
    if (!(await confirm({ title: `Profil „${f.name}“ löschen?`, text: 'Gespräche bleiben erhalten und nutzen danach das Standardprofil.', confirmLabel: 'Löschen', danger: true }))) return
    action.run(() => del(`/agent/profiles/${f.id}`)).then(() => { setSelected(data.profiles.find((p) => p.id !== f.id)?.id); reload() }).catch(() => {})
  }

  return (
    <>
      {dialog}
      <div className="flex flex-wrap gap-2 mb-6">
        <Select value={selected} onChange={(e) => setSelected(Number(e.target.value))} className="w-auto" aria-label="Profil wählen">
          {data.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Button onClick={create}>Neues Profil</Button>
        {data.profiles.length > 1 && <Button variant="ghost" onClick={remove}>Löschen</Button>}
      </div>
      <Section title="Persönlichkeit">
        <Card className="p-5">
          <Field label="Name">{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
          <Field label="Wie soll sich PersonalAI verhalten?" hint="Z. B. Tonfall, Sprache, Fachgebiet, bevorzugte Programmiersprache, Antwortlänge. Hat Vorrang vor den Standardvorgaben.">
            {(id) => <Textarea id={id} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} className="min-h-32" placeholder="Du antwortest knapp. Code bevorzugt in Python mit Kommentaren auf Deutsch." />}
          </Field>
          <p className="text-xs text-muted">PersonalAI passt sich zusätzlich an, indem es sich Dinge merkt (Werkzeug „Merken“). Einträge siehst und löschst du unter <Link to="/junis?tab=memory" className="text-accent hover:underline">Junis AI → Memory</Link>.</p>
        </Card>
      </Section>
      <Section title="Modell">
        <Card className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="Anbieter">{(id) => (
              <Select id={id} value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })}>
                {data.providers.map((p) => <option key={p.id} value={p.id}>{p.label}{p.configured ? '' : ' (nicht eingerichtet)'}</option>)}
              </Select>
            )}</Field>
            <Field label="Modell" hint={provider?.defaultModel ? `Leer lassen für Standard: ${provider.defaultModel}` : 'Exakten Modellnamen des Anbieters eintragen.'}>
              {(id) => <Input id={id} value={f.model ?? ''} onChange={(e) => setF({ ...f, model: e.target.value || null })} placeholder={provider?.defaultModel || 'Modellname'} />}
            </Field>
          </div>
        </Card>
      </Section>
      <Section title="Werkzeuge & Rechte">
        <Card className="p-5">
          {!data.local.enabled && <p className="text-sm text-warn mb-3">Lokaler Modus ist aus: Außer „Merken“ sind die Werkzeuge derzeit gesperrt, egal was hier eingestellt ist.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mb-4">
            {data.tools.map((t) => (
              <Checkbox key={t.id} label={TOOL_LABELS[t.id]} description={{ execute: 'Führt Befehle auf deinem PC aus', write: 'Ändert Dateien', read: 'Nur lesend', memory: 'Speichert Vorlieben' }[t.risk]}
                checked={f.tools.includes(t.id)} onChange={(v) => setF({ ...f, tools: v ? [...f.tools, t.id] : f.tools.filter((x) => x !== t.id) })} />
            ))}
          </div>
          <Field label="Freigaben">
            <div className="space-y-1.5">
              {Object.entries(MODE_LABELS).map(([v, l]) => (
                <label key={v} className={cx('flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer', f.permissionMode === v ? 'border-accent bg-accent-soft' : 'border-line')}>
                  <input type="radio" name="mode" className="mt-1 accent-accent" checked={f.permissionMode === v} onChange={() => setF({ ...f, permissionMode: v })} />
                  <span className="text-sm">
                    <span className="font-medium">{l}</span>
                    <span className="block text-muted text-xs">{{ strict: 'Jede Aktion, auch Lesen, braucht deine Bestätigung.', ask: 'Empfohlen. Lesen läuft automatisch; Befehle und Dateiänderungen brauchen deine Bestätigung.', auto: 'Kein Nachfragen. PersonalAI kann ohne Rückfrage Dateien ändern und Befehle ausführen — nur nutzen, wenn du dem Profil vertraust.' }[v]}</span>
                  </span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Workspace-Ordner" hint="Hier arbeitet PersonalAI. Dateipfade und Befehle starten in diesem Ordner.">{(id) => <Input id={id} value={f.workspace} onChange={(e) => setF({ ...f, workspace: e.target.value })} />}</Field>
          <Checkbox label="Zugriff außerhalb des Workspace erlauben" description="Datei-Werkzeuge dürfen dann auch andere Ordner lesen und schreiben. Befehle können grundsätzlich überall wirken — die Freigabe ist dein Schutz." checked={f.allowOutside} onChange={(v) => setF({ ...f, allowOutside: v })} />
          <Field label="Maximale Schritte pro Auftrag">{(id) => <Input id={id} type="number" min={1} max={100} value={f.maxSteps} onChange={(e) => setF({ ...f, maxSteps: Number(e.target.value) })} className="max-w-28" />}</Field>
        </Card>
      </Section>
      <InlineError error={action.error} />
      <Button variant="primary" onClick={save} loading={action.pending}>Profil speichern</Button>
    </>
  )
}

function Providers({ data, reload }) {
  return (
    <>
      <p className="text-sm text-muted mb-4">Schlüssel werden in der lokalen JunisWorld-Datenbank auf diesem Rechner gespeichert (unverschlüsselt) und nie an den Browser zurückgeschickt. Alternativ kannst du sie in der Datei <code>.env</code> eintragen (<code>ANTHROPIC_API_KEY</code>, <code>OPENAI_API_KEY</code>, <code>GEMINI_API_KEY</code>, <code>XAI_API_KEY</code>). Kosten rechnet jeder Anbieter direkt mit dir ab.</p>
      {data.providers.map((p) => <ProviderCard key={p.id} p={p} reload={reload} />)}
    </>
  )
}

function ProviderCard({ p, reload }) {
  const toast = useToast()
  const [f, setF] = useState({ apiKey: '', baseUrl: p.baseUrl || '', defaultModel: p.defaultModel || '' })
  const action = useAction()
  const save = (extra = {}) => action.run(() => api(`/agent/providers/${p.id}`, { method: 'PUT', body: { ...f, apiKey: f.apiKey || undefined, ...extra } }))
    .then(() => { toast(`${p.label} gespeichert.`); setF((x) => ({ ...x, apiKey: '' })); reload() }).catch(() => {})
  return (
    <Card className="p-5 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <p className="font-medium">{p.label}</p>
        {p.configured ? <Badge tone="ok">eingerichtet</Badge> : <Badge>nicht eingerichtet</Badge>}
        {p.keySource === 'env' && <Badge>Schlüssel aus .env</Badge>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        {p.needsKey !== false && (
          <Field label="API-Schlüssel" hint={p.hasKey ? `Gespeichert (${p.keyHint}). Leer lassen, um ihn zu behalten.` : undefined}>
            {(id) => <Input id={id} type="password" autoComplete="off" value={f.apiKey} onChange={(e) => setF({ ...f, apiKey: e.target.value })} placeholder={p.hasKey ? '••••••••' : 'Schlüssel einfügen'} />}
          </Field>
        )}
        {p.id !== 'anthropic' && (
          <Field label="API-Adresse">{(id) => <Input id={id} value={f.baseUrl} onChange={(e) => setF({ ...f, baseUrl: e.target.value })} placeholder="https://…/v1" />}</Field>
        )}
        <Field label="Standardmodell" hint={p.id === 'anthropic' ? undefined : 'Exakter Modellname laut Anbieter, z. B. aus dessen Modellliste.'}>
          {(id) => <Input id={id} value={f.defaultModel} onChange={(e) => setF({ ...f, defaultModel: e.target.value })} />}
        </Field>
      </div>
      {p.id === 'ollama' && <p className="text-xs text-muted mb-3">Ollama läuft lokal und braucht keinen Schlüssel. Modell vorher mit <code>ollama pull &lt;name&gt;</code> laden. Nicht jedes lokale Modell unterstützt Werkzeuge.</p>}
      <InlineError error={action.error} />
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={() => save()} loading={action.pending}>Speichern</Button>
        {p.keySource === 'app' && <Button size="sm" variant="ghost" onClick={() => save({ clearKey: true })}>Schlüssel entfernen</Button>}
      </div>
    </Card>
  )
}
