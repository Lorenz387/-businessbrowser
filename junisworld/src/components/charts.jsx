// Inline-SVG charts. Series colors validated for CVD separation: knowledge #2563EB, practice #D97706.
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDate } from '../lib/format.js'
import { cx } from './ui.jsx'

export const SERIES = { knowledge: '#2563EB', practice: '#D97706' }
const GRID = '#EEEDEB'

/** Skill development over time: knowledge and practical experience (two series, one 0–100 axis). */
export function SkillHistoryChart({ history }) {
  const ref = useRef(null)
  const [hover, setHover] = useState(null)
  const W = 640
  const H = 220
  const P = { l: 34, r: 72, t: 12, b: 28 }
  const pts = useMemo(() => history.map((h) => ({ ...h, t: new Date(`${h.created_at.replace(' ', 'T')}Z`).getTime() })), [history])
  if (pts.length < 2) {
    return <p className="text-sm text-muted">Der Verlauf erscheint, sobald mindestens zwei Messpunkte vorliegen (Übungen, Lektionen, Projekte).</p>
  }
  const t0 = pts[0].t
  const t1 = pts[pts.length - 1].t || t0 + 1
  const x = (t) => P.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - P.l - P.r)
  const y = (v) => P.t + (1 - v / 100) * (H - P.t - P.b)
  const path = (key) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]

  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    pts.forEach((p, i) => { if (Math.abs(x(p.t) - px) < Math.abs(x(pts[best].t) - px)) best = i })
    setHover(best)
  }
  const hp = hover != null ? pts[hover] : null

  return (
    <div>
      <div className="flex gap-4 text-xs text-muted mb-2" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: SERIES.knowledge }} /> Wissen</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: SERIES.practice }} /> Praxis</span>
      </div>
      <div className="relative">
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Verlauf von Wissen und Praxis" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth="1" />
              <text x={P.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#94A3B8">{v}</text>
            </g>
          ))}
          <text x={P.l} y={H - 8} fontSize="11" fill="#94A3B8">{formatDate(pts[0].created_at)}</text>
          <text x={W - P.r} y={H - 8} fontSize="11" fill="#94A3B8" textAnchor="end">{formatDate(last.created_at)}</text>
          {['knowledge', 'practice'].map((k) => (
            <g key={k}>
              <path d={path(k)} fill="none" stroke={SERIES[k]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={x(last.t)} cy={y(last[k])} r="4" fill={SERIES[k]} stroke="#fff" strokeWidth="2" />
            </g>
          ))}
          <text x={x(last.t) + 10} y={y(last.knowledge) + 4} fontSize="11.5" fill="#334155">Wissen {Math.round(last.knowledge)}</text>
          <text x={x(last.t) + 10} y={y(last.practice) + (Math.abs(last.practice - last.knowledge) < 8 ? 16 : 4)} fontSize="11.5" fill="#334155">Praxis {Math.round(last.practice)}</text>
          {hp && (
            <g>
              <line x1={x(hp.t)} x2={x(hp.t)} y1={P.t} y2={H - P.b} stroke="#CBD5E1" strokeWidth="1" />
              {['knowledge', 'practice'].map((k) => <circle key={k} cx={x(hp.t)} cy={y(hp[k])} r="4.5" fill={SERIES[k]} stroke="#fff" strokeWidth="2" />)}
            </g>
          )}
        </svg>
        {hp && (
          <div className="pointer-events-none absolute top-0 bg-surface border border-line rounded-lg shadow-lg px-3 py-2 text-xs" style={{ left: `min(calc(${(x(hp.t) / W) * 100}% + 12px), calc(100% - 170px))` }}>
            <div className="text-muted mb-1">{formatDate(hp.created_at)} · {SOURCE[hp.source] ?? hp.source}</div>
            <div className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: SERIES.knowledge }} />Wissen <b className="ml-auto tabular-nums">{Math.round(hp.knowledge)}</b></div>
            <div className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: SERIES.practice }} />Praxis <b className="ml-auto tabular-nums">{Math.round(hp.practice)}</b></div>
          </div>
        )}
      </div>
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer">Als Tabelle anzeigen</summary>
        <table className="mt-2 w-full text-left">
          <thead><tr className="text-faint"><th className="py-1 font-medium">Datum</th><th className="font-medium">Quelle</th><th className="font-medium">Wissen</th><th className="font-medium">Praxis</th></tr></thead>
          <tbody>{pts.map((p, i) => <tr key={i} className="border-t border-line"><td className="py-1">{formatDate(p.created_at)}</td><td>{SOURCE[p.source] ?? p.source}</td><td className="tabular-nums">{Math.round(p.knowledge)}</td><td className="tabular-nums">{Math.round(p.practice)}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  )
}
const SOURCE = { lesson: 'Lektion', practice: 'Übung', review: 'Wiederholung', project: 'Projekt', mission: 'Mission' }

/** Skill Gap: current measured level vs. required level, one row per skill. */
export function GapBars({ items, linkBase = '/skills/' }) {
  return (
    <div className="space-y-3.5">
      {items.map((s) => (
        <div key={s.skillId} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] sm:grid-cols-[minmax(0,13rem)_1fr_auto] items-center gap-3 group">
          <Link to={`${linkBase}${s.skillId}`} className="text-sm text-ink truncate hover:underline underline-offset-2" title={s.name}>{s.name}</Link>
          <div className="relative h-2.5 rounded bg-subtle" title={`Aktuell ${s.current} % · Ziel ${s.target} %${s.selfLevel != null ? ` · Selbsteinschätzung ${s.selfLevel} %` : ''}`}>
            <div className="absolute inset-y-0 left-0 rounded-r bg-accent" style={{ width: `${Math.min(100, s.current)}%` }} />
            <div className="absolute -top-1 -bottom-1 w-0.5 bg-ink/70 rounded" style={{ left: `calc(${s.target}% - 1px)` }} />
            {s.selfLevel != null && s.current === 0 && (
              <div className="absolute top-1/2 -translate-y-1/2 size-2.5 rounded-full border-2 border-muted bg-surface" style={{ left: `calc(${s.selfLevel}% - 5px)` }} />
            )}
          </div>
          <span className="text-xs tabular-nums text-muted w-16 text-right">{s.current} / {s.target}</span>
        </div>
      ))}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted pt-1">
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-accent" /> gemessener Stand</span>
        <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-ink/70" /> benötigter Stand</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2 border-muted" /> Selbsteinschätzung (zählt nicht als Fortschritt)</span>
      </div>
    </div>
  )
}

/** Horizontal bars for averages (team skills). */
export function LevelBars({ rows, valueKey = 'avg', labelKey = 'name', meta }) {
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r[labelKey]} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] sm:grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3">
          <span className="text-sm truncate" title={r[labelKey]}>{r[labelKey]}</span>
          <div className="h-2.5 rounded bg-subtle" title={`${r[valueKey]} %`}>
            <div className="h-full rounded-r bg-accent" style={{ width: `${r[valueKey]}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted text-right min-w-16">{r[valueKey]} %{meta ? ` · ${meta(r)}` : ''}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Skill dependency graph: layered left→right by prerequisite depth.
 * Node fill intensity encodes measured level; verified skills get a solid ring.
 */
export function SkillGraph({ skills, edges }) {
  const [hover, setHover] = useState(null)
  const layout = useMemo(() => {
    const byId = new Map(skills.map((s) => [s.id, s]))
    const depth = new Map()
    const d = (id, seen = new Set()) => {
      if (depth.has(id)) return depth.get(id)
      if (seen.has(id)) return 0
      seen.add(id)
      const reqs = edges.filter((e) => e.to === id).map((e) => e.from).filter((f) => byId.has(f))
      const v = reqs.length ? 1 + Math.max(...reqs.map((r) => d(r, seen))) : 0
      depth.set(id, v)
      return v
    }
    skills.forEach((s) => d(s.id))
    const cols = new Map()
    for (const s of skills) {
      const c = depth.get(s.id)
      if (!cols.has(c)) cols.set(c, [])
      cols.get(c).push(s)
    }
    for (const list of cols.values()) list.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    const colW = 210
    const rowH = 46
    const maxRows = Math.max(...[...cols.values()].map((l) => l.length))
    const pos = new Map()
    for (const [c, list] of cols) list.forEach((s, i) => pos.set(s.id, { x: 16 + c * colW, y: 16 + i * rowH + ((maxRows - list.length) * rowH) / 2 }))
    return { pos, width: 16 + cols.size * colW, height: 32 + maxRows * rowH }
  }, [skills, edges])

  if (!skills.length) return null
  const related = hover ? new Set([hover, ...edges.filter((e) => e.from === hover || e.to === hover).flatMap((e) => [e.from, e.to])]) : null
  const NW = 180
  const NH = 34
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <svg width={layout.width} height={layout.height} role="img" aria-label="Abhängigkeiten zwischen deinen Skills" className="block">
        {edges.map((e, i) => {
          const a = layout.pos.get(e.from)
          const b = layout.pos.get(e.to)
          if (!a || !b) return null
          const x1 = a.x + NW
          const y1 = a.y + NH / 2
          const x2 = b.x
          const y2 = b.y + NH / 2
          const on = related && related.has(e.from) && related.has(e.to)
          return <path key={i} d={`M${x1},${y1} C${x1 + 30},${y1} ${x2 - 30},${y2} ${x2},${y2}`} fill="none" stroke={on ? '#2563EB' : '#D6D3D1'} strokeWidth={on ? 1.75 : 1} />
        })}
        {skills.map((s) => {
          const p = layout.pos.get(s.id)
          const dim = related && !related.has(s.id)
          return (
            <Link key={s.id} to={`/skills/${s.id}`}>
              <g transform={`translate(${p.x},${p.y})`} opacity={dim ? 0.35 : 1} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
                <title>{`${s.name}: ${s.level} % (${s.statusLabel})`}</title>
                <rect width={NW} height={NH} rx="8" fill="#fff" stroke={s.status === 'verified' ? '#15803D' : '#E7E5E4'} strokeWidth={s.status === 'verified' ? 1.5 : 1} />
                <rect x="1" y={NH - 4} width={Math.max(0, (NW - 2) * (s.level / 100))} height="3" rx="1.5" fill="#2563EB" />
                <text x="10" y="21" fontSize="12.5" fill="#0F172A">{s.name.length > 22 ? `${s.name.slice(0, 21)}…` : s.name}</text>
                <text x={NW - 8} y="21" fontSize="11" fill="#64748B" textAnchor="end">{s.level}</text>
              </g>
            </Link>
          )
        })}
      </svg>
      <p className="text-[11px] text-muted mt-2">Linien zeigen Voraussetzungen (links → rechts). Blauer Balken: gemessener Stand. Grüner Rahmen: verifiziert.</p>
    </div>
  )
}

/** Vertical roadmap used for goals and career paths. */
export function Roadmap({ steps, renderStep }) {
  return (
    <ol className="relative">
      {steps.map((s, i) => (
        <li key={i} className="relative pl-8 pb-6 last:pb-0">
          {i < steps.length - 1 && <span className={cx('absolute left-[7px] top-5 bottom-0 w-px', s.done ? 'bg-accent' : 'bg-line-strong')} aria-hidden />}
          <span className={cx('absolute left-0 top-1 size-[15px] rounded-full border-2', s.done ? 'bg-accent border-accent' : s.current ? 'bg-surface border-accent ring-4 ring-accent/10' : 'bg-surface border-line-strong')} aria-hidden />
          {renderStep(s, i)}
        </li>
      ))}
    </ol>
  )
}
