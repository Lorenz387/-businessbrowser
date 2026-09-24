import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth, PLAN_NAMES } from '../lib/auth.jsx'
import { get, post } from '../lib/api.js'
import { useJunis } from './AskJunis.jsx'
import Logo, { LogoMark } from './Logo.jsx'
import { cx, Spinner } from './ui.jsx'
import { relative } from '../lib/format.js'

const MAIN_NAV = [
  ['/', 'Home'],
  ['/goals', 'Goals'],
  ['/learn', 'Learn'],
  ['/practice', 'Practice'],
  ['/missions', 'Missions'],
  ['/projects', 'Projects'],
  ['/skills', 'Skills'],
  ['/career', 'Career'],
  ['/knowledge', 'Knowledge'],
  ['/portfolio', 'Portfolio'],
  ['/junis', 'Junis AI'],
]
const MORE_NAV = [
  ['/business', 'Business'],
  ['/marketplace', 'Marketplace'],
  ['/creator', 'Creator'],
]
const BOTTOM_NAV = [
  ['/settings', 'Settings'],
  ['/account', 'Account'],
  ['/billing', 'Billing'],
]
const MOBILE_TABS = [
  ['/', 'Home'],
  ['/learn', 'Learn'],
  ['/practice', 'Practice'],
  ['/projects', 'Projects'],
  ['/junis', 'Junis'],
]

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        cx('relative flex items-center h-8 px-3 rounded-lg text-[14px] transition-colors', isActive ? 'bg-subtle text-ink font-medium' : 'text-ink-2 hover:text-ink hover:bg-subtle/70')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded bg-accent" aria-hidden />}
          {label}
        </>
      )}
    </NavLink>
  )
}

function SideNav({ onNavigate }) {
  const { user } = useAuth()
  return (
    <nav className="flex flex-col h-full" aria-label="Hauptnavigation">
      <div className="space-y-0.5">
        {MAIN_NAV.map(([to, label]) => <NavItem key={to} to={to} label={label} onClick={onNavigate} />)}
      </div>
      <div className="mt-6 pt-4 border-t border-line space-y-0.5">
        {MORE_NAV.filter(([to]) => to !== '/creator' || user?.isCreator).map(([to, label]) => <NavItem key={to} to={to} label={label} onClick={onNavigate} />)}
      </div>
      <div className="mt-auto pt-4 border-t border-line space-y-0.5">
        {BOTTOM_NAV.map(([to, label]) => <NavItem key={to} to={to} label={label} onClick={onNavigate} />)}
      </div>
    </nav>
  )
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ items: [], unread: 0 })
  const ref = useRef(null)
  const navigate = useNavigate()
  const load = useCallback(() => get('/notifications').then(setData).catch(() => {}), [])
  const location = useLocation()
  useEffect(() => { load() }, [load, location.pathname])
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const openItem = async (n) => {
    setOpen(false)
    if (!n.read_at) await post('/notifications/read', { id: n.id }).catch(() => {})
    load()
    if (n.link) navigate(n.link)
  }
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative h-9 px-3 rounded-lg text-sm text-ink-2 hover:bg-subtle"
        aria-label={`Benachrichtigungen${data.unread ? `, ${data.unread} ungelesen` : ''}`}
        aria-expanded={open}
      >
        Mitteilungen
        {data.unread > 0 && <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-accent text-white text-[11px] font-semibold tabular-nums">{data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,380px)] bg-surface border border-line rounded-xl shadow-xl z-40 fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="text-sm font-medium">Mitteilungen</span>
            {data.unread > 0 && <button className="text-xs text-muted hover:text-ink" onClick={() => post('/notifications/read').then(load)}>Alle gelesen</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!data.items.length && <p className="px-4 py-8 text-sm text-muted text-center">Keine Mitteilungen. Junis meldet sich nur, wenn es etwas Relevantes gibt.</p>}
            {data.items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)} className={cx('w-full text-left px-4 py-3 border-b border-line last:border-0 hover:bg-subtle', !n.read_at && 'bg-accent-soft/50')}>
                <p className="text-sm text-ink">{n.title}</p>
                <p className="text-xs text-muted mt-0.5">{relative(n.created_at)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const COMMANDS = [
  { label: 'Neues Ziel', to: '/goals/new', keywords: 'ziel goal erstellen' },
  { label: 'Junis fragen', action: 'junis', keywords: 'ai frage chat' },
  { label: 'Projekt erstellen', to: '/projects?new=1', keywords: 'projekt project' },
  { label: 'Lernpfad öffnen', to: '/learn', keywords: 'lektion lernen learn' },
  { label: 'Übung starten', to: '/practice', keywords: 'quiz üben practice test' },
  { label: 'Skill Graph', to: '/skills', keywords: 'skills fähigkeiten' },
  { label: 'Wochenrückblick', to: '/weekly', keywords: 'woche review' },
  { label: 'Notiz anlegen', to: '/knowledge?new=1', keywords: 'notiz knowledge wissen' },
  { label: 'Dokument hochladen', to: '/knowledge?tab=documents', keywords: 'dokument upload pdf' },
  { label: 'Tarif ändern', to: '/billing', keywords: 'abo billing tarif' },
  { label: 'Einstellungen', to: '/settings', keywords: 'settings einstellungen' },
]

function CommandBar({ open, onClose }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const openJunis = useJunis()
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setResults([])
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const t = setTimeout(() => {
      get(`/search?q=${encodeURIComponent(q.trim())}`).then((r) => setResults(r.results)).catch(() => setResults([])).finally(() => setLoading(false))
    }, 180)
    return () => clearTimeout(t)
  }, [q])

  const cmds = COMMANDS.filter((c) => !q || `${c.label} ${c.keywords}`.toLowerCase().includes(q.toLowerCase()))
  const items = [
    ...cmds.map((c) => ({ kind: 'cmd', label: c.label, run: () => (c.action === 'junis' ? openJunis({ prompt: q && !cmds.length ? q : '' }) : navigate(c.to)) })),
    ...results.map((r) => ({ kind: r.type, label: r.title, subtitle: r.subtitle, run: () => navigate(r.href) })),
  ]
  if (q.trim().length > 3) items.push({ kind: 'Junis', label: `„${q.trim()}“ Junis fragen`, run: () => openJunis({ prompt: q.trim(), autoSend: true }) })

  const choose = (item) => {
    onClose()
    item.run()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-xl bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden fade-in" role="dialog" aria-label="Befehle und Suche">
        <div className="flex items-center gap-3 px-4 border-b border-line">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0) }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
              if (e.key === 'Enter' && items[active]) choose(items[active])
            }}
            placeholder="Suchen oder Befehl eingeben …"
            className="flex-1 h-14 bg-transparent outline-none text-[15px]"
            aria-label="Suchen"
          />
          {loading && <Spinner className="size-4 text-muted" />}
          <kbd className="text-[11px] text-faint border border-line rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-2">
          {items.map((it, i) => (
            <li key={`${it.kind}-${it.label}-${i}`}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(it)}
                className={cx('w-full flex items-center justify-between gap-3 px-4 py-2 text-left text-sm', i === active && 'bg-subtle')}
              >
                <span className="truncate">{it.label}{it.subtitle && <span className="text-muted"> · {it.subtitle}</span>}</span>
                <span className="text-[11px] text-faint shrink-0">{it.kind === 'cmd' ? 'Befehl' : it.kind}</span>
              </button>
            </li>
          ))}
          {!items.length && !loading && <li className="px-4 py-6 text-sm text-muted text-center">Keine Treffer.</li>}
        </ul>
      </div>
    </div>
  )
}

export default function Layout() {
  const { user } = useAuth()
  const [menu, setMenu] = useState(false)
  const [cmd, setCmd] = useState(false)
  const location = useLocation()
  const openJunis = useJunis()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmd((c) => !c)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => setMenu(false), [location.pathname])

  // Apply accessibility preferences.
  useEffect(() => {
    get('/settings').then((s) => {
      const a = s.profile.accessibility || {}
      document.documentElement.classList.toggle('large-text', !!a.largeText)
      document.documentElement.classList.toggle('high-contrast', !!a.highContrast)
      document.documentElement.classList.toggle('reduce-motion', !!a.reduceMotion)
    }).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-surface px-3 py-2 rounded-lg border border-line">Zum Inhalt springen</a>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-line bg-canvas px-3 py-5">
        <Link to="/" className="px-3 mb-6"><Logo small /></Link>
        <SideNav />
      </aside>

      {/* Mobile menu sheet */}
      {menu && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/20" onClick={() => setMenu(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 bg-canvas border-r border-line px-3 py-5 flex flex-col fade-in">
            <div className="flex items-center justify-between px-3 mb-6">
              <Logo small />
              <button onClick={() => setMenu(false)} className="size-8 rounded-lg hover:bg-subtle text-muted" aria-label="Menü schließen">✕</button>
            </div>
            <SideNav onNavigate={() => setMenu(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur border-b border-line">
          <div className="max-w-6xl mx-auto flex items-center gap-2 h-14 px-4 sm:px-6 lg:px-10">
            <button className="lg:hidden h-9 px-2 -ml-2 rounded-lg hover:bg-subtle text-sm" onClick={() => setMenu(true)} aria-label="Menü öffnen">
              <span className="block w-4 h-px bg-ink mb-1" /><span className="block w-4 h-px bg-ink mb-1" /><span className="block w-4 h-px bg-ink" />
            </button>
            <Link to="/" className="lg:hidden"><LogoMark className="size-6" /></Link>
            <button
              onClick={() => setCmd(true)}
              className="flex-1 max-w-md h-9 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 text-sm text-faint hover:border-line-strong"
            >
              <span className="truncate">Suchen oder Befehl …</span>
              <kbd className="hidden sm:inline text-[11px] border border-line rounded px-1.5 py-0.5">Ctrl K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => openJunis()} className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm text-ink-2 hover:bg-subtle">
                <LogoMark className="size-4" /> Junis
              </button>
              <Notifications />
              <Link to="/account" className="hidden sm:flex items-center gap-2 h-9 pl-2 pr-1 rounded-lg hover:bg-subtle" title="Account">
                <span className="text-[11px] text-muted border border-line rounded px-1.5 py-0.5">{PLAN_NAMES[user?.plan] ?? 'Free'}</span>
                <span className="size-7 rounded-full bg-ink text-white text-xs font-semibold flex items-center justify-center">{user?.name?.[0]?.toUpperCase()}</span>
              </Link>
            </div>
          </div>
        </header>
        <main id="main" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 pb-28 lg:pb-16">
          <Outlet />
        </main>
        <footer className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pb-24 lg:pb-8 text-xs text-faint flex flex-wrap gap-x-4 gap-y-1">
          <Link to="/legal/impressum" className="hover:text-ink">Impressum</Link>
          <Link to="/legal/datenschutz" className="hover:text-ink">Datenschutz</Link>
          <Link to="/legal/agb" className="hover:text-ink">AGB</Link>
          <Link to="/legal/cookies" className="hover:text-ink">Cookie-Einstellungen</Link>
          <Link to="/help" className="hover:text-ink">Hilfe</Link>
        </footer>
      </div>

      {/* Mobile tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-line grid grid-cols-5 pb-[env(safe-area-inset-bottom)]" aria-label="Schnellnavigation">
        {MOBILE_TABS.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cx('h-14 flex flex-col items-center justify-center text-[12px] gap-1', isActive ? 'text-ink font-medium' : 'text-muted')}>
            {({ isActive }) => (<><span className={cx('h-0.5 w-5 rounded', isActive ? 'bg-accent' : 'bg-transparent')} />{label}</>)}
          </NavLink>
        ))}
      </nav>

      <CommandBar open={cmd} onClose={() => setCmd(false)} />
    </div>
  )
}
