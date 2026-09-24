import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { post, patch, del } from '../lib/api.js'
import { useApi, useAction, useDocumentTitle } from '../lib/hooks.js'
import { useAuth, PLAN_NAMES } from '../lib/auth.jsx'
import { LEARNING_STYLES, formatDate, euro } from '../lib/format.js'
import { PlanGrid } from './Public.jsx'
import {
  Button, Card, Checkbox, ErrorState, Field, Input, InlineError, Loading, Modal, PageHeader, Section, Select, Segmented, Stat, useConfirm, useToast,
} from '../components/ui.jsx'

export function Settings() {
  useDocumentTitle('Settings')
  const toast = useToast()
  const { setUser } = useAuth()
  const { data, error, loading, hardReload } = useApi('/settings')
  const [f, setF] = useState(null)
  const { pending, error: saveError, run } = useAction()
  useEffect(() => {
    if (data) {
      const p = data.profile
      setF({
        weeklyMinutes: p.weekly_minutes, learningStyle: p.learning_style, explanationLevel: p.explanation_level, language: p.language,
        intensity: p.intensity, difficultyPref: p.difficulty_pref, notifications: p.notifications, accessibility: p.accessibility,
        shareWithOrg: p.share_with_org, isCreator: data.user.isCreator,
      })
    }
  }, [data])
  if (loading || !f) return error ? <ErrorState error={error} what="Deine Einstellungen" onRetry={hardReload} /> : <Loading />
  const set = (p) => setF((x) => ({ ...x, ...p }))
  const save = () => run(async () => {
    const r = await patch('/settings', f)
    setUser(r.user)
    const a = f.accessibility
    document.documentElement.classList.toggle('large-text', !!a.largeText)
    document.documentElement.classList.toggle('high-contrast', !!a.highContrast)
    document.documentElement.classList.toggle('reduce-motion', !!a.reduceMotion)
    toast('Einstellungen gespeichert.')
  }).catch(() => {})

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="So passt Junis Lernen, Erklärungen und Benachrichtigungen an dich an." />
      <Section title="Lernen">
        <Card className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="Lernzeit pro Woche (Minuten)">{(id) => <Input id={id} type="number" min={15} max={3000} value={f.weeklyMinutes} onChange={(e) => set({ weeklyMinutes: Number(e.target.value) })} />}</Field>
            <Field label="Lernintensität">{(id) => <Select id={id} value={f.intensity} onChange={(e) => set({ intensity: e.target.value })}><option value="light">Leicht</option><option value="normal">Normal</option><option value="intensive">Intensiv</option></Select>}</Field>
            <Field label="Lernform">{(id) => <Select id={id} value={f.learningStyle} onChange={(e) => set({ learningStyle: e.target.value })}>{Object.entries(LEARNING_STYLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
            <Field label="Erklärungsniveau">{(id) => <Select id={id} value={f.explanationLevel} onChange={(e) => set({ explanationLevel: e.target.value })}><option value="simple">Einfach</option><option value="normal">Normal</option><option value="expert">Fachlich</option></Select>}</Field>
            <Field label="Schwierigkeitsgrad">{(id) => <Select id={id} value={f.difficultyPref} onChange={(e) => set({ difficultyPref: e.target.value })}><option value="adaptive">Adaptiv (empfohlen)</option><option value="easier">Eher leichter</option><option value="harder">Eher schwerer</option></Select>}</Field>
            <Field label="Sprache">{(id) => <Select id={id} value={f.language} onChange={(e) => set({ language: e.target.value })}><option value="de">Deutsch</option><option value="en">English (Junis-Antworten)</option></Select>}</Field>
          </div>
        </Card>
      </Section>
      <Section title="Benachrichtigungen" description="Junis meldet sich nur bei relevanten Ereignissen.">
        <Card className="p-5">
          {[['reviews', 'Wiederholungen', '„Deine nächste Wiederholung ist bereit.“'], ['projects', 'Projekte & Missions', '„Du hast dein Projekt abgeschlossen.“'], ['skills', 'Skill-Nachweise', '„Dein Skill Python wurde erneut bestätigt.“'], ['weekly', 'Wochenrückblick', 'Hinweis auf deinen Wochenrückblick.']].map(([k, l, d]) => (
            <Checkbox key={k} label={l} description={d} checked={f.notifications[k]} onChange={(v) => set({ notifications: { ...f.notifications, [k]: v } })} />
          ))}
        </Card>
      </Section>
      <Section title="Barrierefreiheit">
        <Card className="p-5">
          <Checkbox label="Größere Schrift" checked={f.accessibility.largeText} onChange={(v) => set({ accessibility: { ...f.accessibility, largeText: v } })} />
          <Checkbox label="Höherer Kontrast" checked={f.accessibility.highContrast} onChange={(v) => set({ accessibility: { ...f.accessibility, highContrast: v } })} />
          <Checkbox label="Animationen reduzieren" checked={f.accessibility.reduceMotion} onChange={(v) => set({ accessibility: { ...f.accessibility, reduceMotion: v } })} />
        </Card>
      </Section>
      <Section title="Privatsphäre & Rollen">
        <Card className="p-5">
          <Checkbox label="Skill-Stand mit meinen Organisationen teilen" description="Nur gemessene Skill-Level (keine Ziele, Notizen, Gespräche oder Projekte). Ohne Zustimmung sehen Manager nur deine Mitgliedschaft." checked={f.shareWithOrg} onChange={(v) => set({ shareWithOrg: v })} />
          <Checkbox label="Creator-Modus" description="Eigene Lernpfade, Missions und Skill Packs erstellen und im Marketplace veröffentlichen." checked={f.isCreator} onChange={(v) => set({ isCreator: v })} />
        </Card>
      </Section>
      <InlineError error={saveError} />
      <Button variant="primary" onClick={save} loading={pending}>Speichern</Button>
    </div>
  )
}

export function Account() {
  useDocumentTitle('Account')
  const toast = useToast()
  const { user, setUser, logout } = useAuth()
  const { data, error, loading, reload, hardReload } = useApi('/settings')
  const [profile, setProfile] = useState(null)
  const [pw, setPw] = useState({ current: '', next: '' })
  const [deleting, setDeleting] = useState(false)
  const [delPw, setDelPw] = useState('')
  const save = useAction()
  const pwAction = useAction()
  const delAction = useAction()
  useEffect(() => {
    if (data) setProfile({ name: data.user.name, accountType: data.user.accountType, age: data.profile.age ?? '', situation: data.profile.situation ?? '', careerGoal: data.profile.career_goal ?? '', interests: data.profile.interests.join(', ') })
  }, [data])
  if (loading || !profile) return error ? <ErrorState error={error} what="Dein Konto" onRetry={hardReload} /> : <Loading />

  const saveProfile = () => save.run(async () => {
    const r = await patch('/settings', { ...profile, age: profile.age || null, interests: profile.interests.split(',').map((x) => x.trim()).filter(Boolean) })
    setUser(r.user)
    toast('Profil gespeichert.')
    reload()
  }).catch(() => {})
  const changePw = () => pwAction.run(async () => {
    await post('/auth/password', pw)
    setPw({ current: '', next: '' })
    toast('Passwort geändert. Andere Geräte wurden abgemeldet.')
  }).catch(() => {})
  const removeAccount = () => delAction.run(async () => {
    await del('/account', { password: delPw })
    await logout()
  }).catch(() => {})

  return (
    <div className="max-w-2xl">
      <PageHeader title="Account" subtitle={`${user.email} · Mitglied seit ${formatDate(user.createdAt)}`} actions={<Button onClick={logout}>Abmelden</Button>} />
      <Section title="Profil">
        <Card className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="Name">{(id) => <Input id={id} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />}</Field>
            <Field label="Alter" optional>{(id) => <Input id={id} type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value })} />}</Field>
            <Field label="Kontotyp">{(id) => <Select id={id} value={profile.accountType} onChange={(e) => setProfile({ ...profile, accountType: e.target.value })}><option value="individual">Privat</option><option value="student">Schüler/in / Student/in</option><option value="professional">Berufstätig</option></Select>}</Field>
            <Field label="Karriereziel" optional>{(id) => <Input id={id} value={profile.careerGoal} onChange={(e) => setProfile({ ...profile, careerGoal: e.target.value })} />}</Field>
          </div>
          <Field label="Situation" optional>{(id) => <Input id={id} value={profile.situation} onChange={(e) => setProfile({ ...profile, situation: e.target.value })} />}</Field>
          <Field label="Interessen" optional hint="Kommagetrennt.">{(id) => <Input id={id} value={profile.interests} onChange={(e) => setProfile({ ...profile, interests: e.target.value })} />}</Field>
          <InlineError error={save.error} />
          <Button variant="primary" onClick={saveProfile} loading={save.pending}>Profil speichern</Button>
        </Card>
      </Section>
      <Section title="Passwort">
        <Card className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="Aktuelles Passwort">{(id) => <Input id={id} type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />}</Field>
            <Field label="Neues Passwort" hint="Mindestens 10 Zeichen.">{(id) => <Input id={id} type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />}</Field>
          </div>
          <InlineError error={pwAction.error} />
          <Button onClick={changePw} loading={pwAction.pending} disabled={!pw.current || pw.next.length < 10}>Passwort ändern</Button>
        </Card>
      </Section>
      <Section title="Deine Daten">
        <Card className="p-5">
          <p className="text-sm text-muted mb-4">Exportiere alle Daten, die JunisWorld über dich speichert (JSON), oder lösche dein Konto vollständig.</p>
          <div className="flex flex-wrap gap-2">
            <Button href="/api/account/export">Daten exportieren</Button>
            <Button to="/junis?tab=memory" variant="ghost">Memory verwalten</Button>
            <Button to="/junis?tab=twin" variant="ghost">Junis Twin ansehen</Button>
            <Button variant="danger" onClick={() => setDeleting(true)}>Konto löschen</Button>
          </div>
        </Card>
      </Section>
      <Modal open={deleting} onClose={() => setDeleting(false)} title="Konto endgültig löschen"
        footer={<><Button variant="ghost" onClick={() => setDeleting(false)}>Abbrechen</Button><Button variant="danger" onClick={removeAccount} loading={delAction.pending} disabled={!delPw}>Endgültig löschen</Button></>}>
        <p className="text-sm text-ink-2 mb-4">Alle Ziele, Skills, Nachweise, Projekte, Dokumente, Notizen und Gespräche werden unwiderruflich gelöscht. Ein aktives Abonnement wird sofort gekündigt.</p>
        <Field label="Passwort zur Bestätigung">{(id) => <Input id={id} type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} />}</Field>
        <InlineError error={delAction.error} />
      </Modal>
    </div>
  )
}

export function Billing() {
  useDocumentTitle('Billing')
  const toast = useToast()
  const [params] = useSearchParams()
  const { refresh } = useAuth()
  const { data, error, loading, reload, hardReload } = useApi('/billing')
  const [cycle, setCycle] = useState('monthly')
  const [target, setTarget] = useState(null)
  const action = useAction()
  const [confirm, dialog] = useConfirm()
  useEffect(() => {
    if (params.get('checkout') === 'success') { toast('Zahlung abgeschlossen. Dein Tarif wird aktualisiert, sobald die Bestätigung von Stripe eingeht.'); refresh() }
    if (params.get('checkout') === 'cancelled') toast('Der Bezahlvorgang wurde abgebrochen. Es wurden keine Kosten verursacht.')
  }, [params, toast, refresh])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} what="Deine Abrechnung" onRetry={hardReload} />
  const sub = data.subscription
  const current = data.plans.find((p) => p.id === sub.plan)
  const effective = data.plans.find((p) => p.id === data.effectivePlan)

  const checkout = () => action.run(async () => {
    const r = await post('/billing/checkout', { plan: target.id, cycle })
    window.location.href = r.url
  }).catch(() => {})
  const cancel = async () => {
    if (!(await confirm({ title: 'Abonnement kündigen?', text: sub.currentPeriodEnd ? `Dein Tarif ${current.name} bleibt bis ${formatDate(sub.currentPeriodEnd)} aktiv. Danach wechselst du automatisch zu Free. Deine Daten bleiben erhalten.` : 'Du wechselst zu Free. Deine Daten bleiben erhalten; Funktionen außerhalb von Free sind danach nicht mehr verfügbar.', confirmLabel: 'Kündigen', danger: true }))) return
    action.run(() => post('/billing/cancel')).then(() => { toast('Kündigung vorgemerkt.'); reload(); refresh() }).catch(() => {})
  }
  const portal = () => action.run(async () => { const r = await post('/billing/portal'); window.location.href = r.url }).catch(() => {})

  return (
    <div className="max-w-5xl">
      {dialog}
      <PageHeader title="Billing" subtitle="Dein Tarif, Nutzung und Abrechnung — ohne versteckte Kosten." />
      {!data.stripeConfigured && (
        <Card className="p-4 mb-6 text-sm text-ink-2">Die Zahlungsabwicklung ist auf diesem Server noch nicht eingerichtet. Kostenpflichtige Tarife können derzeit nicht gebucht werden; es entstehen keine Kosten.</Card>
      )}
      <Section title="Aktueller Tarif">
        <Card className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <Stat label="Tarif" value={current.name} hint={data.viaOrganization ? `Effektiv: ${PLAN_NAMES[data.viaOrganization]} über deine Organisation` : undefined} />
            <Stat label="Preis" value={current.monthly === 0 ? euro(0) : euro(sub.billingCycle === 'yearly' ? current.yearly : current.monthly)} hint={current.monthly === 0 ? 'kostenlos' : sub.billingCycle === 'yearly' ? 'pro Jahr' : 'pro Monat'} />
            <Stat label="Abrechnung" value={current.monthly === 0 ? '—' : sub.billingCycle === 'yearly' ? 'Jährlich' : 'Monatlich'} />
            <Stat label={sub.cancelAtPeriodEnd ? 'Endet am' : 'Nächste Abrechnung'} value={sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : '—'} />
          </div>
          {sub.cancelAtPeriodEnd && <p className="text-sm text-warn mt-4">Gekündigt — dein Tarif bleibt bis zum Ende des Abrechnungszeitraums aktiv. <button className="underline" onClick={() => post('/billing/resume').then(reload)}>Kündigung zurücknehmen</button></p>}
          {(sub.managedByStripe || (sub.plan !== 'free' && !sub.cancelAtPeriodEnd)) && (
            <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-line">
              {sub.managedByStripe && <Button onClick={portal} loading={action.pending}>Zahlungsdaten & Rechnungen</Button>}
              {sub.plan !== 'free' && !sub.cancelAtPeriodEnd && <Button variant="ghost" onClick={cancel}>Kündigen / zu Free wechseln</Button>}
            </div>
          )}
          <InlineError error={action.error} />
        </Card>
      </Section>
      <Section title="Nutzung heute">
        <Card className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Junis-AI-Nachrichten" value={`${data.usage.ai_messages} / ${effective.limits.aiMessagesPerDay}`} />
          <Stat label="Neue Lektionen" value={`${data.usage.lessons} / ${effective.limits.lessonsPerDay}`} />
          <Stat label="Credits" value={data.credits} hint={`${effective.limits.monthlyCredits} pro Monat, verfallen am Monatsende`} />
          <Stat label="Ziele / Projekte" value={`${effective.limits.goals} / ${effective.limits.projects}`} hint="max. aktiv" />
        </Card>
        <p className="text-xs text-muted mt-2">Credits werden nur für besonders rechenintensive Funktionen genutzt: Research ({data.creditCosts.research_standard}–{data.creditCosts.research_deep} Credits) und große Dokumentanalysen ({data.creditCosts.document_large} Credits). Normales Lernen verbraucht keine Credits.</p>
      </Section>
      <Section title="Tarife" action={<Segmented value={cycle} onChange={setCycle} options={[{ value: 'monthly', label: 'Monatlich' }, { value: 'yearly', label: 'Jährlich' }]} />}>
        <PlanGrid plans={data.plans.filter((p) => ['free', 'plus', 'pro'].includes(p.id))} cycle={cycle} current={sub.plan}
          action={(p) => p.id === sub.plan ? <Button className="w-full" disabled>Aktueller Tarif</Button>
            : p.id === 'free' ? (sub.plan !== 'free' && !sub.cancelAtPeriodEnd ? <Button className="w-full" onClick={cancel}>Zu Free wechseln</Button> : null)
              : <Button className="w-full" variant="primary" disabled={!p.available} onClick={() => setTarget(p)}>{p.available ? `Zu ${p.name} wechseln` : 'Derzeit nicht buchbar'}</Button>} />
        <p className="text-sm text-muted mt-6">Für Familien, Teams und Unternehmen: <Link to="/business" className="text-accent hover:underline">Organisation erstellen</Link> — Family ({euro(data.plans.find((p) => p.id === 'family').monthly)}/Monat für bis zu 5 Profile), Teams und Business (pro Nutzer).</p>
      </Section>
      <Modal open={!!target} onClose={() => setTarget(null)} title={`Zu ${target?.name} wechseln`}
        footer={<><Button variant="ghost" onClick={() => setTarget(null)}>Abbrechen</Button><Button variant="primary" onClick={checkout} loading={action.pending}>Weiter zur kostenpflichtigen Buchung</Button></>}>
        {target && (
          <>
            <p className="text-sm">Du buchst <b>{target.name}</b> für <b>{euro(cycle === 'yearly' ? target.yearly : target.monthly)} {cycle === 'yearly' ? 'pro Jahr' : 'pro Monat'}</b>. Das Abonnement verlängert sich automatisch und ist jederzeit zum Ende des Abrechnungszeitraums kündbar.</p>
            <p className="text-sm text-muted mt-3">Im nächsten Schritt gibst du deine Zahlungsdaten bei unserem Zahlungsanbieter Stripe ein. Erst mit der dortigen Bestätigung entstehen Kosten.</p>
            <InlineError error={action.error} />
          </>
        )}
      </Modal>
    </div>
  )
}

