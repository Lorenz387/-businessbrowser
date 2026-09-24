import { Link, useParams } from 'react-router-dom'
import { useApi, useDocumentTitle } from '../lib/hooks.js'
import Logo from '../components/Logo.jsx'
import { PageHeader, Card, Loading } from '../components/ui.jsx'

function Shell({ standalone, children }) {
  if (!standalone) return <div className="max-w-3xl">{children}</div>
  return (
    <div className="min-h-screen">
      <header className="border-b border-line h-16 flex items-center px-4 sm:px-8"><Link to="/"><Logo /></Link></header>
      <main className="max-w-3xl mx-auto px-4 py-12">{children}</main>
    </div>
  )
}

const Missing = ({ children }) => <span className="bg-warn-soft text-warn px-1 rounded">{children}</span>

function Impressum({ legal }) {
  return (
    <>
      <PageHeader title="Impressum" subtitle="Angaben gemäß § 5 DDG" />
      <Card className="p-6 text-sm space-y-3">
        <p><b>Anbieter</b><br />{legal.operator || <Missing>[Name / Firma des Betreibers — vom Betreiber einzutragen: LEGAL_OPERATOR_NAME]</Missing>}</p>
        <p><b>Anschrift</b><br />{legal.address || <Missing>[Ladungsfähige Anschrift — LEGAL_ADDRESS]</Missing>}</p>
        <p><b>Kontakt</b><br />{legal.email || <Missing>[E-Mail-Adresse — LEGAL_EMAIL]</Missing>}</p>
        {!legal.complete && <p className="text-muted">Hinweis: Diese Instanz ist noch nicht vollständig eingerichtet. Der Betreiber ist verpflichtet, vor dem öffentlichen Betrieb vollständige Angaben zu machen.</p>}
      </Card>
    </>
  )
}

function Datenschutz({ legal }) {
  return (
    <>
      <PageHeader title="Datenschutz" subtitle="Welche Daten JunisWorld verarbeitet und warum." />
      <div className="prose-junis text-[15px]">
        <p className="text-sm text-muted">Diese Erklärung beschreibt die tatsächliche Datenverarbeitung dieser Software. Sie ersetzt keine rechtliche Prüfung durch den Betreiber.</p>
        <h2>Verantwortlicher</h2>
        <p>{legal.operator || '[vom Betreiber einzutragen]'}{legal.email ? `, ${legal.email}` : ''}</p>
        <h2>Welche Daten wir speichern</h2>
        <ul>
          <li><b>Konto:</b> Name, E-Mail-Adresse, Passwort (nur als scrypt-Hash).</li>
          <li><b>Profil & Lernen:</b> Angaben aus dem Onboarding, Ziele, Skills, Übungsergebnisse, Nachweise, Projekte, Notizen, hochgeladene Dokumente, Gespräche mit Junis AI, Memory-Einträge.</li>
          <li><b>Abrechnung:</b> Tarif und Abrechnungsstatus. Zahlungsdaten verarbeitet ausschließlich der Zahlungsanbieter Stripe.</li>
        </ul>
        <h2>Zweck</h2>
        <p>Die Daten werden verarbeitet, um dir einen persönlichen Lern- und Entwicklungsweg bereitzustellen (Vertragserfüllung). Es gibt kein Tracking, keine Werbung und keine Weitergabe zu Werbezwecken.</p>
        <h2>Junis AI</h2>
        <p>Für KI-Funktionen werden die jeweils nötigen Inhalte (deine Nachricht, relevanter Kontext wie Ziele und Skill-Stand, ggf. ein Dokument) an Anthropic PBC übermittelt, das die Claude-Modelle bereitstellt. Gespeichert werden Gespräche nur in deinem JunisWorld-Konto.</p>
        <h2>Organisationen & Familien</h2>
        <p>Organisationen sehen deinen gemessenen Skill-Stand nur, wenn du das in den Einstellungen ausdrücklich erlaubst. Persönliche Inhalte (Ziele, Notizen, Gespräche, Projekte) sind für Organisationen und Familienmitglieder nie sichtbar.</p>
        <h2>Deine Rechte</h2>
        <p>Du kannst unter <Link to="/account">Account</Link> jederzeit alle Daten exportieren und dein Konto vollständig löschen. Memory-Einträge kannst du einzeln einsehen, bearbeiten und löschen. Du hast außerdem das Recht auf Auskunft, Berichtigung, Einschränkung, Widerspruch und Beschwerde bei einer Aufsichtsbehörde.</p>
        <h2>Cookies</h2>
        <p>Siehe <Link to="/legal/cookies">Cookie-Einstellungen</Link>.</p>
      </div>
    </>
  )
}

function Agb({ legal }) {
  return (
    <>
      <PageHeader title="Allgemeine Geschäftsbedingungen" />
      <div className="prose-junis text-[15px]">
        <p className="text-sm text-muted">Diese Bedingungen beschreiben die Funktionsweise des Dienstes. Der Betreiber muss sie vor dem öffentlichen Betrieb rechtlich prüfen lassen.</p>
        <h2>1. Anbieter</h2>
        <p>{legal.operator || '[vom Betreiber einzutragen]'}</p>
        <h2>2. Leistungen</h2>
        <p>JunisWorld ist eine Software zur Unterstützung von Lernen, Skill-Entwicklung und Karriereplanung. Junis AI erstellt Erklärungen, Aufgaben und Empfehlungen automatisiert; diese können Fehler enthalten. JunisWorld garantiert keine beruflichen, schulischen, medizinischen oder finanziellen Ergebnisse.</p>
        <h2>3. Tarife und Zahlung</h2>
        <p>Der Tarif Free ist kostenlos. Kostenpflichtige Tarife werden erst nach ausdrücklicher Bestätigung beim Zahlungsanbieter gebucht und verlängern sich automatisch um den gewählten Abrechnungszeitraum. Preise werden vor der Buchung vollständig angezeigt.</p>
        <h2>4. Kündigung</h2>
        <p>Abonnements sind jederzeit zum Ende des laufenden Abrechnungszeitraums unter <Link to="/billing">Billing</Link> kündbar. Nach Ablauf wechselt das Konto zu Free; Daten bleiben erhalten.</p>
        <h2>5. Credits</h2>
        <p>Credits werden nur für rechenintensive Funktionen (Research, große Dokumentanalysen) verwendet. Monatlich enthaltene Credits verfallen am Monatsende. Bei fehlgeschlagenen Aktionen werden Credits erstattet.</p>
        <h2>6. Inhalte von Creators</h2>
        <p>Inhalte im Marketplace stammen von Nutzerinnen und Nutzern und werden von JunisWorld nicht fachlich geprüft. Creators versichern, die Rechte an ihren Inhalten zu besitzen.</p>
        <h2>7. Nachweise</h2>
        <p>Skill-Nachweise und Portfolio dokumentieren Leistungen innerhalb von JunisWorld. Sie sind keine staatlich anerkannten Zertifikate.</p>
      </div>
    </>
  )
}

function Cookies() {
  return (
    <>
      <PageHeader title="Cookie-Einstellungen" />
      <Card className="p-6 text-sm space-y-4">
        <div>
          <p className="font-medium">Notwendig · immer aktiv</p>
          <p className="text-muted mt-1"><code>jw_session</code> — hält dich angemeldet (httpOnly, 30 Tage). Ohne dieses Cookie ist keine Anmeldung möglich.</p>
        </div>
        <div>
          <p className="font-medium">Analyse, Marketing, Tracking</p>
          <p className="text-muted mt-1">Werden nicht verwendet. Es gibt daher nichts, dem du zustimmen oder widersprechen müsstest.</p>
        </div>
        <p className="text-muted">Schriftarten werden von Google Fonts geladen; dabei wird deine IP-Adresse an Google übermittelt. Betreiber können die Schrift lokal ausliefern, um das zu vermeiden.</p>
      </Card>
    </>
  )
}

export function Legal({ standalone }) {
  const { page } = useParams()
  const { data } = useApi('/legal')
  const legal = data || {}
  useDocumentTitle({ impressum: 'Impressum', datenschutz: 'Datenschutz', agb: 'AGB', cookies: 'Cookies' }[page])
  if (!data) return <Shell standalone={standalone}><Loading /></Shell>
  return (
    <Shell standalone={standalone}>
      {page === 'impressum' && <Impressum legal={legal} />}
      {page === 'datenschutz' && <Datenschutz legal={legal} />}
      {page === 'agb' && <Agb legal={legal} />}
      {page === 'cookies' && <Cookies />}
      {!['impressum', 'datenschutz', 'agb', 'cookies'].includes(page) && <PageHeader title="Diese Seite gibt es nicht." />}
    </Shell>
  )
}

export function Help({ standalone }) {
  useDocumentTitle('Hilfe')
  const { data } = useApi('/legal')
  return (
    <Shell standalone={standalone}>
      <PageHeader title="Hilfe & Support" />
      <div className="prose-junis text-[15px]">
        <h2>Kontakt</h2>
        <p>{data?.email ? <a href={`mailto:${data.email}`}>{data.email}</a> : 'Der Betreiber dieser Instanz hat noch keine Support-Adresse hinterlegt.'}</p>
        <h2>Häufige Fragen</h2>
        <h3>Warum steigt mein Fortschritt nicht, obwohl ich mich hoch eingeschätzt habe?</h3>
        <p>Fortschritt basiert ausschließlich auf gemessenen Ergebnissen: Übungen, Projekten, Missions und Nachweisen. Selbsteinschätzungen dienen nur als Startpunkt.</p>
        <h3>Wann gilt ein Skill als verifiziert?</h3>
        <p>Wenn ein Test ab Stufe 3 mit mindestens 80 % bestanden wurde und zusätzlich ein angewandter Nachweis (Projekt oder Mission) vorliegt. Das Badge ist Teil von Pro.</p>
        <h3>Wofür brauche ich Credits?</h3>
        <p>Nur für Research und große Dokumentanalysen. Lernen, Üben und Gespräche mit Junis verbrauchen keine Credits (nur Tageslimits je Tarif).</p>
        <h3>Tastenkürzel</h3>
        <p><code>Ctrl</code> + <code>K</code> öffnet Suche und Befehle.</p>
      </div>
    </Shell>
  )
}
