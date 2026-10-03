// Branchenwissen „Büro & Verwaltung“ (Deutschland). Stand: Oktober 2026.
// Rechtliche Angaben mit Fundstelle; zeitkritische Werte wurden im Oktober 2026 gegen aktuelle Quellen geprüft.
// Keine Rechts- oder Steuerberatung — betriebliche Regelungen (z. B. Reiserichtlinien) können abweichen.

export const office = {
  id: 'office',
  name: 'Büro & Verwaltung',
  version: '2026-10',
  domainAliases: ['Büro', 'Büro & Verwaltung', 'Verwaltung', 'Büromanagement', 'Office', 'Office Management', 'Assistenz', 'Sekretariat', 'Administration', 'Sachbearbeitung', 'Backoffice'],
  intro:
    'Büroarbeit hält ein Unternehmen am Laufen: Korrespondenz, Termine, Rechnungen, Ablage, Reisen, Personalverwaltung. Gefragt sind Sorgfalt, Priorisierung und sicheres Wissen zu Regeln wie DIN 5008, Rechnungspflichtangaben, Aufbewahrungsfristen und Datenschutz — und zunehmend der kompetente Umgang mit KI-Werkzeugen.',

  facts: [
    { title: 'Aufbewahrungsfristen', text: 'Buchungsbelege (z. B. Eingangs- und Ausgangsrechnungen, Kontoauszüge): 8 Jahre — verkürzt von 10 Jahren durch das Bürokratieentlastungsgesetz IV, gilt seit 1.1.2025 für alle Belege, deren 10-Jahres-Frist zu diesem Zeitpunkt noch lief. Bücher, Inventare und Jahresabschlüsse: weiterhin 10 Jahre. Empfangene Handels- und Geschäftsbriefe sowie Kopien abgesandter: 6 Jahre. Die Frist beginnt mit dem Ende des Kalenderjahres, in dem das Dokument entstanden ist.', source: '§ 147 AO, § 257 HGB, BEG IV' },
    { title: 'E-Rechnung im Inland (B2B)', text: 'Seit 1.1.2025 müssen alle inländischen Unternehmen E-Rechnungen empfangen können. Ausstellungspflicht ab 1.1.2027 für Unternehmen mit mehr als 800.000 € Vorjahresumsatz, ab 1.1.2028 für alle. Eine E-Rechnung ist ein strukturiertes Datenformat (z. B. XRechnung, ZUGFeRD ab Version 2.0.1) — eine reine PDF-Datei per E-Mail ist keine E-Rechnung, sondern eine „sonstige Rechnung“. Kleinunternehmer (§ 19 UStG) sind von der Ausstellungspflicht ausgenommen.', source: '§ 14 UStG, Wachstumschancengesetz' },
    { title: 'Pflichtangaben auf Rechnungen', text: 'Vollständiger Name und Anschrift von leistendem Unternehmen und Empfänger, Steuernummer oder USt-IdNr. des leistenden Unternehmens, Ausstellungsdatum, fortlaufende Rechnungsnummer, Menge und Art der Leistung, Zeitpunkt der Lieferung/Leistung, Entgelt nach Steuersätzen aufgeschlüsselt, Steuersatz und Steuerbetrag (oder Hinweis auf Steuerbefreiung). Eine Bankverbindung ist keine Pflichtangabe.', source: '§ 14 Abs. 4 UStG' },
    { title: 'Kleinbetragsrechnung', text: 'Bis 250 € brutto genügen vereinfachte Angaben: Name und Anschrift des leistenden Unternehmens, Ausstellungsdatum, Menge und Art der Leistung, Bruttobetrag und Steuersatz.', source: '§ 33 UStDV' },
    { title: 'Zahlungsverzug', text: 'Verzug tritt spätestens 30 Tage nach Fälligkeit und Zugang der Rechnung ein — bei Verbrauchern nur, wenn die Rechnung darauf hinweist. Ist ein Zahlungstermin kalendermäßig bestimmt („zahlbar bis 15.11.“), tritt Verzug ohne Mahnung ein. Verzugszinsen: 5 Prozentpunkte über dem Basiszinssatz (Verbraucher), 9 Prozentpunkte (Geschäfte ohne Verbraucherbeteiligung) plus 40 € Verzugspauschale im B2B-Bereich.', source: '§§ 286, 288 BGB' },
    { title: 'Datenschutz im Büroalltag', text: 'Datenpannen mit Risiko für Betroffene sind binnen 72 Stunden der Aufsichtsbehörde zu melden. Auskunftsersuchen Betroffener sind grundsätzlich innerhalb eines Monats zu beantworten. E-Mails an mehrere externe Empfänger, die sich nicht kennen: BCC verwenden. Papier mit personenbezogenen Daten gehört in den Aktenvernichter oder die Datenschutztonne, nicht ins Altpapier.', source: 'Art. 12, 15, 33 DSGVO' },
    { title: 'Reisekosten (Inland, steuerliche Pauschalen 2026)', text: 'Verpflegungspauschale: 14 € bei mehr als 8 Stunden Abwesenheit (eintägig) sowie für An- und Abreisetag mehrtägiger Reisen, 28 € für volle 24 Stunden. Gestellte Mahlzeiten kürzen die Tagespauschale von 28 €: Frühstück um 20 % (5,60 €), Mittag- und Abendessen um je 40 % (11,20 €). Fahrten mit dem privaten Pkw bei Dienstreisen: 0,30 € je gefahrenem Kilometer.', source: '§ 9 Abs. 4a EStG, § 9 Abs. 1 Satz 3 Nr. 4a EStG' },
    { title: 'DIN 5008 — Kernregeln', text: 'Das Wort „Betreff“ wird nicht geschrieben; der Betreff kann fett hervorgehoben werden. Nach der Anrede steht ein Komma, der Text beginnt klein (außer bei Substantiven). Die Grußformel „Mit freundlichen Grüßen“ steht ohne Satzzeichen. Datum numerisch als TT.MM.JJJJ oder international als JJJJ-MM-TT. Telefonnummern werden funktional gegliedert: Vorwahl, Leerzeichen, Rufnummer, Durchwahl mit Bindestrich (030 12345-67).', source: 'DIN 5008' },
    { title: 'Ausbildung', text: 'Der klassische Einstieg ist die dreijährige duale Ausbildung „Kaufmann/Kauffrau für Büromanagement“. Häufige Weiterbildungen: Geprüfte/r Büro- und Projektorganisator/in, Wirtschaftsfachwirt/in, Fachassistenz Buchhaltung oder Lohn und Gehalt.', source: 'BBiG-Ausbildungsordnung' },
  ],

  skills: [
    { id: 'korrespondenz', name: 'Geschäftskorrespondenz (DIN 5008)', aliases: ['DIN 5008', 'Korrespondenz', 'Geschäftsbriefe', 'Geschäftskorrespondenz', 'Schriftverkehr', 'E-Mail-Kommunikation'], description: 'Briefe und E-Mails formal korrekt, verständlich und im richtigen Ton verfassen.' },
    { id: 'termine', name: 'Termin- & Kalenderorganisation', aliases: ['Terminplanung', 'Kalenderführung', 'Terminmanagement', 'Terminorganisation', 'Kalendermanagement'], description: 'Kalender mehrerer Personen führen, Konflikte lösen, Vorlauf und Puffer einplanen.' },
    { id: 'reisen', name: 'Reiseorganisation & Reisekosten', aliases: ['Reisekostenabrechnung', 'Reiseplanung', 'Dienstreisen', 'Reisemanagement'], description: 'Dienstreisen buchen und nach steuerlichen Pauschalen bzw. Reiserichtlinie abrechnen.' },
    { id: 'rechnungspruefung', name: 'Rechnungsprüfung & Kreditoren', aliases: ['Rechnungsprüfung', 'Rechnungseingang', 'Kreditorenbuchhaltung', 'Kreditoren', 'E-Rechnung', 'Eingangsrechnungen'], description: 'Eingangsrechnungen auf Pflichtangaben, Rechenfehler und sachliche Richtigkeit prüfen.' },
    { id: 'mahnwesen', name: 'Debitorenmanagement & Mahnwesen', aliases: ['Mahnwesen', 'Forderungsmanagement', 'Debitorenbuchhaltung', 'Debitoren', 'Zahlungserinnerung'], description: 'Offene Posten überwachen, Zahlungserinnerungen und Mahnungen rechtssicher formulieren.' },
    { id: 'ablage', name: 'Ablage, DMS & Aufbewahrung', aliases: ['Ablage', 'Dokumentenmanagement', 'DMS', 'Archivierung', 'Aktenführung', 'GoBD'], description: 'Dokumente auffindbar ablegen und Aufbewahrungsfristen einhalten.' },
    { id: 'datenschutz', name: 'Datenschutz im Büroalltag', aliases: ['DSGVO', 'Datenschutz', 'Datensicherheit'], description: 'Personenbezogene Daten im Alltag korrekt behandeln, Vorfälle erkennen und richtig reagieren.' },
    { id: 'tabellen', name: 'Tabellenkalkulation', aliases: ['Excel', 'MS Excel', 'Google Sheets', 'Tabellenkalkulation', 'LibreOffice Calc'], description: 'Formeln, Bezüge, Verweise und einfache Auswertungen sicher anwenden.' },
    { id: 'protokoll', name: 'Protokollführung & Meetings', aliases: ['Protokoll', 'Protokollführung', 'Meeting-Organisation', 'Besprechungsorganisation'], description: 'Ergebnisprotokolle mit klaren Aufgaben (Wer/Was/Bis wann) erstellen.' },
    { id: 'kommunikation', name: 'Empfang, Telefon & Kundenkontakt', aliases: ['Empfang', 'Telefonie', 'Kundenservice', 'Front Office', 'Kundenkommunikation'], description: 'Anliegen aufnehmen, weiterleiten und professionell kommunizieren — auch in schwierigen Situationen.' },
    { id: 'personal', name: 'Personaladministration', aliases: ['HR-Administration', 'Personalverwaltung', 'Personalakte', 'Personalsachbearbeitung', 'HR'], description: 'Personalakten, Ein- und Austritte, Urlaubs- und Krankmeldungen verwalten.' },
    { id: 'einkauf', name: 'Einkauf & Bestellwesen', aliases: ['Einkauf', 'Beschaffung', 'Bestellwesen', 'Büromaterial'], description: 'Bedarf bündeln, Angebote vergleichen, Bestellungen und Lieferungen nachhalten.' },
    { id: 'priorisierung', name: 'Selbstorganisation & Priorisierung', aliases: ['Zeitmanagement', 'Priorisierung', 'Selbstorganisation', 'Organisation'], description: 'Viele parallele Anfragen nach Dringlichkeit und Wichtigkeit ordnen.' },
    { id: 'ki_office', name: 'KI-Werkzeuge im Büro', aliases: ['KI-Assistenz', 'ChatGPT', 'Prompting', 'KI-Tools', 'Copilot'], description: 'KI für Entwürfe und Zusammenfassungen nutzen — und Ergebnisse fachlich prüfen.' },
  ],

  roles: [
    { id: 'bueroassistenz', title: 'Büroassistenz / Kaufmann·frau für Büromanagement', summary: 'Allrounder:in im Büro: Korrespondenz, Termine, Ablage, Bestellungen, erste Buchhaltungsaufgaben.', skills: ['korrespondenz', 'termine', 'ablage', 'einkauf', 'tabellen', 'kommunikation'], tasks: ['Posteingang sichten und verteilen', 'Briefe und E-Mails nach DIN 5008 schreiben', 'Termine koordinieren', 'Büromaterial bestellen', 'Ablage und Wiedervorlage führen'] },
    { id: 'office_manager', title: 'Office Manager:in', summary: 'Organisiert das Büro als Ganzes: Abläufe, Dienstleister, Budget, Arbeitsplätze und Events.', skills: ['priorisierung', 'einkauf', 'termine', 'kommunikation', 'tabellen', 'datenschutz'], tasks: ['Dienstleister und Verträge betreuen', 'Büro-Budget überwachen', 'Onboarding-Arbeitsplätze vorbereiten', 'Team-Events organisieren'] },
    { id: 'assistenz_gf', title: 'Assistenz der Geschäftsführung', summary: 'Rechte Hand der Geschäftsführung: Kalender, Reisen, Vorlagen, vertrauliche Korrespondenz, Meetings.', skills: ['termine', 'reisen', 'korrespondenz', 'protokoll', 'priorisierung', 'datenschutz'], tasks: ['Kalender der GF führen', 'Reisen planen und abrechnen', 'Entscheidungsvorlagen aufbereiten', 'Protokolle führen und nachhalten'] },
    { id: 'buchhaltung', title: 'Sachbearbeitung Buchhaltung (Kreditoren/Debitoren)', summary: 'Prüft Rechnungen, verbucht Belege vor, überwacht offene Posten und führt das Mahnwesen.', skills: ['rechnungspruefung', 'mahnwesen', 'ablage', 'tabellen'], tasks: ['Eingangsrechnungen prüfen und freigeben lassen', 'Zahlungsläufe vorbereiten', 'Offene Posten abstimmen', 'Zahlungserinnerungen versenden'] },
    { id: 'personal_sb', title: 'Personalsachbearbeitung', summary: 'Verwaltet Personalakten und Personalprozesse von der Einstellung bis zum Austritt.', skills: ['personal', 'datenschutz', 'korrespondenz', 'tabellen'], tasks: ['Arbeitsverträge und Bescheinigungen vorbereiten', 'Urlaubs- und Krankmeldungen erfassen', 'Ein- und Austritte organisieren'] },
    { id: 'empfang', title: 'Empfang / Front Office', summary: 'Erster Eindruck des Unternehmens: Besucher, Telefon, Post und Raumbuchungen.', skills: ['kommunikation', 'termine', 'datenschutz'], tasks: ['Besucher empfangen und anmelden', 'Telefonzentrale', 'Post verteilen', 'Besprechungsräume verwalten'] },
    { id: 'virtuelle_assistenz', title: 'Virtuelle Assistenz (Freelance)', summary: 'Übernimmt Büroaufgaben remote für mehrere Selbstständige oder kleine Unternehmen.', skills: ['priorisierung', 'korrespondenz', 'termine', 'ki_office', 'tabellen'], tasks: ['Postfach-Management', 'Terminvereinbarung mit Kunden', 'Rechnungen schreiben', 'Recherchen und Zusammenfassungen'] },
    { id: 'ki_trainer_office', title: 'KI-Trainer:in Büro & Verwaltung', summary: 'Bewertet und verbessert KI-Antworten zu Büro-, Rechnungs- und Organisationsthemen (Expertenarbeit für KI-Training).', skills: ['ki_office', 'rechnungspruefung', 'korrespondenz', 'ablage', 'datenschutz'], tasks: ['Fehlerhafte KI-Antworten finden und korrigieren', 'Antworten nach Kriterien bewerten', 'Musterlösungen schreiben'] },
  ],

  quizzes: {
    korrespondenz: [
      { q: 'Wie steht die Grußformel nach DIN 5008 korrekt?', options: ['Mit freundlichen Grüßen,', 'Mit freundlichen Grüßen', 'Mit freundlichen Grüßen.', 'mit freundlichen Grüßen'], answer: 1, explain: 'Die Grußformel steht ohne Satzzeichen.' },
      { q: 'Wie wird der Betreff nach DIN 5008 geschrieben?', options: ['„Betreff: Ihr Angebot vom …“', '„Betr.: Ihr Angebot vom …“', 'Ohne das Wort „Betreff“, optional fett', 'In Großbuchstaben mit Doppelpunkt'], answer: 2, explain: 'Das Wort „Betreff“ entfällt; der Betreff kann fett hervorgehoben werden.' },
      { q: 'Nach „Sehr geehrte Frau Weber,“ beginnt der erste Satz …', options: ['immer groß', 'klein, außer bei Substantiven und Höflichkeitsformen', 'mit einem Gedankenstrich', 'nach einer Leerzeile groß'], answer: 1, explain: 'Nach dem Komma geht der Satz weiter — also Kleinschreibung (außer Substantive, „Sie“ usw.).' },
      { q: 'Welche Telefonnummer ist nach DIN 5008 gegliedert?', options: ['(030) 12 34 56-7', '030/1234567', '030 12345-67', '030-12345/67'], answer: 2, explain: 'Funktionale Gliederung: Vorwahl, Leerzeichen, Rufnummer, Durchwahl mit Bindestrich.' },
      { q: 'Welches numerische Datumsformat sieht DIN 5008 als internationales Format vor?', options: ['10/01/2026', '2026-10-01', '01-10-2026', '1.10.26'], answer: 1, explain: 'International: JJJJ-MM-TT (ISO 8601).' },
    ],
    rechnungspruefung: [
      { q: 'Welche Angabe ist KEINE Pflichtangabe nach § 14 Abs. 4 UStG?', options: ['Fortlaufende Rechnungsnummer', 'Steuernummer oder USt-IdNr. des leistenden Unternehmens', 'Zeitpunkt der Lieferung/Leistung', 'Bankverbindung'], answer: 3, explain: 'Die Bankverbindung ist üblich, aber keine Pflichtangabe.' },
      { q: 'Bis zu welchem Bruttobetrag gilt eine Kleinbetragsrechnung?', options: ['150 €', '250 €', '500 €', '1.000 €'], answer: 1, explain: '§ 33 UStDV: bis 250 € brutto.' },
      { q: 'Nettobetrag 1.200 €, Umsatzsteuer 19 %. Wie hoch ist der Bruttobetrag?', options: ['1.219,00 €', '1.392,00 €', '1.428,00 €', '1.482,00 €'], answer: 2, explain: '1.200 € × 1,19 = 1.428 €.' },
      { q: 'Ist eine per E-Mail versandte PDF-Rechnung seit 2025 eine E-Rechnung im Sinne des UStG?', options: ['Ja, jede elektronisch versandte Rechnung', 'Nur mit qualifizierter Signatur', 'Nein, eine E-Rechnung ist ein strukturiertes Format wie XRechnung oder ZUGFeRD', 'Ja, wenn sie als PDF/A gespeichert ist'], answer: 2, explain: 'PDF allein ist eine „sonstige Rechnung“.' },
      { q: 'Wie lange müssen Eingangsrechnungen seit 2025 aufbewahrt werden?', options: ['6 Jahre', '8 Jahre', '10 Jahre', '30 Jahre'], answer: 1, explain: 'Buchungsbelege: 8 Jahre (BEG IV, seit 1.1.2025).' },
    ],
    mahnwesen: [
      { q: 'Wann gerät ein Unternehmen als Kunde spätestens in Verzug, wenn kein Zahlungsdatum vereinbart ist?', options: ['Sofort mit Rechnungszugang', '14 Tage nach Zugang', '30 Tage nach Fälligkeit und Zugang der Rechnung', 'Erst nach der dritten Mahnung'], answer: 2, explain: '§ 286 Abs. 3 BGB.' },
      { q: 'Auf der Rechnung steht „zahlbar bis 15.11.2026“. Was gilt ab dem 16.11.?', options: ['Erst eine Mahnung begründet Verzug', 'Verzug tritt ohne Mahnung ein', 'Es gilt die 30-Tage-Regel', 'Verzug nur bei Verbrauchern'], answer: 1, explain: 'Kalendermäßig bestimmter Termin: Verzug ohne Mahnung (§ 286 Abs. 2 Nr. 1 BGB).' },
      { q: 'Wie hoch ist der gesetzliche Verzugszins zwischen Unternehmen?', options: ['5 Prozentpunkte über Basiszinssatz', '9 Prozentpunkte über Basiszinssatz', 'Fest 8 %', 'Es gibt keinen gesetzlichen Zins'], answer: 1, explain: '§ 288 Abs. 2 BGB; bei Verbrauchern 5 Prozentpunkte.' },
      { q: 'Welche Pauschale kann ein Unternehmen bei Verzug eines anderen Unternehmens zusätzlich verlangen?', options: ['5 €', '15 €', '40 €', '100 €'], answer: 2, explain: '§ 288 Abs. 5 BGB: 40 € Verzugspauschale.' },
      { q: 'Was gehört in jede Zahlungserinnerung?', options: ['Drohung mit Inkasso', 'Rechnungsnummer, Rechnungsdatum, offener Betrag und eine neue konkrete Frist', 'Nur der Betrag', 'Ein Hinweis auf die Schufa'], answer: 1, explain: 'Eindeutige Zuordnung und eine klare Frist — freundlich im Ton.' },
    ],
    ablage: [
      { q: 'Wie lange sind empfangene Geschäftsbriefe aufzubewahren?', options: ['2 Jahre', '6 Jahre', '8 Jahre', '10 Jahre'], answer: 1, explain: '§ 257 HGB / § 147 AO: 6 Jahre.' },
      { q: 'Wie lange sind Jahresabschlüsse aufzubewahren?', options: ['6 Jahre', '8 Jahre', '10 Jahre', 'Unbegrenzt'], answer: 2, explain: 'Bücher, Inventare, Jahresabschlüsse: weiterhin 10 Jahre.' },
      { q: 'Wann beginnt die Aufbewahrungsfrist?', options: ['Am Tag des Dokuments', 'Mit dem Ende des Kalenderjahres, in dem das Dokument entstanden ist', 'Mit dem Ende des Geschäftsjahres der Prüfung', 'Mit dem Eingang beim Steuerberater'], answer: 1, explain: 'Fristbeginn ist der Schluss des Kalenderjahres.' },
      { q: 'Rechnung vom 15.03.2025 (Buchungsbeleg). Ab wann darf sie frühestens vernichtet werden?', options: ['16.03.2033', '01.01.2033', '01.01.2034', '01.01.2036'], answer: 2, explain: 'Fristbeginn 31.12.2025 + 8 Jahre = 31.12.2033, also ab 01.01.2034.' },
      { q: 'Eine E-Rechnung (XRechnung) geht ein. Wie wird sie aufbewahrt?', options: ['Ausdrucken genügt', 'Im elektronischen Originalformat, unveränderbar und auswertbar', 'Als Screenshot', 'Nur die E-Mail aufheben'], answer: 1, explain: 'Elektronisch eingegangene Belege müssen im Ursprungsformat aufbewahrt werden (GoBD).' },
    ],
    datenschutz: [
      { q: 'Innerhalb welcher Frist ist eine meldepflichtige Datenpanne der Aufsichtsbehörde zu melden?', options: ['24 Stunden', '72 Stunden', '7 Tage', '1 Monat'], answer: 1, explain: 'Art. 33 DSGVO: möglichst binnen 72 Stunden.' },
      { q: 'Eine Kundin verlangt Auskunft über ihre gespeicherten Daten. Bis wann grundsätzlich antworten?', options: ['Innerhalb einer Woche', 'Innerhalb eines Monats', 'Innerhalb eines Jahres', 'Keine Frist'], answer: 1, explain: 'Art. 12 Abs. 3 DSGVO: grundsätzlich ein Monat.' },
      { q: 'Rundmail an 40 externe Teilnehmende, die sich nicht kennen. Wie adressieren?', options: ['Alle in „An“', 'Alle in „CC“', 'Alle in „BCC“', 'Egal'], answer: 2, explain: 'Sonst werden E-Mail-Adressen ohne Rechtsgrundlage offengelegt.' },
      { q: 'Wohin mit ausgedruckten Bewerbungsunterlagen, die nicht mehr benötigt werden?', options: ['Altpapier', 'Restmüll', 'Aktenvernichter oder Datenschutztonne', 'Zurück in die Ablage'], answer: 2, explain: 'Personenbezogene Daten sicher vernichten.' },
      { q: 'Du verlässt kurz deinen Arbeitsplatz. Was ist richtig?', options: ['Bildschirm sperren', 'Monitor ausschalten genügt', 'Nichts, das Büro ist abgeschlossen', 'Nur Programme minimieren'], answer: 0, explain: 'Bildschirm sperren (z. B. Windows-Taste + L).' },
    ],
    reisen: [
      { q: 'Eintägige Dienstreise, 9 Stunden abwesend. Verpflegungspauschale (Inland)?', options: ['0 €', '14 €', '28 €', '24 €'], answer: 1, explain: 'Mehr als 8 Stunden: 14 €.' },
      { q: 'Voller Kalendertag (24 Stunden) unterwegs. Pauschale?', options: ['14 €', '24 €', '28 €', '32 €'], answer: 2, explain: '28 € für volle 24 Stunden.' },
      { q: 'Am vollen Reisetag wird ein Frühstück gestellt. Um wie viel wird gekürzt?', options: ['2,80 €', '5,60 €', '11,20 €', '14,00 €'], answer: 1, explain: '20 % von 28 € = 5,60 €.' },
      { q: 'Dienstreise mit dem privaten Pkw. Welcher Kilometersatz gilt steuerlich?', options: ['0,20 € je km', '0,30 € je gefahrenem km', '0,38 € je km', '0,50 € je km'], answer: 1, explain: '0,30 € je gefahrenem Kilometer.' },
      { q: 'Reise Mo–Mi (An- und Abreisetag + ein voller Tag), keine Mahlzeiten gestellt. Summe Verpflegung?', options: ['42 €', '56 €', '70 €', '84 €'], answer: 1, explain: '14 € + 28 € + 14 € = 56 €.' },
    ],
    tabellen: [
      { q: 'Welche Formel summiert in deutschem Excel die Zellen B2 bis B10?', options: ['=SUM(B2:B10)', '=SUMME(B2:B10)', '=SUMME(B2;B10)', '=ADD(B2-B10)'], answer: 1, explain: 'Deutsche Funktionsnamen, Bereich mit Doppelpunkt.' },
      { q: 'Wie bleibt der Bezug auf B1 beim Kopieren einer Formel fest?', options: ['B1!', '#B#1', '$B$1', '(B1)'], answer: 2, explain: 'Absoluter Bezug mit Dollarzeichen.' },
      { q: 'Wofür nutzt man SVERWEIS (bzw. XVERWEIS)?', options: ['Zum Sortieren', 'Um zu einem Suchwert Daten aus einer anderen Tabelle zu holen', 'Für Diagramme', 'Zum Runden'], answer: 1, explain: 'Nachschlagen in einer Tabelle anhand eines Schlüssels.' },
      { q: 'Welche WENN-Formel ist in deutschem Excel syntaktisch korrekt?', options: ['=WENN(C2>1000,"prüfen","ok")', '=WENN(C2>1000;"prüfen";"ok")', '=IF C2>1000 THEN "prüfen"', '=WENN[C2>1000;prüfen;ok]'], answer: 1, explain: 'In deutschen Einstellungen trennt das Semikolon die Argumente.' },
      { q: 'A2 enthält einen Nettobetrag. Welche Formel ergibt den Bruttobetrag bei 19 % USt.?', options: ['=A2+19', '=A2*0,19', '=A2*1,19', '=A2/1,19'], answer: 2, explain: 'Netto × 1,19 = Brutto.' },
    ],
  },

  tasks: [
    {
      id: 'posteingang', title: 'Posteingang priorisieren', role: 'bueroassistenz', skills: ['priorisierung', 'kommunikation'], minutes: 15, level: 'Einstieg',
      brief: 'Es ist Montag, 8:30 Uhr. Deine Chefin ist bis 12 Uhr in einem Termin. Ordne die Nachrichten nach Dringlichkeit, entscheide je Nachricht, was du tust (selbst erledigen, weiterleiten an wen, Wiedervorlage) und begründe kurz.',
      material: [
        '1. Kunde Berger GmbH: „Die heute um 14 Uhr geplante Präsentation — können wir auf 15 Uhr schieben?“',
        '2. Newsletter eines Software-Anbieters mit Rabattaktion',
        '3. IT: „Bitte bis Freitag das neue Passwort-Tool installieren.“',
        '4. Steuerberater: „Uns fehlen für die Umsatzsteuer-Voranmeldung noch drei Belege — Abgabe ist Mittwoch.“',
        '5. Kollege: „Weißt du, wo der Schlüssel für Raum 2 ist?“',
        '6. Bewerber: Rückfrage zum Stand seiner Bewerbung (seit 3 Wochen ohne Antwort)',
        '7. Lieferant: Mahnung über 1.840 € — Rechnung liegt seit zwei Wochen zur Freigabe bei der Chefin',
        '8. Reinigungsfirma: Ankündigung, dass am Donnerstag die Teppiche gereinigt werden',
      ],
      deliverable: 'Reihenfolge 1–8 mit Aktion und einem Satz Begründung je Nachricht.',
      rubric: ['Termin- und Fristsachen (1, 4, 7) stehen vorn', 'Kundenanfrage 1 wird aktiv geklärt (Kalender prüfen, Chefin informieren, Kunde vorläufig antworten)', 'Mahnung 7: Freigabe bei der Chefin anstoßen, Lieferant informieren', 'Bewerber 6 erhält eine Zwischennachricht', 'Unwichtiges (2, 8) wird bewusst nachrangig behandelt', 'Begründungen sind nachvollziehbar'],
      sample: 'Sinnvolle Reihenfolge: 1 (heute 14 Uhr, Kunde wartet: Kalender prüfen, Chefin per Kurznachricht fragen, Kunde Zwischenstand bis 10 Uhr zusagen) → 4 (Frist Mittwoch: Belege heraussuchen und senden, sonst Chefin um Freigabe bitten) → 7 (Rechnung zur Freigabe vorlegen, Lieferant mitteilen, dass Zahlung veranlasst wird) → 6 (freundliche Zwischennachricht mit Termin für Rückmeldung; Personalverantwortliche informieren) → 3 (bis Freitag einplanen) → 5 (kurz beantworten) → 8 (Team informieren, Kalender) → 2 (ablegen/abbestellen). Andere Reihenfolgen sind vertretbar, wenn Fristen und Kundenwirkung begründet werden.',
    },
    {
      id: 'rechnung', title: 'Eingangsrechnung prüfen', role: 'buchhaltung', skills: ['rechnungspruefung'], minutes: 15, level: 'Mittel',
      brief: 'Prüfe die Rechnung auf formale und rechnerische Fehler. Liste jeden Fehler auf und schreibe, wie du weiter vorgehst.',
      material: [
        'Müller Bürotechnik GmbH, Hauptstr. 5, 10115 Berlin',
        'An: Sonnenschein Design GmbH, Gartenweg 12, 50667 Köln',
        'Rechnung — Datum: 03.09.2026',
        '1× Multifunktionsdrucker MX-500, Lieferung inkl. Installation',
        'Nettobetrag: 2.450,00 €',
        'zzgl. 19 % USt.: 456,50 €',
        'Gesamtbetrag: 2.906,50 €',
        'Zahlbar innerhalb von 14 Tagen. Bankverbindung: DE12 3456 7890 1234 5678 90',
      ],
      deliverable: 'Fehlerliste mit Begründung und nächstem Schritt.',
      rubric: ['Fehlende Rechnungsnummer erkannt', 'Fehlende Steuernummer bzw. USt-IdNr. erkannt', 'Fehlendes Liefer-/Leistungsdatum erkannt', 'Rechenfehler: 19 % von 2.450 € = 465,50 €, brutto 2.915,50 €', 'Vorgehen: berichtigte Rechnung anfordern, Vorsteuerabzug erst mit korrekter Rechnung, Zahlungsfrist im Blick'],
      sample: 'Fehler: (1) Rechnungsnummer fehlt. (2) Steuernummer oder USt-IdNr. des Lieferanten fehlt. (3) Zeitpunkt der Lieferung/Leistung fehlt (Angabe „Leistungsdatum entspricht Rechnungsdatum“ wäre zulässig). (4) USt. falsch: 2.450 € × 19 % = 465,50 € statt 456,50 €; brutto 2.915,50 € statt 2.906,50 €. Vorgehen: Lieferant schriftlich um berichtigte Rechnung bitten, Rechnung bis dahin nicht zur Zahlung freigeben bzw. Rücksprache zur Skonto-/Zahlungsfrist halten, Vorsteuer erst aus korrekter Rechnung ziehen. Hinweis: Ab 2027/2028 kommt die Rechnung im B2B-Inland als E-Rechnung.',
    },
    {
      id: 'brief', title: 'Geschäftsbrief nach DIN 5008 korrigieren', role: 'bueroassistenz', skills: ['korrespondenz'], minutes: 10, level: 'Einstieg',
      brief: 'Korrigiere den Briefausschnitt nach DIN 5008 und verbessere Stil und Verständlichkeit.',
      material: [
        'Betreff: Ihre Anfrage vom 22.09.2026',
        '',
        'Sehr geehrter Herr Schmidt,',
        '',
        'Wir bedanken uns recht herzlich für Ihre Anfrage und möchten Ihnen hiermit mitteilen, dass wir Ihnen das gewünschte Angebot in der Anlage beigefügt haben.',
        'Bei Rückfragen erreichen Sie mich unter 030/12345-67.',
        '',
        'Mit freundlichen Grüßen,',
      ],
      deliverable: 'Korrigierte Fassung und Liste der Änderungen.',
      rubric: ['„Betreff:“ entfernt (optional fett)', 'Text nach der Anrede beginnt klein („vielen Dank …“)', 'Telefonnummer funktional gegliedert (030 12345-67)', 'Komma nach Grußformel entfernt', 'Füllwörter/Doppelungen gekürzt („in der Anlage beigefügt“)'],
      sample: '**Ihre Anfrage vom 22.09.2026**\n\nSehr geehrter Herr Schmidt,\n\nvielen Dank für Ihre Anfrage. Das gewünschte Angebot finden Sie in der Anlage.\nBei Rückfragen erreichen Sie mich unter 030 12345-67.\n\nMit freundlichen Grüßen\n\nÄnderungen: Wort „Betreff“ gestrichen, Kleinschreibung nach Anrede, Doppelung „in der Anlage beigefügt“ und Floskeln gekürzt, Telefonnummer nach DIN 5008, Komma nach Grußformel entfernt.',
    },
    {
      id: 'erinnerung', title: 'Zahlungserinnerung formulieren', role: 'buchhaltung', skills: ['mahnwesen', 'korrespondenz'], minutes: 10, level: 'Einstieg',
      brief: 'Die Firma Kraus Logistik GmbH (Stammkunde) hat die Rechnung Nr. 2026-0815 vom 01.08.2026 über 3.570,00 € trotz Zahlungsziel 30 Tage noch nicht bezahlt. Schreibe eine freundliche, klare Zahlungserinnerung per E-Mail.',
      material: [],
      deliverable: 'E-Mail mit Betreff und Text.',
      rubric: ['Rechnungsnummer, -datum und Betrag genannt', 'Konkrete neue Frist mit Datum', 'Freundlicher, nicht vorwurfsvoller Ton gegenüber Stammkunden', 'Hinweis: Zahlung hat sich ggf. überschnitten', 'Kontaktmöglichkeit bei Rückfragen'],
      sample: 'Betreff: Zahlungserinnerung — Rechnung 2026-0815 vom 01.08.2026\n\nSehr geehrte Damen und Herren,\n\nsicher ist es im Tagesgeschäft untergegangen: Für unsere Rechnung Nr. 2026-0815 vom 01.08.2026 über 3.570,00 € konnten wir noch keinen Zahlungseingang feststellen. Wir bitten Sie, den Betrag bis zum [Datum, z. B. 10 Tage später] zu überweisen.\n\nSollte sich Ihre Zahlung mit dieser Nachricht überschnitten haben, betrachten Sie sie bitte als gegenstandslos. Bei Fragen erreichen Sie mich unter [Telefon].\n\nMit freundlichen Grüßen',
    },
    {
      id: 'termine', title: 'Terminkonflikt lösen', role: 'assistenz_gf', skills: ['termine', 'priorisierung', 'korrespondenz'], minutes: 15, level: 'Mittel',
      brief: 'Im Kalender deines Geschäftsführers gibt es für Donnerstag Konflikte. Schlage eine Lösung vor und formuliere die nötigen Nachrichten.',
      material: [
        '09:00–10:30 Bankgespräch Kreditverlängerung (extern, Termin vor 4 Wochen vereinbart)',
        '10:00–11:00 Jour fixe Vertrieb (intern, wöchentlich)',
        '11:00 Abfahrt zum Flughafen nötig (Flug 13:15 nach München, Kundentermin dort 16:00)',
        '12:00–12:30 Telefonat mit neuem Großkunden (vom GF selbst kurzfristig zugesagt)',
      ],
      deliverable: 'Neuer Ablauf für Donnerstag + kurze Nachrichten an die Betroffenen.',
      rubric: ['Externe/feste Termine (Bank, Flug, Kundentermin) bleiben', 'Jour fixe wird verschoben oder delegiert (z. B. Vertriebsleitung übernimmt)', 'Großkunden-Telefonat vor die Abfahrt, in die Fahrt (falls Fahrer) oder auf eine konkrete Alternative gelegt — Kunde wird aktiv informiert', 'Puffer und Wege berücksichtigt', 'Nachrichten sind kurz, konkret, mit Alternativterminen'],
      sample: 'Vorschlag: Bank 09:00–10:30 bleibt. Jour fixe entfällt für den GF — Vertriebsleitung leitet, GF erhält Kurzprotokoll; alternativ Freitag 09:00. Großkunde: 10:35–11:00 telefonieren (Kunde vorher fragen) oder während der Fahrt zum Flughafen, falls ein Fahrer fährt; sonst konkrete Alternative Freitag 10:00 anbieten. 11:00 Abfahrt bleibt. Nachrichten: an Vertriebsteam („Jour fixe Do ohne Herrn X, Leitung Frau Y, Protokoll bitte bis 14 Uhr“), an Großkunden („Wäre ein Vorziehen auf 10:35 Uhr möglich? Alternativ Fr 10 Uhr“), an GF (Übersicht des neuen Ablaufs).',
    },
    {
      id: 'protokoll', title: 'Ergebnisprotokoll aus Notizen', role: 'assistenz_gf', skills: ['protokoll', 'korrespondenz'], minutes: 15, level: 'Mittel',
      brief: 'Erstelle aus den Stichpunkten ein Ergebnisprotokoll mit Aufgabenliste.',
      material: [
        'Teamrunde 30.09.2026, anwesend: Frau Ali, Herr Novak, Frau Brandt (Protokoll)',
        '- Sommerfest: Budget 2.500 € freigegeben, Termin 20.06., Novak holt 3 Angebote Catering bis 31.10.',
        '- neues DMS: Testphase ab November, Ali spricht mit IT wegen Zugängen, Frist 15.10.',
        '- Telefonzeiten Empfang: bleiben, aber freitags nur bis 13 Uhr — Info an Kunden über Website, Brandt',
        '- nächste Runde 14.10., 9 Uhr',
      ],
      deliverable: 'Protokoll mit Kopf, Ergebnissen und Aufgabentabelle (Wer/Was/Bis wann).',
      rubric: ['Kopf mit Datum, Teilnehmenden, Protokollführung', 'Ergebnisse statt Diskussionsverlauf', 'Aufgaben vollständig mit Verantwortlichen und Fristen', 'Fehlende Frist (Website-Info) wird erkannt und nachgefragt oder sinnvoll ergänzt', 'Nächster Termin genannt'],
      sample: 'Ergebnisprotokoll Teamrunde, 30.09.2026 — Teilnehmende: Frau Ali, Herr Novak, Frau Brandt (Protokoll)\n\nErgebnisse: 1. Sommerfest am 20.06., Budget 2.500 € freigegeben. 2. Neues DMS: Testphase ab November. 3. Telefonzeiten Empfang bleiben, freitags nur bis 13 Uhr.\n\nAufgaben: Novak — 3 Catering-Angebote — 31.10. | Ali — IT-Zugänge DMS klären — 15.10. | Brandt — Website-Hinweis Freitagszeiten — Frist offen (Vorschlag: vor Gültigkeit, bitte bestätigen)\n\nNächste Runde: 14.10.2026, 9:00 Uhr.',
    },
    {
      id: 'reisekosten', title: 'Dienstreise abrechnen', role: 'assistenz_gf', skills: ['reisen', 'tabellen'], minutes: 15, level: 'Mittel',
      brief: 'Berechne die erstattungsfähigen Reisekosten nach den steuerlichen Pauschalen (Inland). Zeige deinen Rechenweg.',
      material: [
        'Abfahrt Di 07:00 Uhr von zu Hause, Rückkehr Mi 19:00 Uhr',
        'Privater Pkw, einfache Strecke 210 km',
        'Hotel 1 Nacht: 119,00 € laut Rechnung inklusive Frühstück, vom Unternehmen erstattet',
        'Keine weiteren Mahlzeiten gestellt',
      ],
      deliverable: 'Aufstellung Fahrtkosten, Übernachtung, Verpflegung und Summe.',
      rubric: ['Fahrtkosten 420 km × 0,30 € = 126,00 €', 'Übernachtung 119,00 € laut Beleg', 'Verpflegung: An- und Abreisetag je 14 €', 'Kürzung für gestelltes Frühstück am Mittwoch um 5,60 €', 'Summe 267,40 € mit nachvollziehbarem Rechenweg'],
      sample: 'Fahrtkosten: 2 × 210 km = 420 km × 0,30 € = 126,00 €. Übernachtung: 119,00 € (Beleg). Verpflegung: Dienstag (Anreisetag) 14,00 € + Mittwoch (Abreisetag) 14,00 € − 5,60 € (Frühstück, 20 % von 28 €) = 22,40 €. Summe: 267,40 €. Hinweis: Betriebliche Reiserichtlinien können abweichen.',
    },
    {
      id: 'ki_review', title: 'KI-Antwort fachlich prüfen (KI-Training)', role: 'ki_trainer_office', skills: ['ki_office', 'ablage', 'rechnungspruefung'], minutes: 15, level: 'Fortgeschritten',
      brief: 'Eine KI hat die folgende Antwort auf die Frage „Was muss ich bei Rechnungen 2026 beachten?“ gegeben. Finde alle fachlichen Fehler, korrigiere sie und bewerte die Antwort insgesamt auf einer Skala von 1 (unbrauchbar) bis 5 (fehlerfrei und hilfreich).',
      material: [
        '„Rechnungen müssen in Deutschland 10 Jahre aufbewahrt werden. Für Beträge bis 150 € reicht eine Kleinbetragsrechnung ohne Empfängerangaben. Seit 2025 gilt jede per E-Mail versandte PDF-Rechnung als E-Rechnung, deshalb müssen Sie nichts ändern. Auf jede Rechnung gehört außerdem Ihre Bankverbindung, sonst ist sie ungültig.“',
      ],
      deliverable: 'Fehlerliste mit Korrektur, Gesamtbewertung 1–5 mit Begründung, verbesserte Antwort.',
      rubric: ['Aufbewahrung: Buchungsbelege seit 2025 8 Jahre (nicht 10)', 'Kleinbetragsrechnung: bis 250 € (nicht 150 €)', 'PDF ist keine E-Rechnung; Empfangspflicht seit 2025, Ausstellungspflicht 2027/2028', 'Bankverbindung ist keine Pflichtangabe', 'Bewertung niedrig (1–2) und begründet', 'Verbesserte Antwort korrekt und verständlich'],
      sample: 'Fehler: (1) Rechnungen sind Buchungsbelege — seit 1.1.2025 gilt eine Aufbewahrungsfrist von 8 Jahren. (2) Kleinbetragsrechnung bis 250 € brutto, nicht 150 €. (3) Eine PDF-Rechnung ist keine E-Rechnung; seit 2025 müssen Unternehmen E-Rechnungen empfangen können, ausstellen ab 2027 (über 800.000 € Vorjahresumsatz) bzw. 2028. „Nichts ändern“ ist falsch. (4) Die Bankverbindung ist keine Pflichtangabe nach § 14 Abs. 4 UStG. Bewertung: 1/5 — vier sachliche Fehler, davon einer mit direkter Handlungsfolge (E-Rechnung). Verbesserte Antwort: Rechnungen 8 Jahre aufbewahren; bis 250 € vereinfachte Angaben; E-Rechnungen ab sofort empfangen können und Umstellung der eigenen Ausgangsrechnungen bis 2027/2028 planen; Pflichtangaben nach § 14 UStG prüfen.',
    },
    {
      id: 'datenpanne', title: 'Datenschutz-Vorfall richtig behandeln', role: 'office_manager', skills: ['datenschutz', 'kommunikation'], minutes: 10, level: 'Mittel',
      brief: 'Eine Kollegin hat um 9:15 Uhr versehentlich eine Excel-Liste mit Namen, Adressen und Geburtsdaten von 300 Kundinnen und Kunden an einen falschen externen Empfänger geschickt. Was tust du jetzt — in welcher Reihenfolge?',
      material: [],
      deliverable: 'Handlungsschritte in Reihenfolge mit kurzer Begründung.',
      rubric: ['Sofort Datenschutzbeauftragte/n bzw. Verantwortliche informieren', 'Empfänger kontaktieren und um Löschung + Bestätigung bitten', 'Vorfall dokumentieren (Zeit, Daten, Empfänger, Maßnahmen)', '72-Stunden-Frist für eine mögliche Meldung an die Aufsichtsbehörde nennen', 'Keine Vertuschung; Ursachen und Vorbeugung (z. B. Verteiler-/Anhangsprüfung) ansprechen'],
      sample: '1. Sofort Vorgesetzte und Datenschutzbeauftragte/n informieren — sie entscheiden über die Meldung. 2. Den Empfänger kontaktieren, um Löschung bitten und die Löschung schriftlich bestätigen lassen. 3. Vorfall dokumentieren: Uhrzeit, betroffene Daten, Anzahl Personen, Empfänger, Maßnahmen. 4. Fristen beachten: Meldung an die Aufsichtsbehörde möglichst binnen 72 Stunden, falls ein Risiko für die Betroffenen besteht; bei hohem Risiko auch die Betroffenen informieren. 5. Ursache klären und vorbeugen (z. B. Anhänge mit personenbezogenen Daten nur verschlüsselt, Empfänger-Autovervollständigung prüfen).',
    },
  ],

  projectTemplates: [
    { id: 'buero_teilzeit', title: 'Büroassistenz (Teilzeit)', type: 'employment', seniority: 'mid', description: 'Wir suchen eine Büroassistenz in Teilzeit (20 Std./Woche) für Korrespondenz, Terminorganisation, Ablage und Bestellwesen. Erste Erfahrung im Büro und sicherer Umgang mit Office-Programmen sind Voraussetzung.', skills: [['korrespondenz', 'must'], ['termine', 'must'], ['ablage', 'must'], ['tabellen', 'nice'], ['einkauf', 'nice']], hoursPerWeek: 20 },
    { id: 'virtuelle_assistenz', title: 'Virtuelle Assistenz für Geschäftsführung', type: 'freelance', seniority: 'mid', description: 'Remote-Unterstützung der Geschäftsführung: Postfach- und Kalendermanagement, Reiseplanung, Vorbereitung von Unterlagen. Ca. 10 Std./Woche, flexibel.', skills: [['termine', 'must'], ['priorisierung', 'must'], ['reisen', 'nice'], ['ki_office', 'nice']], hoursPerWeek: 10 },
    { id: 'kreditoren', title: 'Buchhaltung Kreditoren (Projekt)', type: 'freelance', seniority: 'senior', description: 'Für 3 Monate Unterstützung im Rechnungseingang: Prüfung von Eingangsrechnungen, Umstellung auf E-Rechnungsempfang, Abstimmung offener Posten.', skills: [['rechnungspruefung', 'must'], ['ablage', 'must'], ['tabellen', 'nice']], hoursPerWeek: 15 },
    { id: 'ki_training_office', title: 'KI-Training: Expert:in Büro & Verwaltung', type: 'expert_ai_training', seniority: 'expert', description: 'Bewertung und Korrektur von KI-Antworten zu Rechnungen, Aufbewahrung, Korrespondenz und Datenschutz; Erstellen von Musterlösungen. Remote, projektbasiert.', skills: [['ki_office', 'must'], ['rechnungspruefung', 'must'], ['korrespondenz', 'nice'], ['datenschutz', 'nice']], hoursPerWeek: 8 },
  ],

  interviewGuide: `Branchenkontext Büro & Verwaltung (Deutschland, Stand 10/2026):
- Typische Kompetenzen: Priorisierung paralleler Anfragen, Korrespondenz nach DIN 5008, Termin- und Reiseorganisation, Rechnungsprüfung (§ 14 Abs. 4 UStG), Mahnwesen, Ablage und Aufbewahrungsfristen, Datenschutz (DSGVO), Tabellenkalkulation, Umgang mit KI-Werkzeugen.
- Gute Praxisfragen: konkrete Situationen mit Zeitdruck, Fristen und mehreren Beteiligten; Umgang mit Fehlern (z. B. Fehlversand); Verbesserung eines Ablaufs.
- Für ai_review eignet sich eine plausibel klingende, aber falsche KI-Antwort, z. B. „Rechnungen 10 Jahre aufbewahren“ (korrekt: Buchungsbelege seit 2025 8 Jahre), „Kleinbetragsrechnung bis 150 €“ (korrekt: 250 €), „PDF per E-Mail ist eine E-Rechnung“ (falsch).
- Gesicherte Fakten für die Bewertung: Buchungsbelege 8 Jahre, Bücher/Jahresabschlüsse 10 Jahre, Geschäftsbriefe 6 Jahre; E-Rechnung: Empfang seit 2025 Pflicht, Ausstellung ab 2027 (> 800.000 € Vorjahresumsatz) bzw. 2028; Verzug spätestens 30 Tage nach Fälligkeit und Zugang; Verzugszins B2B 9, Verbraucher 5 Prozentpunkte über Basiszins, B2B-Pauschale 40 €; Datenpanne 72 Stunden; Verpflegung Inland 14 €/28 €, Pkw-Dienstreise 0,30 €/km.`,
}
