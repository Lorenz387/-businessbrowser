import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, get, post, patch, del } from '../../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../../lib/hooks.js'
import { euro } from '../../lib/format.js'
import { LevelBars } from '../../components/charts.jsx'
import { SkillGapList, useTalentSummary } from '../../components/TalentWidgets.jsx'
import TalentKnowledge from './TalentKnowledge.jsx'
import {
  Badge, Button, Card, Checkbox, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Progress, Section, Segmented, Select,
  Stat, Tabs, Textarea, useConfirm, useToast, cx,
} from '../../components/ui.jsx'

const AVAIL = { available: 'Verfügbar', limited: 'Eingeschränkt', unavailable: 'Nicht verfügbar' }
const APP_STATUS = {
  matched: ['accent', 'Passendes Projekt'], interested: ['accent', 'Interesse gezeigt'], invited: ['warn', 'Eingeladen'], accepted: ['ok', 'Angenommen'],
  declined: ['neutral', 'Abgelehnt'], shortlisted: ['ok', 'Shortlist'], rejected: ['neutral', 'Absage'], hired: ['ok', 'Zusage'],
}
const SOURCE = { verified: ['ok', 'JunisWorld-verifiziert'], task: ['ok', 'Arbeitsprobe bestanden'], interview: ['accent', 'im Interview belegt'], quiz: ['accent', 'Wissens-Check bestanden'], cv: ['neutral', 'laut Lebenslauf'] }
/** Talent moved from /apps/talent into the JunisWorld core at /talent — keep old links (e.g. notifications) working. */
export function LegacyTalentRedirect() {
  const { pathname, search } = useLocation()
  return <Navigate to={pathname.replace(/^\/apps\/talent/, '/talent') + search} replace />
}

const splitList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)

export default function Talent() {
  useDocumentTitle('Talent')
  const [params, setParams] = useSearchParams()
  const side = params.get('side') || 'talent'
  return (
    <>
      <PageHeader title="Talent"
        subtitle="Einmal bewerben, dauerhaft passende Projekte erhalten — mit nachvollziehbarer Bewertung und voller Kontrolle über die eigenen Daten."
        actions={<Segmented value={side} onChange={(v) => setParams({ side: v })} options={[{ value: 'talent', label: 'Für Talente' }, { value: 'company', label: 'Für Unternehmen' }]} />} />
      {side === 'talent' ? <TalentSide params={params} tab={params.get('tab') || 'profile'} setTab={(t) => setParams({ side: 'talent', tab: t })} /> : <CompanySide />}
    </>
  )
}

// ======================= Talent =======================

function TalentSide({ tab, setTab, params }) {
  const { data, error, loading, reload, hardReload } = useApi('/apps/talent/me')
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Dein Talent-Profil" onRetry={hardReload} />
  const p = data.profile
  const iv = data.interview
  const steps = [
    { done: !!p?.headline && p.skills.length > 0, label: 'Profil' },
    { done: iv?.status === 'completed', label: 'Interview' },
    { done: !!p?.in_pool, label: 'Im Pool' },
  ]
  return (
    <>
      <Card className="p-4 mb-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        {steps.map((s, i) => <span key={s.label} className={s.done ? 'text-ok' : 'text-muted'}>{s.done ? '✓' : `${i + 1}.`} {s.label}</span>)}
        <span className="text-muted ml-auto">Unternehmen sehen dich anonym, bis du eine Einladung annimmst.</span>
      </Card>
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'profile', label: 'Profil' },
        { value: 'interview', label: 'Interview' },
        { value: 'knowledge', label: 'Branchenwissen' },
        { value: 'explore', label: 'Projekte entdecken' },
        { value: 'offers', label: 'Angebote', count: data.offers.filter((o) => ['matched', 'invited'].includes(o.status)).length },
        { value: 'demand', label: 'Nachfrage' },
      ]} />
      {tab === 'profile' && <ProfileTab data={data} reload={reload} />}
      {tab === 'interview' && <InterviewTab data={data} reload={reload} />}
      {tab === 'knowledge' && <TalentKnowledge />}
      {tab === 'explore' && <ExploreTab initialQ={params.get('q') || ''} />}
      {tab === 'offers' && <OffersTab offers={data.offers} reload={reload} />}
      {tab === 'demand' && <DemandTab demand={data.demand} profile={p} />}
    </>
  )
}

function ProfileTab({ data, reload }) {
  const toast = useToast()
  const p = data.profile || {}
  const toForm = (x) => ({
    headline: x.headline || '', summary: x.summary || '', location: x.location || '', domains: (x.domains || []).join(', '), languages: (x.languages || []).join(', '),
    skills: x.skills?.length ? x.skills : [{ name: '', years: '' }], experience: x.experience || [], education: x.education || [],
    hourlyRate: x.hourly_rate ?? '', hoursPerWeek: x.hours_per_week ?? '', availability: x.availability || 'available', interests: (x.interests || []).join(', '),
    inPool: !!x.in_pool, shareJunisSkills: x.share_junis_skills !== false,
  })
  const [f, setF] = useState(() => toForm(p))
  const fileRef = useRef(null)
  const save = useAction()
  const cv = useAction()
  const [confirm, dialog] = useConfirm()
  const set = (x) => setF((y) => ({ ...y, ...x }))
  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    cv.run(() => api('/apps/talent/cv', { method: 'POST', form })).then((r) => {
      if (r.extracted) {
        setF((y) => ({ ...y, ...toForm({ ...r.extracted, hourly_rate: y.hourlyRate, hours_per_week: y.hoursPerWeek, availability: y.availability, in_pool: y.inPool }), interests: y.interests }))
        toast('Lebenslauf ausgelesen. Bitte prüfen und speichern.')
      } else toast(r.message)
    }).catch(() => {}).finally(() => { e.target.value = '' })
  }
  const submit = () => save.run(async () => {
    const r = await api('/apps/talent/profile', { method: 'PUT', body: { ...f, domains: splitList(f.domains), languages: splitList(f.languages), interests: splitList(f.interests), skills: f.skills.filter((s) => s.name.trim()) } })
    toast(r.newMatches ? `Gespeichert. ${r.newMatches} neue passende Projekte.` : 'Profil gespeichert.')
    reload()
  }).catch(() => {})
  const removeAll = async () => {
    if (!(await confirm({ title: 'Talent-Daten löschen?', text: 'Profil, Interviews, Bewertungen und alle Bewerbungen werden endgültig gelöscht. Dein JunisWorld-Konto bleibt bestehen.', confirmLabel: 'Alles löschen', danger: true }))) return
    await del('/apps/talent/profile')
    setF(toForm({}))
    reload()
  }
  return (
    <div className="max-w-3xl">
      {dialog}
      <Card className="p-5 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Lebenslauf hochladen</p>
          <p className="text-sm text-muted">{data.aiAvailable ? 'Junis füllt das Profil aus dem PDF vor. Du prüfst alles, bevor es gespeichert wird.' : 'Wird gespeichert; das automatische Auslesen braucht Junis AI.'}</p>
        </div>
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.txt" onChange={onFile} />
        <Button onClick={() => fileRef.current?.click()} loading={cv.pending}>{cv.pending ? 'Wird ausgelesen …' : 'PDF auswählen'}</Button>
        <InlineError error={cv.error} />
      </Card>
      <Section title="Profil">
        <Card className="p-5">
          <Field label="Kurzbeschreibung">{(id) => <Input id={id} value={f.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="z. B. Software-Ingenieurin, 8 Jahre Backend & Machine Learning" />}</Field>
          <Field label="Zusammenfassung" optional>{(id) => <Textarea id={id} value={f.summary} onChange={(e) => set({ summary: e.target.value })} />}</Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="Fachgebiete" hint="Kommagetrennt, z. B. Medizin, Recht, Software Engineering">{(id) => <Input id={id} value={f.domains} onChange={(e) => set({ domains: e.target.value })} />}</Field>
            <Field label="Sprachen" optional>{(id) => <Input id={id} value={f.languages} onChange={(e) => set({ languages: e.target.value })} placeholder="Deutsch, Englisch" />}</Field>
            <Field label="Ort" optional>{(id) => <Input id={id} value={f.location} onChange={(e) => set({ location: e.target.value })} />}</Field>
          </div>
          <Field label="Skills">
            <div className="space-y-2">
              {f.skills.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={s.name} onChange={(e) => set({ skills: f.skills.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder="Skill" aria-label="Skill" />
                  <Input type="number" min={0} value={s.years} onChange={(e) => set({ skills: f.skills.map((x, j) => (j === i ? { ...x, years: e.target.value } : x)) })} className="w-24" placeholder="Jahre" aria-label="Jahre" />
                  <Button variant="ghost" onClick={() => set({ skills: f.skills.filter((_, j) => j !== i) })} aria-label="Skill entfernen">✕</Button>
                </div>
              ))}
              <Button size="sm" onClick={() => set({ skills: [...f.skills, { name: '', years: '' }] })}>Skill hinzufügen</Button>
            </div>
          </Field>
          {f.experience.length > 0 && (
            <Field label="Berufserfahrung (aus dem Lebenslauf)">
              <ul className="text-sm space-y-1.5">{f.experience.map((e, i) => <li key={i}><b>{e.title}</b> · {e.org} <span className="text-muted">({e.from}–{e.to})</span></li>)}</ul>
            </Field>
          )}
        </Card>
      </Section>
      <Section title="Verfügbarkeit & Konditionen">
        <Card className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
            <Field label="Verfügbarkeit">{(id) => <Select id={id} value={f.availability} onChange={(e) => set({ availability: e.target.value })}>{Object.entries(AVAIL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
            <Field label="Stunden pro Woche" optional>{(id) => <Input id={id} type="number" min={1} max={80} value={f.hoursPerWeek} onChange={(e) => set({ hoursPerWeek: e.target.value })} />}</Field>
            <Field label="Stundensatz (EUR)" optional>{(id) => <Input id={id} type="number" min={0} value={f.hourlyRate} onChange={(e) => set({ hourlyRate: e.target.value })} />}</Field>
          </div>
          <Field label="Wofür bist du besonders motiviert?" optional hint="Branchen oder Projektarten, z. B. Medizin-KI, Open Source, Bildung">{(id) => <Input id={id} value={f.interests} onChange={(e) => set({ interests: e.target.value })} />}</Field>
        </Card>
      </Section>
      <Section title="Datenschutz & Sichtbarkeit">
        <Card className="p-5">
          <Checkbox checked={f.inPool} onChange={(v) => set({ inPool: v })} label="In den Talent-Pool aufnehmen" description="Unternehmen können dich für passende Projekte finden — anonym (ohne Name, Kontakt, Lebenslauf), bis du eine Einladung annimmst." />
          <Checkbox checked={f.shareJunisSkills} onChange={(v) => set({ shareJunisSkills: v })} label="JunisWorld-Skill-Nachweise einbeziehen" description="Verifizierte Skills aus Tests und Projekten zählen als „Proof of Skill“ für das Matching." />
          <p className="text-xs text-muted mt-2">Es werden keine Videos oder biometrischen Daten gespeichert. KI-Bewertungen sind Empfehlungen; über Einladungen und Zusagen entscheiden Menschen.</p>
        </Card>
      </Section>
      <InlineError error={save.error} />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={submit} loading={save.pending} disabled={!f.headline.trim()}>Profil speichern</Button>
        {data.profile && <Button variant="ghost" onClick={removeAll}>Alle Talent-Daten löschen</Button>}
      </div>
    </div>
  )
}

function InterviewTab({ data, reload }) {
  const iv = data.interview
  const start = useAction()
  const [current, setCurrent] = useState(iv?.status === 'in_progress' ? iv : null)
  useEffect(() => { setCurrent(iv?.status === 'in_progress' ? iv : null) }, [iv])
  if (current) return <InterviewRunner interview={current} onDone={() => { setCurrent(null); reload() }} />
  const begin = () => start.run(async () => {
    const r = await post('/apps/talent/interview')
    setCurrent(await get(`/apps/talent/interview/${r.id}`))
  }).catch(() => {})
  return (
    <div className="max-w-3xl">
      {iv?.status === 'completed' && <InterviewResult evaluation={iv.evaluation} completedAt={iv.completed_at} />}
      <Card className="p-5 mt-6">
        <p className="font-medium">{iv?.status === 'completed' ? 'Neues Interview' : 'KI-Fachinterview'}</p>
        <p className="text-sm text-muted mt-1">Ca. 20 Minuten, 7 Fragen, individuell auf deinen Werdegang zugeschnitten — inklusive einer Aufgabe, bei der du eine fehlerhafte KI-Antwort aus deinem Fachgebiet prüfst. Du antwortest schriftlich oder per Spracheingabe. Danach erhältst du sofort dein vollständiges Stärken-Schwächen-Profil.</p>
        {!data.aiAvailable && <p className="text-sm text-warn mt-3">Das Interview wird von Junis AI geführt, die auf diesem Server noch nicht eingerichtet ist.</p>}
        <InlineError error={start.error} />
        <Button variant="primary" className="mt-4" onClick={begin} loading={start.pending} disabled={!data.aiAvailable || !data.profile?.headline}>{start.pending ? 'Interview wird vorbereitet …' : 'Interview starten'}</Button>
        {!data.profile?.headline && <p className="text-xs text-muted mt-2">Fülle zuerst dein Profil aus.</p>}
      </Card>
    </div>
  )
}

function useSpeech(onText) {
  const recRef = useRef(null)
  const [listening, setListening] = useState(false)
  const Ctor = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  const toggle = () => {
    if (!Ctor) return
    if (listening) { recRef.current?.stop(); return }
    const rec = new Ctor()
    rec.lang = 'de-DE'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => onText([...e.results].slice(e.resultIndex).map((r) => r[0].transcript).join(' '))
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }
  return { supported: !!Ctor, listening, toggle }
}

function InterviewRunner({ interview, onDone }) {
  const [iv, setIv] = useState(interview)
  const [answer, setAnswer] = useState('')
  const action = useAction()
  const speech = useSpeech((t) => setAnswer((a) => `${a}${a && !a.endsWith(' ') ? ' ' : ''}${t}`))
  const answered = iv.turns.filter((t) => t.a !== null && !t.followUp).length
  const cur = iv.turns[iv.turns.length - 1]
  const send = () => action.run(async () => {
    const r = await post(`/apps/talent/interview/${iv.id}/answer`, { answer })
    setAnswer('')
    setIv(r)
    if (r.status === 'completed') onDone()
  }).catch(() => {})
  return (
    <div className="max-w-3xl">
      <div className="flex justify-between text-sm text-muted mb-2"><span>Frage {Math.min(answered + 1, iv.total)} von {iv.total}{cur.followUp ? ' · Nachfrage' : ''}</span><button className="hover:text-ink" onClick={() => post(`/apps/talent/interview/${iv.id}/abandon`).then(onDone)}>Interview abbrechen</button></div>
      <Progress value={(answered / iv.total) * 100} className="mb-6" />
      {iv.turns.slice(0, -1).map((t, i) => (
        <div key={i} className="mb-4 text-sm"><p className="text-muted">{t.q}</p><p className="mt-1 pl-3 border-l-2 border-line whitespace-pre-wrap">{t.a}</p></div>
      ))}
      <Card className="p-5">
        <p className="font-medium whitespace-pre-wrap">{cur.q}</p>
        <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} className="mt-4 min-h-40" placeholder="Deine Antwort — konkret, mit Beispielen aus deiner Praxis." aria-label="Antwort" disabled={action.pending} />
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {speech.supported && <Button onClick={speech.toggle} disabled={action.pending}>{speech.listening ? '■ Aufnahme beenden' : '● Antwort sprechen'}</Button>}
          <Button variant="primary" className="ml-auto" onClick={send} loading={action.pending} disabled={answer.trim().length < 3}>{action.pending ? (answered + 1 >= iv.total ? 'Wird ausgewertet …' : 'Weiter …') : 'Antwort senden'}</Button>
        </div>
        {speech.supported && <p className="text-xs text-muted mt-2">Spracheingabe nutzt die Spracherkennung deines Browsers (in Chrome z. B. über Google-Server). Es wird nur der Text gespeichert, kein Audio.</p>}
        <InlineError error={action.error} />
      </Card>
    </div>
  )
}

function InterviewResult({ evaluation: e, completedAt }) {
  if (!e) return null
  return (
    <>
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Stat label="Gesamteinschätzung" value={`${e.overall} / 100`} hint={`Interview vom ${new Date(`${completedAt.replace(' ', 'T')}Z`).toLocaleDateString('de-DE')}`} />
          <p className="text-sm text-ink-2 max-w-md">{e.summary}</p>
        </div>
        <div className="mt-5"><LevelBars rows={e.dimensions.map((d) => ({ name: d.name, avg: d.score }))} /></div>
        <p className="text-xs text-muted mt-3">KI-Einschätzung auf Basis deiner Antworten — eine Empfehlung, keine Entscheidung über dich.</p>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Card className="p-5"><p className="font-medium mb-2 text-ok">Stärken</p><ul className="text-sm space-y-1.5">{e.strengths.map((s, i) => <li key={i}>— {s}</li>)}</ul></Card>
        <Card className="p-5"><p className="font-medium mb-2 text-warn">Entwicklungsfelder</p><ul className="text-sm space-y-1.5">{e.weaknesses.map((s, i) => <li key={i}>— {s}</li>)}</ul></Card>
        <Card className="p-5"><p className="font-medium mb-2">Empfehlungen</p><ul className="text-sm space-y-1.5">{e.recommendations.map((s, i) => <li key={i}>— {s}</li>)}</ul></Card>
      </div>
      <details className="mt-4"><summary className="cursor-pointer text-sm text-muted">Begründungen je Dimension</summary>
        <ul className="mt-2 space-y-2 text-sm">{e.dimensions.map((d) => <li key={d.name}><b>{d.name} ({d.score}):</b> {d.evidence}</li>)}</ul>
      </details>
      {e.skills?.length > 0 && <p className="text-sm mt-4">Im Interview belegt: {e.skills.map((s) => `${s.name} (${s.level})`).join(' · ')}</p>}
      <p className="text-sm mt-3"><Link to="/talent?tab=demand" className="text-accent hover:underline">Gefragte Skills, die dir fehlen</Link> · <Link to="/learn" className="text-accent hover:underline">Entwicklungsfelder in Learn trainieren →</Link></p>
    </>
  )
}

function MatchBreakdown({ match }) {
  if (!match?.detail) return null
  const c = match.detail.components
  return (
    <div className="text-xs text-muted mt-2">
      <div className="flex flex-wrap gap-1.5 mb-1">
        {match.detail.skills.map((s) => <Badge key={s.skill} tone={s.source ? SOURCE[s.source][0] : 'bad'}>{s.skill}{s.importance === 'must' ? '*' : ''}: {s.source ? SOURCE[s.source][1] : 'fehlt'}</Badge>)}
      </div>
      Skills {c.skills} · Interview {c.interview} · Fachgebiet {c.domain} · Verfügbarkeit {c.availability} · Satz {c.rate} <span className="text-faint">(* = Pflicht)</span>
    </div>
  )
}

function ExploreTab({ initialQ }) {
  const [type, setType] = useState('')
  const [q, setQ] = useState(initialQ)
  const { data, error, loading, reload, hardReload } = useApi(`/apps/talent/explore?type=${type}&q=${encodeURIComponent(q)}`, [type, q])
  const [interest, setInterest] = useState(null)
  const [motivation, setMotivation] = useState('')
  const action = useAction()
  if (error) return <ErrorState error={error} what="Die Projektliste" onRetry={hardReload} />
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen (Fachgebiet, Skill, Firma) …" className="max-w-sm" aria-label="Suchen" />
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto" aria-label="Projektart">
          <option value="">Alle Projektarten</option>
          {Object.entries(data?.types || {}).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>
      {loading && !data ? <Loading /> : data.projects.length ? data.projects.map((p) => (
        <Card key={p.id} className="p-5 mb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-sm text-muted">{p.company} · {p.typeLabel} · {p.seniorityLabel}{p.rate_max ? ` · bis ${euro(p.rate_max)}/Std.` : ''}{p.hours_per_week ? ` · ${p.hours_per_week} Std./Woche` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              {p.match && <span className="text-sm">Match <b className="tabular-nums">{p.match.score} %</b></span>}
              {p.myStatus ? <Badge tone={APP_STATUS[p.myStatus][0]}>{APP_STATUS[p.myStatus][1]}</Badge> : <Button size="sm" variant="primary" onClick={() => { setInterest(p); setMotivation('') }}>Interesse zeigen</Button>}
            </div>
          </div>
          {p.description && <p className="text-sm text-ink-2 mt-2 line-clamp-3">{p.description}</p>}
          <MatchBreakdown match={p.match} />
        </Card>
      )) : <EmptyState title="Keine offenen Projekte gefunden." text="Sobald Unternehmen Projekte ausschreiben, erscheinen sie hier. Passende Projekte bekommst du zusätzlich automatisch unter „Angebote“." />}
      <Modal open={!!interest} onClose={() => setInterest(null)} title={`Interesse an „${interest?.title}“`}
        footer={<><Button variant="ghost" onClick={() => setInterest(null)}>Abbrechen</Button><Button variant="primary" loading={action.pending} onClick={() => action.run(() => post(`/apps/talent/projects/${interest.id}/interest`, { motivation })).then(() => { setInterest(null); reload() }).catch(() => {})}>Interesse senden</Button></>}>
        <p className="text-sm text-muted mb-3">Das Unternehmen sieht dein anonymes Profil, deine Interview-Einschätzung und diese Nachricht. Name und Kontakt erst, wenn du eine Einladung annimmst.</p>
        <Field label="Warum bist du für dieses Projekt besonders motiviert?" optional>{(id) => <Textarea id={id} value={motivation} onChange={(e) => setMotivation(e.target.value)} />}</Field>
        <InlineError error={action.error} />
      </Modal>
    </>
  )
}

function OffersTab({ offers, reload }) {
  const action = useAction()
  if (!offers.length) return <EmptyState title="Noch keine Angebote." text="Sobald ein Projekt zu deinem Profil passt (Match ab 55 %), erscheint es hier und du bekommst eine Mitteilung. Voraussetzung: Profil, abgeschlossenes Interview, Pool-Freigabe." />
  const respond = (id, decision) => action.run(() => post(`/apps/talent/applications/${id}/respond`, { decision })).then(reload).catch(() => {})
  return (
    <>
      <InlineError error={action.error} />
      {offers.map((o) => (
        <Card key={o.id} className="p-5 mb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{o.title}</p>
              <p className="text-sm text-muted">{o.company} · {o.typeLabel}{o.rate_max ? ` · bis ${euro(o.rate_max)}/Std.` : ''}{o.project_status !== 'open' ? ' · geschlossen' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              {o.score != null && <span className="text-sm">Match <b>{o.score} %</b></span>}
              <Badge tone={APP_STATUS[o.status][0]}>{APP_STATUS[o.status][1]}</Badge>
            </div>
          </div>
          <MatchBreakdown match={{ detail: o.detail }} />
          {o.status === 'invited' && (
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="primary" onClick={() => respond(o.id, 'accept')} loading={action.pending}>Annehmen (Kontakt freigeben)</Button>
              <Button size="sm" variant="ghost" onClick={() => respond(o.id, 'decline')}>Ablehnen</Button>
            </div>
          )}
          {o.status === 'matched' && <p className="text-xs text-muted mt-2">Das Unternehmen sieht dich als anonymen Kandidaten. Du kannst unter „Projekte entdecken“ aktiv Interesse zeigen.</p>}
        </Card>
      ))}
    </>
  )
}

function DemandTab({ demand, profile }) {
  const mine = new Set((profile?.domains || []).map((d) => d.toLowerCase()))
  return (
    <Card className="p-5 max-w-2xl">
      <p className="font-medium mb-1">Offene Projekte nach Fachgebiet</p>
      <p className="text-sm text-muted mb-4">Echte, aktuell offene Ausschreibungen auf dieser Plattform.</p>
      {demand.length ? (
        <div className="space-y-2">
          {demand.map((d) => (
            <div key={d.domain} className="flex justify-between text-sm"><span className={cx(mine.has(d.domain.toLowerCase()) && 'font-semibold text-accent')}>{d.domain}{mine.has(d.domain.toLowerCase()) ? ' (dein Fachgebiet)' : ''}</span><span className="tabular-nums">{d.open}</span></div>
          ))}
        </div>
      ) : <p className="text-sm text-muted">Derzeit keine offenen Projekte.</p>}
      <p className="font-medium mt-6 mb-1">Gefragte Skills, die dir noch fehlen</p>
      <p className="text-sm text-muted mb-2">Was offene Projekte in deinen Fachgebieten verlangen und du noch nicht belegen kannst — direkt im Skill Graph trainierbar.</p>
      <TalentGaps />
    </Card>
  )
}

function TalentGaps() {
  const { data } = useTalentSummary()
  return data ? <SkillGapList gaps={data.skillGaps} /> : null
}

// ======================= Company =======================

function CompanySide() {
  const navigate = useNavigate()
  const { data, error, loading, hardReload } = useApi('/apps/talent/company')
  const [creating, setCreating] = useState(false)
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Deine Ausschreibungen" onRetry={hardReload} />
  if (!data.canWrite) return <EmptyState title="Ausschreibungen verwalten Owner, Admins und Manager." text={`Im Firmenbereich von ${data.workspace?.name || 'deinem Unternehmen'} sehen nur sie Kandidatinnen und Kandidaten — zum Schutz der Bewerberdaten.`} />
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-muted">{data.workspace?.type === 'org' ? `Ausschreibungen von ${data.workspace.name} — sichtbar für Owner, Admins und Manager. ` : ''}{data.poolSize} Talent(e) im Pool. Beschreibe, wen du suchst — Junis strukturiert die Anforderungen und gleicht den Pool ab.</p>
        <Button variant="primary" onClick={() => setCreating(true)}>Projekt ausschreiben</Button>
      </div>
      {data.projects.length ? (
        <Card className="divide-y divide-line">
          {data.projects.map((p) => (
            <Link key={p.id} to={`/talent/projects/${p.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3.5 hover:bg-subtle/60">
              <div className="flex-1 min-w-48"><p className="font-medium">{p.title}</p><p className="text-xs text-muted">{p.company} · {p.typeLabel} · {p.status === 'open' ? 'offen' : 'geschlossen'}</p></div>
              <span className="text-sm text-muted">{(p.counts.matched || 0) + (p.counts.interested || 0)} Kandidaten · {p.counts.invited || 0} eingeladen · {(p.counts.accepted || 0) + (p.counts.shortlisted || 0)} angenommen</span>
            </Link>
          ))}
        </Card>
      ) : <EmptyState title="Noch keine Ausschreibung." text="Beschreibe in eigenen Worten, wen du suchst. Junis erstellt daraus ein Anforderungsprofil und eine bewertete Kandidatenliste." action={<Button variant="primary" onClick={() => setCreating(true)}>Projekt ausschreiben</Button>} />}
      <p className="text-xs text-muted mt-4">KI-Matching und Interview-Bewertungen sind Empfehlungen. Einladungen, Absagen und Zusagen triffst du — Bewerber werden nie automatisch abgelehnt.</p>
      {creating && <ProjectForm data={data} onClose={() => setCreating(false)} onSaved={(id) => navigate(`/talent/projects/${id}`)} />}
    </>
  )
}

function ProjectForm({ data, project, onClose, onSaved }) {
  const src = project || {}
  const [description, setDescription] = useState(src.description || '')
  const [f, setF] = useState({
    company: src.company || '', title: src.title || '', type: src.type || 'freelance', seniority: src.seniority || 'mid', domains: (src.domains || []).join(', '),
    languages: (src.languages || []).join(', '), skills: src.skills?.length ? src.skills : [{ name: '', importance: 'must' }], rateMin: src.rate_min ?? '', rateMax: src.rate_max ?? '', hoursPerWeek: src.hours_per_week ?? '', remote: src.remote ?? true,
  })
  const ai = useAction()
  const save = useAction()
  const set = (x) => setF((y) => ({ ...y, ...x }))
  const applyTemplate = (tid) => {
    const t = data.templates?.find((x) => x.id === tid)
    if (!t) return
    setDescription(t.description)
    set({ title: t.title, type: t.type, seniority: t.seniority, domains: t.domain, skills: t.skills, hoursPerWeek: t.hoursPerWeek ?? '' })
  }
  const structure = () => ai.run(() => post('/apps/talent/company/structure', { description })).then((r) => set({ title: f.title || r.title, type: r.type, seniority: r.seniority, domains: r.domains.join(', '), languages: r.languages.join(', '), skills: r.skills })).catch(() => {})
  const submit = () => save.run(async () => {
    const body = { ...f, description, domains: splitList(f.domains), languages: splitList(f.languages), skills: f.skills.filter((s) => s.name.trim()) }
    if (project) { await patch(`/apps/talent/projects/${project.id}`, body); return project.id }
    return (await post('/apps/talent/company/projects', body)).id
  }).then(onSaved).catch(() => {})
  return (
    <Modal open onClose={onClose} title={project ? 'Ausschreibung bearbeiten' : 'Projekt ausschreiben'} width="max-w-2xl"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" onClick={submit} loading={save.pending} disabled={!f.company.trim() || !f.title.trim()}>{project ? 'Speichern' : 'Ausschreiben & Pool abgleichen'}</Button></>}>
      {!project && data.templates?.length > 0 && (
        <Field label="Vorlage" optional hint="Branchenvorlagen mit typischen Anforderungen — alles danach anpassbar.">
          {(id) => <Select id={id} defaultValue="" onChange={(e) => applyTemplate(e.target.value)}><option value="">Ohne Vorlage</option>{data.templates.map((t) => <option key={t.id} value={t.id}>{t.domain}: {t.title}</option>)}</Select>}
        </Field>
      )}
      <Field label="Wen suchst du? (in eigenen Worten)">{(id) => <Textarea id={id} value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-28" placeholder="z. B. Wir suchen Ärztinnen und Ärzte mit Erfahrung in Innerer Medizin, die 10 Std./Woche KI-Antworten zu Diagnosen auf Richtigkeit prüfen. Englisch nötig, bis 95 €/Std." />}</Field>
      {data.aiAvailable && <Button size="sm" onClick={structure} loading={ai.pending} disabled={description.trim().length < 20}>{ai.pending ? 'Junis strukturiert …' : 'Anforderungen mit Junis ableiten'}</Button>}
      <InlineError error={ai.error} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-4">
        <Field label="Unternehmen">{(id) => <Input id={id} value={f.company} onChange={(e) => set({ company: e.target.value })} />}</Field>
        <Field label="Titel">{(id) => <Input id={id} value={f.title} onChange={(e) => set({ title: e.target.value })} />}</Field>
        <Field label="Art">{(id) => <Select id={id} value={f.type} onChange={(e) => set({ type: e.target.value })}>{Object.entries(data.types).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
        <Field label="Erfahrungsstufe">{(id) => <Select id={id} value={f.seniority} onChange={(e) => set({ seniority: e.target.value })}>{Object.entries(data.seniority).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
        <Field label="Fachgebiete" hint="Kommagetrennt">{(id) => <Input id={id} value={f.domains} onChange={(e) => set({ domains: e.target.value })} />}</Field>
        <Field label="Sprachen" optional>{(id) => <Input id={id} value={f.languages} onChange={(e) => set({ languages: e.target.value })} />}</Field>
      </div>
      <Field label="Skills">
        <div className="space-y-2">
          {f.skills.map((s, i) => (
            <div key={i} className="flex gap-2">
              <Input value={s.name} onChange={(e) => set({ skills: f.skills.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder="Skill" aria-label="Skill" />
              <Select value={s.importance} onChange={(e) => set({ skills: f.skills.map((x, j) => (j === i ? { ...x, importance: e.target.value } : x)) })} className="w-40 shrink-0" aria-label="Wichtigkeit"><option value="must">Pflicht</option><option value="nice">Wünschenswert</option></Select>
              <Button variant="ghost" onClick={() => set({ skills: f.skills.filter((_, j) => j !== i) })} aria-label="Entfernen">✕</Button>
            </div>
          ))}
          <Button size="sm" onClick={() => set({ skills: [...f.skills, { name: '', importance: 'must' }] })}>Skill hinzufügen</Button>
        </div>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Satz ab (EUR/Std.)" optional>{(id) => <Input id={id} type="number" min={0} value={f.rateMin} onChange={(e) => set({ rateMin: e.target.value })} />}</Field>
        <Field label="Satz bis" optional>{(id) => <Input id={id} type="number" min={0} value={f.rateMax} onChange={(e) => set({ rateMax: e.target.value })} />}</Field>
        <Field label="Std./Woche" optional>{(id) => <Input id={id} type="number" min={1} value={f.hoursPerWeek} onChange={(e) => set({ hoursPerWeek: e.target.value })} />}</Field>
      </div>
      <InlineError error={save.error} />
    </Modal>
  )
}

export function TalentProject() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, loading, reload, hardReload } = useApi(`/apps/talent/projects/${id}`)
  const company = useApi('/apps/talent/company')
  useDocumentTitle(data?.title)
  const [editing, setEditing] = useState(false)
  const [invite, setInvite] = useState(null)
  const [message, setMessage] = useState('')
  const action = useAction()
  const [confirm, dialog] = useConfirm()
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Die Ausschreibung" onRetry={hardReload} />
  const setStatus = (appId, status, extra = {}) => action.run(() => patch(`/apps/talent/applications/${appId}`, { status, ...extra })).then(() => { setInvite(null); reload() }).catch(() => {})
  const remove = async () => {
    if (!(await confirm({ title: 'Ausschreibung löschen?', text: 'Die Ausschreibung und alle Kandidaten-Zuordnungen werden gelöscht.', confirmLabel: 'Löschen', danger: true }))) return
    await del(`/apps/talent/projects/${id}`)
    navigate('/talent?side=company')
  }
  return (
    <div className="max-w-5xl">
      {dialog}
      <PageHeader back={{ to: '/talent?side=company', label: 'Ausschreibungen' }} title={data.title} subtitle={`${data.company} · ${data.typeLabel} · ${data.seniorityLabel} · ${data.status === 'open' ? 'offen' : 'geschlossen'}`}
        actions={<>
          <Button onClick={() => setEditing(true)}>Bearbeiten</Button>
          <Button onClick={() => patch(`/apps/talent/projects/${id}`, { status: data.status === 'open' ? 'closed' : 'open' }).then((r) => { toast(r.matches ? `${r.matches} neue Kandidaten gefunden.` : 'Gespeichert.'); reload() })}>{data.status === 'open' ? 'Schließen' : 'Wieder öffnen'}</Button>
          <Button variant="ghost" onClick={remove}>Löschen</Button>
        </>} />
      <Card className="p-4 mb-6 text-sm">
        <p><span className="text-muted">Anforderungen: </span>{data.skills.map((s) => `${s.name}${s.importance === 'must' ? '*' : ''}`).join(', ') || '—'} <span className="text-muted">· Fachgebiete: </span>{data.domains.join(', ') || '—'}</p>
      </Card>
      <InlineError error={action.error} />
      <Section title={`Kandidaten (${data.candidates.length})`} description="Sortiert nach Match. Identität und Kontakt erst nach Annahme deiner Einladung. Entscheidungen triffst du — die Bewertungen sind Empfehlungen.">
        {data.candidates.length ? data.candidates.map((c) => (
          <Card key={c.applicationId} className="p-5 mb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{c.name || c.alias} <span className="text-muted font-normal">· {c.headline}</span></p>
                <p className="text-xs text-muted">{c.domains.join(', ')} · {AVAIL[c.availability]}{c.hoursPerWeek ? `, ${c.hoursPerWeek} Std./Woche` : ''}{c.hourlyRate ? ` · ${euro(c.hourlyRate)}/Std.` : ''}{c.source === 'interest' ? ' · hat selbst Interesse gezeigt' : ''}</p>
                {c.email && <p className="text-sm mt-1"><a href={`mailto:${c.email}`} className="text-accent hover:underline">{c.email}</a>{c.location ? ` · ${c.location}` : ''}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Match <b>{c.score} %</b></span>
                <Badge tone={APP_STATUS[c.status][0]}>{APP_STATUS[c.status][1]}</Badge>
              </div>
            </div>
            <MatchBreakdown match={{ detail: c.detail }} />
            {c.interview && <p className="text-xs text-muted mt-2">Interview: {c.interview.overall}/100 — {c.interview.dimensions.map((d) => `${d.name} ${d.score}`).join(' · ')}</p>}
            {c.verifiedSkills.length > 0 && <p className="text-xs text-ok mt-1">✓ Verifiziert über JunisWorld: {c.verifiedSkills.join(', ')}</p>}
            {c.workSamples?.length > 0 && <p className="text-xs text-ok mt-1">✓ Arbeitsproben: {c.workSamples.map((w) => `${w.task} (${w.score} %)`).filter((x, i, a) => a.indexOf(x) === i).join(', ')}</p>}
            {c.knowledgeChecks?.length > 0 && <p className="text-xs text-muted mt-1">Wissens-Checks bestanden: {c.knowledgeChecks.map((k) => `${k.skill} (${k.score} %)`).join(', ')}</p>}
            {c.motivation && <p className="text-sm mt-2 border-l-2 border-line pl-3">„{c.motivation}“</p>}
            {c.experience?.length > 0 && <ul className="text-sm mt-2">{c.experience.map((e, i) => <li key={i}>{e.title} · {e.org} ({e.from}–{e.to})</li>)}</ul>}
            <div className="flex flex-wrap gap-2 mt-3">
              {['matched', 'interested', 'declined'].includes(c.status) && <Button size="sm" variant="primary" onClick={() => { setInvite(c); setMessage('') }}>Einladen</Button>}
              {c.status === 'accepted' && <Button size="sm" onClick={() => setStatus(c.applicationId, 'shortlisted')}>Auf Shortlist</Button>}
              {['accepted', 'shortlisted'].includes(c.status) && <Button size="sm" variant="primary" onClick={() => setStatus(c.applicationId, 'hired')}>Zusage geben</Button>}
              {!['rejected', 'hired'].includes(c.status) && <Button size="sm" variant="ghost" onClick={() => setStatus(c.applicationId, 'rejected')}>Absage</Button>}
            </div>
          </Card>
        )) : <EmptyState title="Noch keine passenden Kandidaten." text="Sobald Talente mit abgeschlossenem Interview in den Pool kommen und passen (ab 55 %), erscheinen sie hier automatisch." />}
      </Section>
      <Modal open={!!invite} onClose={() => setInvite(null)} title={`${invite?.alias} einladen`}
        footer={<><Button variant="ghost" onClick={() => setInvite(null)}>Abbrechen</Button><Button variant="primary" loading={action.pending} onClick={() => setStatus(invite.applicationId, 'invited', { message })}>Einladung senden</Button></>}>
        <p className="text-sm text-muted mb-3">Das Talent erhält eine Mitteilung. Nimmt es an, siehst du Name, E-Mail und Werdegang.</p>
        <Field label="Nachricht" optional>{(fid) => <Textarea id={fid} value={message} onChange={(e) => setMessage(e.target.value)} />}</Field>
      </Modal>
      {editing && company.data && <ProjectForm data={company.data} project={data} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload() }} />}
    </div>
  )
}

