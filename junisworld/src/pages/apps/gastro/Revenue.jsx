import { useState } from 'react'
import { post, del } from '../../../lib/api.js'
import { useApi, useAction } from '../../../lib/hooks.js'
import { Badge, Button, Card, ErrorState, Field, Input, InlineError, Loading, Modal, Section, Select, Stat, useConfirm, useToast } from '../../../components/ui.jsx'
import { useGastro, eur, dayLabel, addDays, parseNum } from './shared.jsx'

const PAY = { bar: 'Bar', karte: 'Karte', sonstiges: 'Sonstiges', unbekannt: 'Unbekannt' }

export default function Revenue() {
  const g = useGastro()
  const toast = useToast()
  const [range, setRange] = useState({ from: addDays(g.today, -6), to: g.today })
  const rev = useApi(`${g.base}/revenue?from=${range.from}&to=${range.to}`, [range.from, range.to])
  const pos = useApi(`${g.base}/pos`)
  const [manual, setManual] = useState(false)
  const [confirm, dialog] = useConfirm()
  const canWrite = g.permissions.revenue.write
  const connect = async () => {
    if (pos.data?.connected && !(await confirm({ title: 'Neues Webhook-Token erzeugen?', text: 'Die bisherige Adresse funktioniert danach nicht mehr — sie muss im Kassensystem ersetzt werden.', confirmLabel: 'Neu erzeugen' }))) return
    post(`${g.base}/pos`, { provider: pos.data?.provider || '' }).then(() => { pos.reload(); toast('Webhook erzeugt.') })
  }
  const disconnect = async () => {
    if (!(await confirm({ title: 'Kasse trennen?', text: 'Die Webhook-Adresse wird ungültig. Bisherige Belege bleiben erhalten.', confirmLabel: 'Trennen', danger: true }))) return
    del(`${g.base}/pos`).then(pos.reload)
  }
  const url = pos.data?.webhookPath ? `${window.location.origin}/api${pos.data.webhookPath.replace(/^\/api/, '')}` : ''
  const d = rev.data
  return (
    <>
      {dialog}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <Field label="Von">{(id) => <Input id={id} type="date" value={range.from} onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })} className="w-40" />}</Field>
        <Field label="Bis">{(id) => <Input id={id} type="date" value={range.to} onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })} className="w-40" />}</Field>
        <div className="flex gap-1 mb-4">
          {[['Heute', 0], ['7 Tage', 6], ['30 Tage', 29]].map(([l, n]) => <Button key={l} size="sm" variant="ghost" onClick={() => setRange({ from: addDays(g.today, -n), to: g.today })}>{l}</Button>)}
        </div>
        <span className="flex-1" />
        {canWrite && <Button className="mb-4" onClick={() => setManual(true)}>Umsatz manuell erfassen</Button>}
      </div>

      {rev.error ? <ErrorState error={rev.error} compact onRetry={rev.hardReload} /> : !d ? <Loading /> : (
        <>
          <Card className="p-5 mb-6 grid grid-cols-2 md:grid-cols-5 gap-6">
            <Stat label="Bruttoumsatz" value={eur(d.gross)} />
            <Stat label="Netto laut Beleg" value={eur(d.net)} hint="nur wenn die Kasse Netto liefert" />
            <Stat label="Belege" value={d.transactions} />
            <Stat label="Ø Bon" value={eur(d.averageTicket)} />
            <Stat label="Trinkgeld" value={eur(d.tips)} />
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8">
            <Section title="Je Tag" className="lg:col-span-2">
              {d.daily.length ? (
                <Card className="divide-y divide-line">
                  {d.daily.map((x) => {
                    const max = Math.max(...d.daily.map((y) => y.gross), 1)
                    return (
                      <div key={x.date} className="flex items-center gap-3 px-4 py-2 text-sm">
                        <span className="w-28 shrink-0">{dayLabel(x.date)}</span>
                        <div className="flex-1 h-2 rounded bg-subtle overflow-hidden"><div className="h-full bg-[#2563EB]" style={{ width: `${(x.gross / max) * 100}%` }} /></div>
                        <span className="tabular-nums w-24 text-right">{eur(x.gross)}</span>
                        <span className="text-xs text-muted w-16 text-right">{x.transactions} Belege</span>
                      </div>
                    )
                  })}
                </Card>
              ) : <p className="text-sm text-muted">Keine Belege im Zeitraum. Es werden keine Umsätze geschätzt.</p>}
            </Section>
            <Section title="Zahlungsarten">
              {d.payments.length ? <Card className="divide-y divide-line">{d.payments.map((p) => <div key={p.payment} className="flex justify-between px-4 py-2 text-sm"><span>{PAY[p.payment] || p.payment}</span><span className="tabular-nums">{eur(p.gross)} · {p.n}</span></div>)}</Card> : <p className="text-sm text-muted">–</p>}
            </Section>
          </div>
          {d.receipts.length > 0 && (
            <Section title="Belege" description="Neueste zuerst (max. 200).">
              <Card className="divide-y divide-line max-h-96 overflow-y-auto">
                {d.receipts.map((x) => (
                  <div key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                    <span className="tabular-nums text-muted w-36">{x.ts.replace('T', ' ').slice(0, 16)}</span>
                    <span className="flex-1 truncate">{x.source === 'manual' ? 'Manuell erfasst' : `Kasse · ${x.external_id}`}</span>
                    <span>{PAY[x.payment] || x.payment || ''}</span>
                    <span className="tabular-nums w-24 text-right">{eur(x.gross)}</span>
                    {canWrite && x.source === 'manual' ? <button onClick={() => del(`${g.base}/receipts/${x.id}`).then(rev.reload)} className="text-xs text-faint hover:text-bad">Löschen</button> : <span className="w-10" />}
                  </div>
                ))}
              </Card>
            </Section>
          )}
        </>
      )}

      <Section title="Kassenanbindung (POS-Webhook)">
        {pos.loading ? <Loading /> : pos.error ? <ErrorState error={pos.error} compact /> : (
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={pos.data.connected ? 'ok' : 'neutral'}>{pos.data.connected ? 'Verbunden' : 'Nicht verbunden'}</Badge>
              {pos.data.connected && <span className="text-sm text-muted">{pos.data.provider} · letzter Beleg: {pos.data.lastSync ? new Date(`${pos.data.lastSync.replace(' ', 'T')}Z`).toLocaleString('de-DE') : 'noch keiner'}</span>}
              <span className="flex-1" />
              {canWrite && <Button size="sm" variant={pos.data.connected ? 'secondary' : 'primary'} onClick={connect}>{pos.data.connected ? 'Token erneuern' : 'Webhook erzeugen'}</Button>}
              {canWrite && pos.data.connected && <Button size="sm" variant="ghost" onClick={disconnect}>Trennen</Button>}
            </div>
            {url && (
              <div className="mt-4 text-sm">
                <p className="font-medium">Webhook-Adresse (vertraulich behandeln)</p>
                <div className="flex gap-2 mt-1"><code className="flex-1 min-w-0 truncate rounded-lg border border-line bg-subtle px-3 py-2 text-xs">{url}</code><Button size="sm" onClick={() => navigator.clipboard?.writeText(url).then(() => toast('Kopiert.'))}>Kopieren</Button></div>
                <p className="text-muted mt-3">Die Kasse sendet je Beleg per <code>POST</code> JSON (oder <code>{'{"receipts":[…]}'}</code> mit bis zu 500 Belegen):</p>
                <pre className="mt-1 rounded-lg border border-line bg-subtle p-3 text-xs overflow-x-auto">{`{ "externalId": "B-10023", "timestamp": "2026-10-02T19:42:00",
  "gross": 53.50, "net": 50.00, "tip": 4.00, "paymentMethod": "karte" }`}</pre>
                <p className="text-xs text-muted mt-2">Doppelt gesendete Belege (gleiche externalId) werden ignoriert. Zeitstempel in Ortszeit des Restaurants. Ob und wie dein Kassensystem Webhooks senden kann, hängt vom Anbieter ab — ggf. über eine Middleware.</p>
              </div>
            )}
          </Card>
        )}
      </Section>
      {manual && <ManualReceipt onClose={() => setManual(false)} onSaved={() => { setManual(false); rev.reload() }} />}
    </>
  )
}

function ManualReceipt({ onClose, onSaved }) {
  const g = useGastro()
  const [f, setF] = useState({ date: g.today, gross: '', net: '', tip: '', payment: 'sonstiges' })
  const { pending, error, run } = useAction()
  const set = (x) => setF((y) => ({ ...y, ...x }))
  return (
    <Modal open onClose={onClose} title="Umsatz manuell erfassen"
      footer={<><Button variant="ghost" onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={pending} disabled={!Number(parseNum(f.gross))} onClick={() => run(() => post(`${g.base}/receipts`, { ...f, gross: parseNum(f.gross), net: parseNum(f.net), tip: parseNum(f.tip) })).then(onSaved).catch(() => {})}>Speichern</Button></>}>
      <p className="text-sm text-muted mb-4">Für Betriebe ohne Kassenanbindung, z. B. Tagesabschluss (Z-Bon) übertragen.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Datum">{(id) => <Input id={id} type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />}</Field>
        <Field label="Zahlungsart">{(id) => <Select id={id} value={f.payment} onChange={(e) => set({ payment: e.target.value })}><option value="bar">Bar</option><option value="karte">Karte</option><option value="sonstiges">Gemischt / Sonstiges</option></Select>}</Field>
        <Field label="Brutto (€)">{(id) => <Input id={id} inputMode="decimal" value={f.gross} onChange={(e) => set({ gross: e.target.value })} />}</Field>
        <Field label="Netto (€)" optional>{(id) => <Input id={id} inputMode="decimal" value={f.net} onChange={(e) => set({ net: e.target.value })} />}</Field>
        <Field label="Trinkgeld (€)" optional>{(id) => <Input id={id} inputMode="decimal" value={f.tip} onChange={(e) => set({ tip: e.target.value })} />}</Field>
      </div>
      <InlineError error={error} />
    </Modal>
  )
}
