import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const cx = (...c) => c.filter(Boolean).join(' ')
export { cx }

// ---------- Buttons ----------

const BTN = {
  primary: 'bg-accent text-white hover:bg-accent-hover border border-accent hover:border-accent-hover',
  secondary: 'bg-surface text-ink border border-line hover:border-line-strong hover:bg-subtle',
  ghost: 'text-ink-2 hover:bg-subtle border border-transparent',
  danger: 'bg-surface text-bad border border-line hover:bg-bad-soft hover:border-bad/30',
}
const SIZE = { sm: 'h-8 px-3 text-[13px] gap-1.5', md: 'h-9 px-3.5 text-sm gap-2', lg: 'h-11 px-5 text-[15px] gap-2' }

export function Button({ variant = 'secondary', size = 'md', loading, disabled, to, href, className, children, type = 'button', ...rest }) {
  const cls = cx(
    'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none select-none',
    BTN[variant], SIZE[size], className,
  )
  const content = (
    <>
      {loading && <Spinner className="size-3.5" />}
      {children}
    </>
  )
  if (to) return <Link to={to} className={cls} {...rest}>{content}</Link>
  if (href) return <a href={href} className={cls} {...rest}>{content}</a>
  return <button type={type} className={cls} disabled={disabled || loading} {...rest}>{content}</button>
}

export function Spinner({ className = 'size-4' }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ---------- Layout primitives ----------

export function Card({ className, children, as: As = 'div', ...rest }) {
  return <As className={cx('bg-surface border border-line rounded-xl', className)} {...rest}>{children}</As>
}

export function Section({ title, action, children, className, description }) {
  return (
    <section className={cx('mb-8', className)}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            {title && <h2 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted">{title}</h2>}
            {description && <p className="text-sm text-muted mt-1">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <header className="mb-8">
      {back && (
        <Link to={back.to} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-3">
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="text-muted mt-1 max-w-2xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

export function Loading({ label = 'Wird geladen …' }) {
  return (
    <div className="flex items-center gap-3 text-muted py-16 justify-center" role="status">
      <Spinner /> <span className="text-sm">{label}</span>
    </div>
  )
}

export function EmptyState({ title, text, action, secondary, className }) {
  return (
    <div className={cx('border border-dashed border-line-strong rounded-xl px-6 py-12 text-center bg-surface/60', className)}>
      <p className="font-medium text-ink">{title}</p>
      {text && <p className="text-sm text-muted mt-1.5 max-w-md mx-auto">{text}</p>}
      {(action || secondary) && <div className="mt-5 flex justify-center gap-2 flex-wrap">{action}{secondary}</div>}
    </div>
  )
}

const UPGRADE_CODES = ['plan_required', 'plan_limit', 'credits_required', 'limit_reached', 'seats_full']

/** Professional error state with retry / back / support options. */
export function ErrorState({ error, what = 'Der Inhalt', onRetry, compact }) {
  const navigate = useNavigate()
  if (!error) return null
  if (error.code === 'plan_required') return <UpgradeNotice message={error.message} />
  const title =
    error.code === 'ai_unavailable' ? 'Junis AI ist noch nicht eingerichtet.'
      : error.code === 'not_found' ? `${what} wurde nicht gefunden.`
        : error.code === 'network' ? 'Keine Verbindung zum Server.'
          : UPGRADE_CODES.includes(error.code) ? 'Limit deines Tarifs erreicht.'
            : `${what} konnte gerade nicht geladen werden.`
  return (
    <div className={cx('border border-line rounded-xl bg-surface', compact ? 'p-4' : 'px-6 py-10 text-center')} role="alert">
      <p className="font-medium text-ink">{title}</p>
      <p className="text-sm text-muted mt-1.5 max-w-lg mx-auto">{error.message}</p>
      <div className={cx('mt-5 flex gap-2 flex-wrap', !compact && 'justify-center')}>
        {onRetry && error.code !== 'not_found' && <Button size="sm" onClick={onRetry}>Erneut versuchen</Button>}
        {UPGRADE_CODES.includes(error.code) && <Button size="sm" variant="primary" to="/billing">Tarife ansehen</Button>}
        {!compact && <Button size="sm" variant="ghost" onClick={() => navigate(-1)}>Zurück</Button>}
        <Button size="sm" variant="ghost" to="/help">Support</Button>
      </div>
    </div>
  )
}

export function InlineError({ error }) {
  if (!error) return null
  return (
    <div className="text-sm text-bad bg-bad-soft border border-bad/20 rounded-lg px-3 py-2 mt-3" role="alert">
      {error.message}
      {UPGRADE_CODES.includes(error.code) && (
        <Link to="/billing" className="underline underline-offset-2 ml-1">Tarife ansehen</Link>
      )}
    </div>
  )
}

export function UpgradeNotice({ message, title = 'In deinem Tarif nicht enthalten' }) {
  return (
    <Card className="px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted mt-1.5 max-w-md mx-auto">{message}</p>
      <div className="mt-5 flex justify-center gap-2">
        <Button variant="primary" to="/billing">Tarife vergleichen</Button>
      </div>
      <p className="text-xs text-faint mt-4">Ein Tarifwechsel ist erst nach deiner ausdrücklichen Bestätigung kostenpflichtig.</p>
    </Card>
  )
}

// ---------- Data display ----------

export function Progress({ value, className, tone = 'accent', label }) {
  const v = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div className={cx('h-1.5 rounded-full bg-subtle overflow-hidden', className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx('h-full rounded-full transition-[width] duration-500', tone === 'ok' ? 'bg-ok' : 'bg-accent')} style={{ width: `${v}%` }} />
    </div>
  )
}

/** Current vs target bar. Self-assessment is shown as a hollow marker, never as progress. */
export function SkillBar({ current = 0, target, self, className }) {
  return (
    <div className={cx('relative h-2 rounded-full bg-subtle', className)}>
      <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${Math.min(100, current)}%` }} />
      {target != null && <div className="absolute -top-1 -bottom-1 w-0.5 bg-ink/70 rounded" style={{ left: `calc(${target}% - 1px)` }} title={`Ziel: ${target} %`} />}
      {self != null && <div className="absolute top-1/2 -translate-y-1/2 size-2.5 rounded-full border-2 border-muted bg-surface" style={{ left: `calc(${self}% - 5px)` }} title={`Selbsteinschätzung: ${self} %`} />}
    </div>
  )
}

const TONES = {
  neutral: 'bg-subtle text-ink-2 border-line',
  accent: 'bg-accent-soft text-accent border-accent/15',
  ok: 'bg-ok-soft text-ok border-ok/15',
  warn: 'bg-warn-soft text-warn border-warn/20',
  bad: 'bg-bad-soft text-bad border-bad/15',
}
export function Badge({ tone = 'neutral', children, className }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11.5px] font-medium leading-none whitespace-nowrap', TONES[tone], className)}>{children}</span>
}

const STATUS_TONE = { verified: 'ok', evidenced: 'accent', self: 'warn', none: 'neutral' }
export function StatusBadge({ status, label }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{status === 'verified' && '✓ '}{label}</Badge>
}

export function Stat({ label, value, hint }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.1em] text-muted font-semibold">{label}</div>
      <div className="text-xl font-semibold mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
    </div>
  )
}

// ---------- Forms ----------

export function Field({ label, hint, children, error, optional }) {
  const id = useId()
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink mb-1.5">
          {label} {optional && <span className="text-faint font-normal">(optional)</span>}
        </label>
      )}
      {typeof children === 'function' ? children(id) : children}
      {hint && !error && <p className="text-xs text-muted mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-bad mt-1.5">{error}</p>}
    </div>
  )
}

const INPUT = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14.5px] text-ink placeholder:text-faint focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent/10 transition-colors'
export const Input = ({ className, ...p }) => <input className={cx(INPUT, 'h-10', className)} {...p} />
export const Textarea = ({ className, ...p }) => <textarea className={cx(INPUT, 'min-h-24 leading-relaxed', className)} {...p} />
export const Select = ({ className, children, ...p }) => <select className={cx(INPUT, 'h-10 pr-8', className)} {...p}>{children}</select>

export function Checkbox({ label, checked, onChange, description }) {
  return (
    <label className="flex items-start gap-3 py-1.5 cursor-pointer">
      <input type="checkbox" className="mt-1 size-4 accent-accent" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="text-sm text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  )
}

export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cx('inline-flex rounded-lg border border-line bg-subtle p-0.5', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('px-3 h-8 text-sm rounded-md transition-colors', value === o.value ? 'bg-surface shadow-sm text-ink font-medium' : 'text-muted hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="border-b border-line mb-6 flex gap-5 overflow-x-auto" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx('pb-2.5 -mb-px text-sm whitespace-nowrap border-b-2 transition-colors', value === t.value ? 'border-ink text-ink font-medium' : 'border-transparent text-muted hover:text-ink')}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 text-faint tabular-nums">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

// ---------- Modal ----------

export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.activeElement
    ref.current?.querySelector('input, textarea, select, button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-ink/25" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cx('relative w-full bg-surface rounded-t-2xl sm:rounded-2xl border border-line shadow-xl fade-in max-h-[92vh] flex flex-col', width)}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink size-8 rounded-lg hover:bg-subtle" aria-label="Schließen">✕</button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line flex justify-end gap-2 flex-wrap">{footer}</div>}
      </div>
    </div>
  )
}

/** Confirm dialog with explicit labels (used for destructive or costly actions). */
export function useConfirm() {
  const [state, setState] = useState(null)
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), [])
  const close = (v) => {
    state?.resolve(v)
    setState(null)
  }
  const dialog = (
    <Modal
      open={!!state}
      onClose={() => close(false)}
      title={state?.title}
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)}>Abbrechen</Button>
          <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{state?.confirmLabel ?? 'Bestätigen'}</Button>
        </>
      }
    >
      <p className="text-sm text-ink-2">{state?.text}</p>
    </Modal>
  )
  return [confirm, dialog]
}

// ---------- Toasts ----------

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((text, tone = 'neutral') => {
    const id = Math.random()
    setItems((x) => [...x, { id, text, tone }])
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 items-end" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx('fade-in rounded-lg border px-4 py-2.5 text-sm shadow-lg max-w-sm bg-surface', t.tone === 'bad' ? 'border-bad/30 text-bad' : 'border-line text-ink')}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
