import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { post, patch, del } from '../../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../../lib/hooks.js'
import { formatDateTime, relative } from '../../lib/format.js'
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Section, Select, Stat, useConfirm, useToast, cx,
} from '../../components/ui.jsx'

const IMPACT_TONE = { critical: 'bad', serious: 'warn', moderate: 'accent', minor: 'neutral' }
const SCHEDULE = { off: 'Nur manuell', daily: 'Täglich', weekly: 'Wöchentlich' }

function ScoreBadge({ score }) {
  if (score == null) return <span className="text-muted">—</span>
  const tone = score >= 90 ? 'text-ok' : score >= 60 ? 'text-warn' : 'text-bad'
  return <span className={cx('font-semibold tabular-nums', tone)}>{score}</span>
}

function Counts({ counts, labels }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {['critical', 'serious', 'moderate', 'minor'].filter((k) => counts?.[k]).map((k) => <Badge key={k} tone={IMPACT_TONE[k]}>{counts[k]} {labels[k]}</Badge>)}
      {!Object.values(counts || {}).some(Boolean) && <Badge tone="ok">Keine automatisch erkennbaren Barrieren</Badge>}
    </span>
  )
}

export function AccessibilityHome() {
  useDocumentTitle('Barrierefreiheit-Scanner')
  const navigate = useNavigate()
  const { data, error, loading, reload, hardReload } = useApi('/apps/a11y/sites')
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ url: '', name: '', maxPages: 10, schedule: 'weekly' })
  const action = useAction()
  useEffect(() => {
    if (!data?.sites.some((s) => s.running)) return
    const t = setInterval(reload, 2000)
    return () => clearInterval(t)
  }, [data, reload])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Der Scanner" onRetry={hardReload} />
  const add = () => action.run(() => post('/apps/a11y/sites', f)).then((r) => navigate(`/apps/accessibility/sites/${r.id}`)).catch(() => {})
  return (
    <>
      <PageHeader back={{ to: '/apps', label: 'Apps' }} title="Barrierefreiheit-Scanner"
        subtitle="Scannt Websites regelmäßig auf Barrieren nach WCAG und liefert zu jedem Fund den passenden Korrektur-Code."
        actions={<Button variant="primary" onClick={() => setAdding(true)}>Website hinzufügen</Button>} />
      <Card className="p-4 mb-6 text-sm text-ink-2">
        Automatische Prüfungen erkennen nur einen Teil der Barrieren (z. B. fehlende Alternativtexte, Beschriftungen, Sprachangaben). Tastaturbedienung, verständliche Inhalte und Kontraste aus CSS-Dateien müssen zusätzlich manuell geprüft werden. Ein gutes Ergebnis hier ist <b>kein Nachweis</b> der Konformität mit WCAG oder dem Barrierefreiheitsstärkungsgesetz.
      </Card>
      {data.sites.length ? (
        <Card className="divide-y divide-line">
          {data.sites.map((s) => (
            <Link key={s.id} to={`/apps/accessibility/sites/${s.id}`} className="flex flex-wrap items-center gap-4 px-4 py-3.5 hover:bg-subtle/60">
              <div className="flex-1 min-w-48">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted truncate">{s.url} · {SCHEDULE[s.schedule]}{s.last_scan_at ? ` · zuletzt ${relative(s.last_scan_at)}` : ''}</p>
              </div>
              {s.running ? <span className="text-sm text-muted">Scan läuft …</span>
                : s.lastScan?.status === 'failed' ? <Badge tone="bad">Scan fehlgeschlagen</Badge>
                  : s.lastScan ? <><Counts counts={s.lastScan.counts} labels={data.impactLabels} /><span className="text-sm">Score <ScoreBadge score={s.lastScan.score} /></span></> : null}
            </Link>
          ))}
        </Card>
      ) : <EmptyState title="Noch keine Website." text="Füge eine Website hinzu — der erste Scan startet sofort." action={<Button variant="primary" onClick={() => setAdding(true)}>Website hinzufügen</Button>} />}
      <Modal open={adding} onClose={() => setAdding(false)} title="Website hinzufügen"
        footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Abbrechen</Button><Button variant="primary" onClick={add} loading={action.pending} disabled={!f.url.trim()}>Hinzufügen & scannen</Button></>}>
        <Field label="Adresse">{(id) => <Input id={id} value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://www.beispiel.de" />}</Field>
        <Field label="Name" optional>{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="z. B. Kundenwebsite Müller GmbH" />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Seiten pro Scan" hint="Max. 25, Unterseiten derselben Domain.">{(id) => <Input id={id} type="number" min={1} max={25} value={f.maxPages} onChange={(e) => setF({ ...f, maxPages: Number(e.target.value) })} />}</Field>
          <Field label="Wiederholung">{(id) => <Select id={id} value={f.schedule} onChange={(e) => setF({ ...f, schedule: e.target.value })}>{Object.entries(SCHEDULE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
        </div>
        <p className="text-xs text-muted">Scanne nur Websites, für die du berechtigt bist. Der Scanner ruft Seiten wie ein normaler Besucher ab.</p>
        <InlineError error={action.error} />
      </Modal>
    </>
  )
}

export function AccessibilitySite() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, loading, reload, hardReload } = useApi(`/apps/a11y/sites/${id}`)
  useDocumentTitle(data?.name)
  const action = useAction()
  const [confirm, dialog] = useConfirm()
  useEffect(() => {
    if (!data?.running) return
    const t = setInterval(reload, 2000)
    return () => clearInterval(t)
  }, [data, reload])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Die Website" onRetry={hardReload} />
  const scan = () => action.run(() => post(`/apps/a11y/sites/${id}/scan`)).then(() => { toast('Scan gestartet.'); reload() }).catch(() => {})
  const remove = async () => {
    if (!(await confirm({ title: 'Website entfernen?', text: 'Alle Scans und Ergebnisse dieser Website werden gelöscht.', confirmLabel: 'Entfernen', danger: true }))) return
    await del(`/apps/a11y/sites/${id}`)
    navigate('/apps/accessibility')
  }
  const done = data.scans.filter((s) => s.status === 'done')
  return (
    <div className="max-w-4xl">
      {dialog}
      <PageHeader back={{ to: '/apps/accessibility', label: 'Scanner' }} title={data.name} subtitle={data.url}
        actions={<>
          <Select value={data.schedule} onChange={(e) => patch(`/apps/a11y/sites/${id}`, { schedule: e.target.value }).then(reload)} className="w-auto h-9" aria-label="Wiederholung">
            {Object.entries(SCHEDULE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <Button variant="primary" onClick={scan} loading={action.pending || data.running} disabled={data.running}>{data.running ? 'Scan läuft …' : 'Jetzt scannen'}</Button>
          <Button variant="ghost" onClick={remove}>Entfernen</Button>
        </>} />
      <InlineError error={action.error} />
      {done.length >= 2 && (
        <Section title="Verlauf">
          <Card className="p-5">
            <div className="flex items-end gap-2 h-28">
              {[...done].reverse().slice(-20).map((s) => (
                <Link key={s.id} to={`/apps/accessibility/scans/${s.id}`} className="flex-1 flex flex-col items-center justify-end h-full group" title={`${formatDateTime(s.finished_at)}: Score ${s.score}`}>
                  <span className="text-[10px] text-muted mb-1 opacity-0 group-hover:opacity-100">{s.score}</span>
                  <span className="w-full max-w-6 rounded-t bg-accent" style={{ height: `${Math.max(4, s.score)}%` }} />
                </Link>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">Score je Scan (0–100, höher ist besser). Eine Näherung aus Anzahl und Schwere der Funde pro Seite.</p>
          </Card>
        </Section>
      )}
      <Section title="Scans">
        {data.scans.length ? (
          <Card className="divide-y divide-line">
            {data.scans.map((s) => (
              <Link key={s.id} to={s.status === 'done' ? `/apps/accessibility/scans/${s.id}` : '#'} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-subtle/60">
                <span className="text-sm flex-1">{formatDateTime(s.started_at)} · {s.pages.length} Seite(n)</span>
                {s.status === 'running' && <span className="text-sm text-muted">läuft …</span>}
                {s.status === 'failed' && <span className="text-sm text-bad">{s.error}</span>}
                {s.status === 'done' && <><span className="text-sm">Score <ScoreBadge score={s.score} /></span></>}
              </Link>
            ))}
          </Card>
        ) : <p className="text-sm text-muted">Noch kein Scan.</p>}
      </Section>
    </div>
  )
}

function IssueCard({ issue, labels }) {
  const [copied, setCopied] = useState(false)
  const copy = () => navigator.clipboard?.writeText(issue.fix).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  return (
    <Card className="p-4 mb-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={IMPACT_TONE[issue.impact]}>{labels[issue.impact]}</Badge>
        <span className="font-medium text-sm">{issue.title}</span>
        <span className="text-xs text-muted">WCAG {issue.wcag}</span>
      </div>
      <p className="text-sm text-ink-2 mt-2">{issue.message}</p>
      {issue.selector && <p className="text-xs text-muted mt-1 font-mono break-all">{issue.selector}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
        {issue.snippet && <div><p className="text-[11px] text-muted mb-1">Gefunden</p><pre className="text-[12px] bg-bad-soft/60 border border-bad/10 rounded-md p-2 whitespace-pre-wrap break-all font-mono">{issue.snippet}</pre></div>}
        {issue.fix && (
          <div>
            <p className="text-[11px] text-muted mb-1 flex justify-between">Korrektur <button onClick={copy} className="text-accent hover:underline">{copied ? 'Kopiert' : 'Kopieren'}</button></p>
            <pre className="text-[12px] bg-ok-soft/70 border border-ok/10 rounded-md p-2 whitespace-pre-wrap break-all font-mono">{issue.fix}</pre>
          </div>
        )}
      </div>
      {issue.help && <p className="text-xs text-muted mt-2">{issue.help} Platzhalter in [eckigen Klammern] durch passenden Inhalt ersetzen.</p>}
    </Card>
  )
}

export function AccessibilityScan() {
  const { scanId } = useParams()
  const { data, error, loading, hardReload } = useApi(`/apps/a11y/scans/${scanId}`)
  useDocumentTitle(data ? `Scan ${data.siteName}` : 'Scan')
  const [impact, setImpact] = useState('')
  const [page, setPage] = useState('')
  const [groupBy, setGroupBy] = useState('rule')
  const issues = useMemo(() => (data?.issues || []).filter((i) => (!impact || i.impact === impact) && (!page || i.page_url === page)), [data, impact, page])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Der Scan" onRetry={hardReload} />
  const groups = new Map()
  for (const i of issues) {
    const k = groupBy === 'rule' ? i.title : i.page_url
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(i)
  }
  return (
    <div className="max-w-5xl">
      <PageHeader back={{ to: `/apps/accessibility/sites/${data.siteId}`, label: data.siteName }} title={`Scan vom ${formatDateTime(data.started_at)}`} subtitle={data.siteUrl}
        actions={<Button href={`/api/apps/a11y/scans/${scanId}/export.csv`}>CSV exportieren</Button>} />
      <Card className="p-5 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
        <Stat label="Score" value={<ScoreBadge score={data.score} />} hint="Näherung, kein Konformitätsnachweis" />
        <Stat label="Funde" value={data.issues.length} />
        <Stat label="Seiten" value={data.pages.length} />
        <Stat label="Seit letztem Scan" value={data.diff ? `+${data.diff.newCount} / −${data.diff.fixedCount}` : '—'} hint={data.diff ? 'neu / behoben' : 'erster Scan'} />
      </Card>
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={impact} onChange={(e) => setImpact(e.target.value)} className="w-auto h-9" aria-label="Schwere">
          <option value="">Alle Schweregrade</option>
          {Object.entries(data.impactLabels).map(([k, l]) => <option key={k} value={k}>{l} ({data.counts[k] || 0})</option>)}
        </Select>
        <Select value={page} onChange={(e) => setPage(e.target.value)} className="w-auto h-9 max-w-xs" aria-label="Seite">
          <option value="">Alle Seiten</option>
          {data.pages.map((p) => <option key={p.url} value={p.url}>{p.url.replace(/^https?:\/\/[^/]+/, '') || '/'} ({p.issues ?? 'Fehler'})</option>)}
        </Select>
        <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="w-auto h-9" aria-label="Gruppierung">
          <option value="rule">Nach Problem</option>
          <option value="page">Nach Seite</option>
        </Select>
      </div>
      {data.pages.some((p) => p.error) && <p className="text-sm text-warn mb-4">Nicht erreichbar: {data.pages.filter((p) => p.error).map((p) => p.url).join(', ')}</p>}
      {issues.length ? [...groups.entries()].map(([k, list], gi) => (
        <details key={k} open={gi < 3} className="mb-4">
          <summary className="cursor-pointer text-sm font-medium py-1">{k} <span className="text-muted font-normal">({list.length})</span></summary>
          <div className="mt-2">{list.slice(0, 50).map((i) => <IssueCard key={i.id} issue={i} labels={data.impactLabels} />)}</div>
          {list.length > 50 && <p className="text-xs text-muted">+ {list.length - 50} weitere (im CSV-Export enthalten)</p>}
        </details>
      )) : <EmptyState title="Keine Funde in dieser Auswahl." text="Denke an manuelle Prüfungen: Tastaturbedienung, Fokus-Reihenfolge, verständliche Sprache, Kontraste aus Stylesheets." />}
    </div>
  )
}
