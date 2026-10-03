import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { post } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import Markdown from './Markdown.jsx'
import { Button, InlineError, Spinner, Textarea, cx } from './ui.jsx'
import { LogoMark } from './Logo.jsx'

const Ctx = createContext(() => {})
export const useJunis = () => useContext(Ctx)

/**
 * Contextual Junis AI panel available on every page.
 * open({ contextType, contextId, label, prompt, autoSend })
 */
export function JunisProvider({ children }) {
  const [ctx, setCtx] = useState(null)
  const open = useCallback((c = {}) => setCtx({ contextType: 'general', ...c, key: Math.random() }), [])
  return (
    <Ctx.Provider value={open}>
      {children}
      {ctx && <JunisPanel key={ctx.key} ctx={ctx} onClose={() => setCtx(null)} />}
    </Ctx.Provider>
  )
}

/** Inline trigger, e.g. „Frag Junis zu diesem Projekt“. */
export function AskJunisButton({ label = 'Frag Junis', size = 'sm', ...ctx }) {
  const open = useJunis()
  return (
    <Button size={size} variant="secondary" onClick={() => open({ label, ...ctx })}>
      <LogoMark className="size-4" /> {label}
    </Button>
  )
}

function JunisPanel({ ctx, onClose }) {
  const { aiAvailable } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState(ctx.prompt || '')
  const [conversationId, setConversationId] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const endRef = useRef(null)
  const sentAuto = useRef(false)

  const send = useCallback(async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || pending) return
    setInput('')
    setError(null)
    setMessages((m) => [...m, { role: 'user', content: msg }])
    setPending(true)
    try {
      const r = await post('/chat', { message: msg, conversationId, contextType: ctx.contextType, contextId: ctx.contextId })
      setConversationId(r.conversationId)
      setMessages((m) => [...m, { role: 'assistant', content: r.reply }])
    } catch (e) {
      setError(e)
      setMessages((m) => m.slice(0, -1))
      setInput(msg)
    } finally {
      setPending(false)
    }
  }, [input, pending, conversationId, ctx])

  useEffect(() => {
    if (ctx.autoSend && ctx.prompt && !sentAuto.current && aiAvailable) {
      sentAuto.current = true
      send(ctx.prompt)
    }
  }, [ctx, aiAvailable, send])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, pending])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/10" onClick={onClose} aria-hidden />
      <aside className="relative w-full sm:w-[440px] h-full bg-surface border-l border-line shadow-2xl flex flex-col fade-in" aria-label="Junis AI">
        <header className="flex items-center justify-between px-5 h-14 border-b border-line shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <LogoMark className="size-5" />
            <span className="font-medium truncate">{ctx.label || 'Junis AI'}</span>
          </div>
          <div className="flex items-center gap-1">
            {conversationId && <Link to={`/junis/${conversationId}`} onClick={onClose} className="text-xs text-muted hover:text-ink px-2">Vollansicht</Link>}
            <button onClick={onClose} className="size-8 rounded-lg hover:bg-subtle text-muted" aria-label="Schließen">✕</button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!aiAvailable && (
            <div className="text-sm text-muted border border-line rounded-lg p-4">
              Junis AI ist auf diesem Server noch nicht eingerichtet. Der Betreiber muss einen Anthropic-API-Schlüssel hinterlegen.
            </div>
          )}
          {aiAvailable && !messages.length && !pending && (
            <p className="text-sm text-muted">Junis kennt deine Ziele, Skills und {ctx.contextType !== 'general' ? 'den Inhalt dieser Seite' : 'deine aktiven Projekte'}. Frag nach Erklärungen, Beispielen oder dem nächsten Schritt.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cx(m.role === 'user' ? 'ml-8 bg-subtle rounded-xl px-3.5 py-2.5 text-sm' : 'text-[14.5px]')}>
              {m.role === 'user' ? <p className="whitespace-pre-wrap">{m.content}</p> : <Markdown>{m.content}</Markdown>}
            </div>
          ))}
          {pending && <div className="flex items-center gap-2 text-sm text-muted"><Spinner className="size-3.5" /> Junis denkt nach …</div>}
          <InlineError error={error} />
          <div ref={endRef} />
        </div>
        <form className="p-4 border-t border-line shrink-0" onSubmit={(e) => { e.preventDefault(); send() }}>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Frag Junis …"
            className="min-h-[72px] resize-none"
            disabled={!aiAvailable}
            aria-label="Nachricht an Junis"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-faint">Junis kann sich irren. Wichtige Aussagen prüfen.</span>
            <Button type="submit" variant="primary" size="sm" loading={pending} disabled={!input.trim() || !aiAvailable}>Senden</Button>
          </div>
        </form>
      </aside>
    </div>
  )
}
