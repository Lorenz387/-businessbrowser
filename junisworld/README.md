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
