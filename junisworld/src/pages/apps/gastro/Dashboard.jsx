import { useApi } from '../../../lib/hooks.js'
import { Badge, Button, Card, ErrorState, Loading, Section, Stat } from '../../../components/ui.jsx'
import { useGastro, eur, pct, dayLabel, costTone } from './shared.jsx'

export default function Dashboard() {
  const g = useGastro()
  const { data, error, loading, hardReload } = useApi(`${g.base}/dashboard`)
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Das Dashboard" onRetry={hardReload} />
  const occ = data.tables.seats ? Math.round((data.tables.used / data.tables.seats) * 100) : 0
  const empty = !data.tables.n && !data.counts.dishes && !data.reservations.length
  return (
    <>
      {empty && (
        <Card className="p-5 mb-6">
          <p className="font-medium">Erste Schritte</p>
          <p className="text-sm text-muted mt-1">GastroFlow startet leer. Diese drei Schritte machen das Dashboard aussagekräftig:</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {g.permissions.floor.write && <Button size="sm" onClick={() => g.go('reservations')}>1. Tische anlegen</Button>}
            {g.permissions.kitchen.write && <Button size="sm" onClick={() => g.go('kitchen')}>2. Zutaten & Rezepte erfassen</Button>}
            {g.permissions.kitchen.write && <Button size="sm" onClick={() => g.go('menu')}>3. Speisekarte aufbauen</Button>}
            {g.permissions.revenue.write && <Button size="sm" onClick={() => g.go('revenue')}>Kasse verbinden</Button>}
          </div>
        </Card>
      )}
      <Card className="p-5 mb-6 grid grid-cols-2 md:grid-cols-5 gap-6">
        <Stat label={`Reservierungen ${dayLabel(data.today)}`} value={data.reservations.length} />
        <Stat label="Erwartete Gäste" value={data.expectedGuests} />
        <Stat label="Auslastung jetzt" value={`${occ} %`} hint={`${data.tables.used} / ${data.tables.seats} Plätze`} />
        {data.revenueToday ? <Stat label="Umsatz heute" value={eur(data.revenueToday.gross)} hint={`${data.revenueToday.transactions} Belege`} /> : <Stat label="Gerichte aktiv" value={data.counts.dishes} />}
        <Stat label="Ø Wareneinsatz" value={pct(data.avgFoodCost)} hint="Gerichte mit Rezept" />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
        <Section title="Heute" action={<Button size="sm" variant="ghost" onClick={() => g.go('reservations')}>Reservierungen</Button>}>
          {data.reservations.length ? (
            <Card className="divide-y divide-line">
              {data.reservations.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="tabular-nums font-medium w-12">{r.time}</span>
                  <span className="flex-1 min-w-0 truncate">{r.guest_name} · {r.guests} P.</span>
                  {r.allergies && <Badge tone="warn">Allergien: {r.allergies}</Badge>}
                  {r.status === 'seated' && <Badge tone="warn">Platziert</Badge>}
                </div>
              ))}
            </Card>
          ) : <p className="text-sm text-muted">Keine Reservierungen für heute.</p>}
        </Section>

        <Section title="Nachbestellen" action={g.permissions.kitchen.read && <Button size="sm" variant="ghost" onClick={() => g.go('kitchen')}>Lager</Button>}>
          {data.reorder.length ? (
            <Card className="divide-y divide-line">
              {data.reorder.map((i) => (
                <div key={i.id} className="flex justify-between px-4 py-2.5 text-sm"><span>{i.name}</span><span className="text-bad tabular-nums">{i.stock} {i.unit} <span className="text-muted">(Meldebestand {i.reorder_level})</span></span></div>
              ))}
            </Card>
          ) : <p className="text-sm text-muted">Alle Zutaten über Meldebestand.</p>}
        </Section>

        {data.revenueWeek && (
          <Section title="Umsatz letzte 7 Tage" action={<Button size="sm" variant="ghost" onClick={() => g.go('revenue')}>Details</Button>}>
            <RevenueBars daily={data.revenueWeek.daily} today={data.today} />
            <p className="text-xs text-muted mt-2">Nur tatsächlich erfasste Belege (Kasse oder manuell). Es werden keine Umsätze geschätzt.</p>
          </Section>
        )}

        <Section title="Offenes Feedback" action={g.permissions.floor.read && <Button size="sm" variant="ghost" onClick={() => g.go('feedback')}>Alle</Button>}>
          {data.openFeedback.length ? (
            <Card className="divide-y divide-line">
              {data.openFeedback.map((f) => (
                <div key={f.id} className="px-4 py-2.5 text-sm">
                  <div className="flex justify-between gap-2"><span>{'★'.repeat(f.rating)}<span className="text-faint">{'★'.repeat(5 - f.rating)}</span> {f.guest_name || 'Gast'}</span>{f.status === 'needs_attention' && <Badge tone="bad">Aufmerksamkeit</Badge>}</div>
                  {f.comment && <p className="text-muted mt-0.5 line-clamp-2">{f.comment}</p>}
                </div>
              ))}
            </Card>
          ) : <p className="text-sm text-muted">Kein offenes Feedback.</p>}
        </Section>
      </div>
      {data.avgFoodCost != null && <p className="text-xs text-muted">Wareneinsatz-Ampel: <Badge tone={costTone(data.avgFoodCost)}>{pct(data.avgFoodCost)}</Badge> — übliche Orientierung: bis ca. 30 % gut, darüber prüfen; der passende Wert hängt vom Konzept ab.</p>}
    </>
  )
}

export function RevenueBars({ daily, today }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 6 + i)
    const date = d.toISOString().slice(0, 10)
    return { date, gross: daily.find((x) => x.date === date)?.gross || 0 }
  })
  const max = Math.max(1, ...days.map((d) => d.gross))
  return (
    <div className="grid grid-cols-7 gap-2 items-end h-40" role="img" aria-label="Umsatz je Tag der letzten 7 Tage">
      {days.map((d) => (
        <div key={d.date} className="flex flex-col items-center justify-end h-full gap-1">
          <span className="text-[10.5px] tabular-nums text-muted">{d.gross ? Math.round(d.gross).toLocaleString('de-DE') : ''}</span>
          <div className="w-full rounded-t bg-[#2563EB]" style={{ height: `${Math.max(d.gross ? 4 : 1, (d.gross / max) * 100)}%`, opacity: d.gross ? 1 : 0.15 }} title={`${dayLabel(d.date)}: ${eur(d.gross)}`} />
          <span className="text-[10.5px] text-muted">{dayLabel(d.date, { weekday: 'short' })}</span>
        </div>
      ))}
    </div>
  )
}
