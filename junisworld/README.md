# JunisWorld

Persönliches Entwicklungs-, Lern-, Skill-, Karriere- und Leistungssystem.
**Goal → Understand → Plan → Learn → Practice → Build → Verify → Apply → Improve.**

## Starten

Voraussetzung: Node.js ≥ 22.5 (nutzt das eingebaute `node:sqlite`).

```bash
cd junisworld
npm install
cp .env.example .env        # Werte eintragen — der Server liest junisworld/.env beim Start automatisch
npm run dev                 # API :8787 + Vite :5173
```

Produktion:

```bash
npm run build
npm start                   # Express liefert API und das gebaute Frontend aus dist/ aus
```

Tests: `npm test` (End-to-End-API-Tests gegen eine temporäre Datenbank).

## Was ohne Konfiguration funktioniert — und was nicht

| Bereich | Ohne Schlüssel | Benötigt |
|---|---|---|
| Registrierung, Onboarding, Ziele, Skill Graph, Skill Gap, Lernweg, Missions, Projekte, Portfolio, Memory, Knowledge-Notizen, Dokument-Upload, Business/Teams, Creator, Marketplace, Export/Löschung | ✓ | — |
| Lektionen, Übungen/Quiz, Bewertung offener Antworten, Junis-AI-Chat, KI-Zielanalyse, Projekt-Feedback, Dokumentanalyse, Research | klarer Fehlerzustand „nicht eingerichtet“ | `ANTHROPIC_API_KEY` |
| Kostenpflichtige Tarife | nicht buchbar, keine Kosten | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` |

Es gibt **keine Demodaten**. Leere Bereiche zeigen Empty States mit einer echten Aktion.

## Architektur

- `server/` — Express 5, SQLite (`node:sqlite`), Cookie-Sessions (scrypt-Hashes), Multer-Uploads.
  - `lib/engine.js` — Kernlogik: gemessene Skill-Level (Wissen + Praxis), Verifizierung, Skill-Gap, abhängigkeitssortierter Lernweg, adaptive Schwierigkeit, Spaced Repetition, Daily, Weekly Review.
  - `lib/ai.js` — alle Claude-Aufrufe (Chat mit Nutzerkontext, strukturierte Lektionen/Quiz via JSON-Schema, Bewertung, Web-Research mit Quellen).
  - `lib/catalog.js` — Kurrikulum: Skill-Taxonomie mit Abhängigkeiten, Zielvorlagen, Karrierewege, Missions (Produktinhalt, keine Nutzerdaten).
  - `lib/plans.js` — Tarife, Limits, Feature-Flags, Credit-Kosten.
- `src/` — React 19 + React Router + Tailwind 4. Kein Chart-Framework; Charts als Inline-SVG.

### Kernregeln der Engine

- **Gemessener Stand** = ½ Wissen + ½ Praxis. Lektionen heben Wissen höchstens auf 45 %; mehr nur durch Übungen/Tests. Projekte und Missions heben Praxis.
- **Selbsteinschätzung zählt nie als Fortschritt.** Sie führt nur dazu, dass Junis zuerst einen Stand-Check statt einer Einsteiger-Lektion vorschlägt.
- **Verifiziert** = Test ab Stufe 3 mit ≥ 80 % **und** ein angewandter Nachweis (Projekt/Mission). Badge ab Pro.
- **Adaptiv** (ab Plus): ≥ 80 % → Stufe +1 (bei sehr schnellen, fehlerfreien Antworten zusätzlich komprimierte Inhalte); < 50 % → Stufe −1 und Neu-Erklärung; > 120 s pro Aufgabe → vereinfachte Erklärung. Wiederholungsabstände 1/3/7/14/30/60 Tage.

## Betrieb

- Tarif ohne Stripe setzen (z. B. für Staff-Accounts): `npm run plan:set -- user <email> pro` bzw. `npm run plan:set -- org <id> teams 10`.
- Stripe-Webhook-Endpunkt: `POST /api/billing/webhook` (Events `checkout.session.completed`, `customer.subscription.*`).
- Die Preise in `server/lib/plans.js` müssen zu den Stripe-Preisen passen.
- Impressum-Angaben über `LEGAL_OPERATOR_NAME`, `LEGAL_ADDRESS`, `LEGAL_EMAIL`. Datenschutz- und AGB-Texte beschreiben die tatsächliche Verarbeitung, ersetzen aber keine Rechtsprüfung.
- JunisWorld versendet keine E-Mails (Einladungen erscheinen in der App, wenn sich die Person mit der E-Mail anmeldet).

## Bewusst noch nicht umgesetzt

- Passwort-Reset per E-Mail (kein Mail-Versand konfiguriert).
- Bezahlte Marketplace-Angebote, Credit-Nachkauf, Integrationen für Business.
- Verbindung zu JunusWorld (eigenständiges Ökosystem, später anzubinden).

## Apps: PersonalAI

Persönlicher KI-Agent unter **Apps → PersonalAI** (`server/agent/`, `src/pages/PersonalAI.jsx`).

- **Anbieter umschaltbar:** Claude (Anthropic SDK), OpenAI, xAI/Grok, Ollama (lokal) und beliebige OpenAI-kompatible Endpunkte. Schlüssel in der App oder in `.env` (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`).
- **Profile:** eigene Anweisungen (Persönlichkeit), Modell, Werkzeuge, Freigabe-Modus, Workspace, Schrittlimit.
- **Werkzeuge:** Befehle ausführen (PowerShell/bash), Dateien lesen/schreiben/auflisten, Webseiten laden, Merken (landet in Junis Memory).
- **Freigaben:** `strict` (alles bestätigen), `ask` (Standard: Befehle und Schreiben bestätigen), `auto`.
- **Sicherheit:** Befehle, Dateien und Web-Zugriff gibt es nur mit `PERSONALAI_TOOLS=on` **und** wenn der Browser auf demselben Rechner läuft (Loopback, kein Proxy-Header). Auf einem Server bleibt PersonalAI ein reiner Chat.

## Apps: Barrierefreiheit-Scanner

`server/apps/a11y/`, `src/pages/apps/Accessibility.jsx`. Crawlt bis zu 25 Seiten einer Domain, prüft statisches HTML auf 20 Regeln (Alternativtexte, Beschriftungen, Sprache, Überschriften, Zoom-Sperre, Linknamen, iframes, Inline-Kontraste …) und liefert je Fund einen Korrektur-Code. Wiederholung täglich/wöchentlich über den Scheduler, Benachrichtigung bei neuen kritischen Funden, CSV-Export. Abruf fremder Seiten mit SSRF-Schutz (`server/apps/safeFetch.js`; für lokale Tests `APPS_ALLOW_PRIVATE_FETCH=on`). Grenzen: kein JavaScript-Rendering, keine Kontraste aus Stylesheets, kein Konformitätsnachweis.

## Apps: Fristen- & Kündigungsmanager

`server/apps/contracts/`, `src/pages/apps/Contracts.jsx`. Verträge hochladen oder manuell anlegen; Junis AI liest Laufzeit, Frist, Verlängerung und Kosten mit wörtlichen Belegstellen aus (Übernahme nur nach Prüfung). Fristberechnung inkl. automatischer Verlängerungen, Erinnerungen 90/30/7 Tage vorher (einstellbar) in der App und per Slack-Webhook, Kalender-Export (.ics). E-Mail-Versand ist nicht eingebaut.

## Talent (Kernbereich)

`server/apps/talent/`, `src/pages/apps/Talent.jsx`, `src/components/TalentWidgets.jsx`. Fester Teil von JunisWorld unter `/talent` (eigener Menüpunkt; alte Links `/apps/talent…` werden umgeleitet). Eingebunden in Home (offene Einladungen/Treffer), Career (Status, Angebote, Entwicklungsfelder, gefragte Skills mit Link in den Skill Graph), Business („Talente finden“), globale Suche und Befehlspalette. Zwei Seiten:

- **Talente:** Lebenslauf (PDF/Text) hochladen → Junis AI füllt das Profil vor; ca. 20-minütiges Fachinterview mit 7 auf den Werdegang zugeschnittenen Fragen (inkl. Prüfung einer fehlerhaften KI-Antwort), schriftlich oder per Spracheingabe im Browser, max. 3 Nachfragen, Wiederholung frühestens nach 7 Tagen. Danach vollständiges Feedback (Gesamtwert, 5 Dimensionen mit Belegen, Stärken, Entwicklungsfelder, Empfehlungen). Projekte entdecken, Interesse zeigen, Einladungen annehmen/ablehnen, Nachfrage je Fachgebiet aus echten offenen Ausschreibungen.
- **Unternehmen:** Stelle in eigenen Worten beschreiben → Junis AI strukturiert Anforderungen (Pflicht/optional), Abgleich gegen den Pool mit nachvollziehbarem Score (Skills 45 %, Interview 25 %, Fachgebiet 15 %, Verfügbarkeit 10 %, Satz 5 %; fehlende Pflicht-Skills deckeln den Score). Kandidaten bleiben anonym, bis sie eine Einladung annehmen; Shortlist/Zusage erst danach.

Branchenwissen (`server/apps/talent/knowledge/`): Paket „Büro & Verwaltung“ (Stand 10/2026) mit 9 Fachwissen-Karten mit Rechtsgrundlage (Aufbewahrung, E-Rechnung, Rechnungspflichtangaben, Verzug, DSGVO, Reisekosten, DIN 5008), 8 Rollenprofilen, 14 Skills mit Synonymen fürs Matching, 7 Wissens-Checks à 5 Fragen (ab 80 % bestanden, sonst 24 h Sperre), 9 Arbeitsproben mit Kriterien und Musterlösung (Bewertung durch Junis AI ab 70 %; ohne KI nur Selbstvergleich, zählt nicht) und 4 Ausschreibungsvorlagen. Interview- und Ausschreibungs-Prompts erhalten den Branchenkontext. Nachweisstärke im Matching: verifiziert 1,0 · Arbeitsprobe 0,95 · Interview 0,9 · Wissens-Check 0,75 · Lebenslauf 0,6. Weitere Branchen = weitere Datei nach demselben Schema.

Proof of Skill: Skills zählen stärker, wenn sie im Interview belegt oder in JunisWorld verifiziert sind (abschaltbar). Keine Videos, keine Biometrie; KI-Werte sind Empfehlungen, Entscheidungen treffen Menschen. Nicht enthalten: Auszahlungen/Abrechnung zwischen Unternehmen und Talenten, RLHF-Aufgabenplattform, Video-Interviews.

## Apps: GastroFlow (Restaurant-Betriebssystem)

`server/apps/gastro/`, `src/pages/apps/gastro/`. Nachbau des GastroFlow-Prototyps als native JunisWorld-App (gleiche Anmeldung, Datenbank und KI). Mehrere Restaurants je Konto, Team mit Rollen (Inhaber/in, Betriebsleitung, Küche, Service) per E-Mail-Einladung. Funktionen: Tischplan mit Status, Reservierungsbuch mit automatischer Tischvergabe und Konfliktprüfung (Zeitfenster einstellbar), Gäste-CRM (Besuche/No-Shows aus Reservierungen, Allergien, Werbeeinwilligung), Speisekarte mit 14 LMIV-Allergenen, USt. 7 %/19 %, Wareneinsatz, Quote und Deckungsbeitrag aus Rezepten, Lager mit Meldebestand, Wareneingang und „Produktion buchen“, Personalbedarf und Schichtplan aus Reservierungen, Kasse per Webhook (`POST /api/gastro/pos/<token>`, idempotent über `externalId`) oder manuelle Tagesumsätze, Gäste-Feedback mit Antwortvorlage/KI-Entwurf, KI-Kochstudio (Gericht, 7-Tage-Plan, Verbesserung, Kartenanalyse) mit gespeicherten Plänen und Druck/PDF. Nicht übernommen aus dem Prototyp: Manus-Login, Testdaten-Import, Platzhalter ohne Funktion (Bestellungen, Abo-Seite). Kein QR-Menü, keine Bestellannahme, keine direkte Anbindung an konkrete Kassenhersteller.


## KI-Anbieter: Claude oder Gemini

Junis AI läuft wahlweise über Anthropic Claude (`ANTHROPIC_API_KEY`, Modell `JUNIS_MODEL`) oder Google Gemini (`GEMINI_API_KEY`, Modell `GEMINI_MODEL`, Standard `gemini-3.8-flash`). Ohne `JUNIS_AI_PROVIDER` wird Claude genutzt, wenn dessen Schlüssel gesetzt ist, sonst Gemini. `server/lib/gemini.js` übersetzt die Anfragen (Systemprompt, PDFs/Bilder, JSON-Schema-Ausgaben, Websuche → Google-Search-Grounding) und liefert Antworten im selben Format zurück; alle Funktionen (Lektionen, Interview, Verträge, Research, GastroFlow …) laufen unverändert. Unterschiede: Research-Quellen können bei Gemini Google-Weiterleitungslinks statt Originaladressen sein (ungeprüft); Qualität und Kosten wurden nicht mit echten Schlüsseln verglichen. PersonalAI kennt Gemini zusätzlich als eigenen Anbieter (OpenAI-kompatibler Endpunkt).

## Fundament: Sicherheit & Firmen-Arbeitsbereiche

**Sicherheit** (`server/lib/{secrets,totp,audit}.js`, `server/routes/auth.js`, Account → Sicherheit)
- Zwei-Faktor-Anmeldung (TOTP nach RFC 6238, QR-Code, Schutz gegen Wiederverwendung von Codes, 10 Wiederherstellungscodes).
- Sitzungen werden nur als SHA-256-Hash gespeichert; Geräteliste mit Abmelden einzeln oder aller anderen.
- API-Schlüssel, Slack-Webhooks und 2FA-Schlüssel verschlüsselt (AES-256-GCM). Schlüssel: `JUNIS_SECRET_KEY` (64 Hex-Zeichen) oder automatisch `data/secret.key` — diese Datei sichern, sonst sind gespeicherte Geheimnisse nach einer Neuinstallation nicht mehr lesbar.
- Sicherheitsprotokoll (Anmeldungen, Fehlversuche, 2FA, Sitzungen, Exporte) für Personen und Unternehmen.

**Arbeitsbereiche** (`server/lib/workspace.js`, Umschalter oben rechts)
- Jede Person arbeitet im **privaten Bereich** oder im **Bereich eines Unternehmens** (Organisation vom Typ Team/Unternehmen). Der Client sendet `X-Junis-Workspace: private | org:<id>`.
- Fristen-Manager, Barrierefreiheit-Scanner, GastroFlow und Talent-Ausschreibungen speichern Firmendaten mit `org_id`. Firmendaten erscheinen nie im privaten Bereich, private Daten nie im Firmenbereich. Lernen, Ziele, Skills, Junis AI und PersonalAI bleiben immer privat.
- Rechte: Owner/Admin/Manager ändern Firmendaten, Team Member lesen. GastroFlow: Owner/Admin erhalten Inhaberrechte, Manager Betriebsleitung, Küche/Service per Einladung im Restaurant.
- Business → „Apps & Sicherheit“: Apps je Unternehmen freigeben/sperren, Zwei-Faktor-Pflicht, Protokoll.
- Erinnerungen und Hinweise zu Firmendaten gehen an Owner/Admins/Manager; Links öffnen automatisch den richtigen Arbeitsbereich.
- Löscht eine Person ihr Konto, bleiben die von ihr angelegten Firmendaten beim Unternehmen.
- Noch offen: Single Sign-on (SSO/SAML), feinere Rechte je App.

**Verbindung der Apps** (`server/lib/connectors.js`)
- Jede App liefert für den aktuellen Arbeitsbereich und die Rolle der Person: Überblick, Suche und Kontext für Junis AI. Neue Apps hängen sich mit einem Connector an.
- **Cockpit** (`/cockpit`): Kennzahlen aller freigegebenen Apps und „Was jetzt zu tun ist“ (Kündigungsfristen, Nachbestellungen, kritische Bewertungen und Barrieren, Bewerbungen) — sortiert nach Dringlichkeit.
- **Suche** (Strg+K) findet Verträge, Websites, Restaurants, Gerichte, Ausschreibungen und Firmenwissen des aktuellen Bereichs.
- **Junis AI im Firmenmodus**: kennt die freigegebenen App-Daten und das Firmenwissen, gefiltert auf die Rechte der Person (z. B. Umsätze nur mit GastroFlow-Rolle Inhaber/Betriebsleitung). Gespräche gehören zum Arbeitsbereich, in dem sie geführt wurden. Private Daten gelangen nie in den Firmenmodus.
- **Talent → Team**: Talente, die eine Firmenausschreibung angenommen haben, laden Owner/Admins mit einem Klick ins Unternehmen ein.
