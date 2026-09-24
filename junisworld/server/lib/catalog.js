// JunisWorld curriculum catalog.
// This is product content (skill taxonomy, goal blueprints, career paths, missions)
// authored for JunisWorld — not user data. User progress lives in the database only.

const S = (id, name, category, subcategory, requires = [], description = '') => ({
  id, name, category, subcategory, requires, description,
})

export const SKILLS = [
  // Programmierung
  S('python-basics', 'Python Grundlagen', 'Programmierung', 'Python', [], 'Variablen, Datentypen, Kontrollstrukturen, Schleifen.'),
  S('python-functions', 'Python Funktionen & Module', 'Programmierung', 'Python', ['python-basics'], 'Funktionen, Parameter, Rückgabewerte, Module, Pakete.'),
  S('python-oop', 'Objektorientierung in Python', 'Programmierung', 'Python', ['python-functions'], 'Klassen, Objekte, Vererbung, Kapselung.'),
  S('js-basics', 'JavaScript Grundlagen', 'Programmierung', 'JavaScript', [], 'Syntax, Datentypen, Funktionen, Arrays, Objekte.'),
  S('html-css', 'HTML & CSS', 'Programmierung', 'Web', [], 'Semantisches HTML, Layout mit Flexbox und Grid, Responsive Design.'),
  S('dom', 'DOM & Browser-APIs', 'Programmierung', 'JavaScript', ['js-basics', 'html-css'], 'Elemente auswählen, Events, dynamische Oberflächen.'),
  S('react', 'React', 'Programmierung', 'Web', ['js-basics', 'dom'], 'Komponenten, State, Effekte, Datenfluss.'),
  S('json', 'JSON & Datenformate', 'Programmierung', 'Grundlagen', [], 'JSON lesen und schreiben, CSV, strukturierte Daten.'),
  S('apis', 'APIs & HTTP', 'Programmierung', 'Grundlagen', ['json'], 'HTTP-Methoden, Statuscodes, REST, Authentifizierung.'),
  S('error-handling', 'Fehlerbehandlung & Debugging', 'Programmierung', 'Grundlagen', [], 'Exceptions, Logging, systematisches Debuggen.'),
  S('backend-node', 'Backend mit Node.js', 'Programmierung', 'Backend', ['js-basics', 'apis'], 'Server, Routing, Middleware, Persistenz.'),
  S('databases', 'Datenbanken & Datenmodellierung', 'Programmierung', 'Backend', [], 'Tabellen, Beziehungen, Normalisierung, Indizes.'),
  S('git', 'Git & Versionskontrolle', 'Programmierung', 'Werkzeuge', [], 'Commits, Branches, Merges, Zusammenarbeit.'),
  S('testing', 'Softwaretests', 'Programmierung', 'Qualität', ['error-handling'], 'Unit-Tests, Integrationstests, Testabdeckung.'),
  S('deployment', 'Deployment & Hosting', 'Programmierung', 'Betrieb', ['git'], 'Build, Umgebungsvariablen, Hosting, Monitoring.'),
  // Daten & KI
  S('excel', 'Excel & Tabellenkalkulation', 'Daten', 'Werkzeuge', [], 'Formeln, Pivot-Tabellen, Diagramme, Datenbereinigung.'),
  S('sql', 'SQL', 'Daten', 'Datenbanken', [], 'SELECT, JOIN, Aggregation, Unterabfragen.'),
  S('pandas', 'Datenanalyse mit pandas', 'Daten', 'Python', ['python-functions'], 'DataFrames, Filtern, Gruppieren, Zusammenführen.'),
  S('data-viz', 'Datenvisualisierung', 'Daten', 'Kommunikation', [], 'Diagrammtypen, Lesbarkeit, Dashboards.'),
  S('statistics', 'Statistik', 'Daten', 'Mathematik', ['math-algebra'], 'Lage- und Streuungsmaße, Verteilungen, Tests, Regression.'),
  S('ml-basics', 'Machine Learning Grundlagen', 'Daten', 'Machine Learning', ['python-functions', 'statistics', 'linear-algebra', 'pandas'], 'Supervised/Unsupervised Learning, Trainings- und Testdaten.'),
  S('ml-models', 'Modellverständnis & Evaluation', 'Daten', 'Machine Learning', ['ml-basics'], 'Modellauswahl, Metriken, Overfitting, Validierung.'),
  S('deep-learning', 'Deep Learning', 'Daten', 'Machine Learning', ['ml-models', 'math-calculus'], 'Neuronale Netze, Backpropagation, Frameworks.'),
  S('ai-basics', 'KI-Grundlagen', 'Daten', 'KI', [], 'Was KI kann und nicht kann, Sprachmodelle, Grenzen und Risiken.'),
  S('prompting', 'Prompting & KI-Werkzeuge', 'Daten', 'KI', ['ai-basics'], 'Aufgaben präzise formulieren, Ergebnisse prüfen.'),
  S('automation', 'Automatisierungen bauen', 'Daten', 'KI', ['apis', 'json'], 'Workflows, Trigger, Integrationen zwischen Werkzeugen.'),
  // Mathematik
  S('math-arithmetic', 'Arithmetik & Bruchrechnung', 'Mathematik', 'Grundlagen', [], 'Grundrechenarten, Brüche, Prozent, Potenzen.'),
  S('math-algebra', 'Algebra & Gleichungen', 'Mathematik', 'Algebra', ['math-arithmetic'], 'Terme, lineare und quadratische Gleichungen.'),
  S('math-functions', 'Funktionen', 'Mathematik', 'Analysis', ['math-algebra'], 'Lineare, quadratische, Exponentialfunktionen.'),
  S('math-geometry', 'Geometrie', 'Mathematik', 'Geometrie', ['math-arithmetic'], 'Flächen, Körper, Pythagoras, Trigonometrie.'),
  S('math-calculus', 'Analysis (Differential- & Integralrechnung)', 'Mathematik', 'Analysis', ['math-functions'], 'Ableitungen, Kurvendiskussion, Integrale.'),
  S('linear-algebra', 'Lineare Algebra', 'Mathematik', 'Algebra', ['math-algebra'], 'Vektoren, Matrizen, lineare Gleichungssysteme.'),
  S('probability', 'Wahrscheinlichkeitsrechnung', 'Mathematik', 'Stochastik', ['math-arithmetic'], 'Zufallsexperimente, Baumdiagramme, Verteilungen.'),
  // Sprachen
  S('english-grammar', 'Englisch Grammatik', 'Sprachen', 'Englisch', [], 'Zeiten, Satzbau, Konditionalsätze.'),
  S('english-vocab', 'Englisch Wortschatz', 'Sprachen', 'Englisch', [], 'Alltags-, Fach- und Berufswortschatz.'),
  S('english-writing', 'Englisch Schreiben', 'Sprachen', 'Englisch', ['english-grammar', 'english-vocab'], 'E-Mails, Essays, Berichte.'),
  S('english-speaking', 'Englisch Sprechen', 'Sprachen', 'Englisch', ['english-vocab'], 'Gespräche, Präsentationen, Aussprache.'),
  // Kommunikation
  S('presenting', 'Präsentieren', 'Kommunikation', 'Vortrag', ['storytelling'], 'Aufbau, Auftreten, Umgang mit Fragen.'),
  S('storytelling', 'Storytelling & Argumentation', 'Kommunikation', 'Vortrag', [], 'Kernbotschaft, Struktur, überzeugende Argumente.'),
  S('slide-design', 'Foliengestaltung', 'Kommunikation', 'Vortrag', [], 'Klare Folien, Visualisierung, Reduktion.'),
  S('writing-de', 'Schriftlicher Ausdruck', 'Kommunikation', 'Schreiben', [], 'Klar strukturierte Texte, Zusammenfassungen, Berichte.'),
  // Business
  S('business-model', 'Geschäftsmodelle', 'Business', 'Strategie', [], 'Wertversprechen, Zielgruppe, Erlösmodell.'),
  S('market-analysis', 'Markt- & Wettbewerbsanalyse', 'Business', 'Strategie', [], 'Marktgröße, Wettbewerber, Positionierung.'),
  S('finance-basics', 'Finanzplanung', 'Business', 'Finanzen', ['math-arithmetic'], 'Kosten, Umsatzplanung, Liquidität, Break-even.'),
  S('marketing', 'Marketing Grundlagen', 'Business', 'Wachstum', [], 'Zielgruppen, Kanäle, Botschaften, Messung.'),
  S('sales', 'Vertrieb', 'Business', 'Wachstum', ['storytelling'], 'Bedarfsanalyse, Angebot, Abschluss.'),
  S('legal-basics', 'Rechtliche Grundlagen der Gründung', 'Business', 'Recht', [], 'Rechtsformen, Anmeldung, Pflichten (keine Rechtsberatung).'),
  S('product-mgmt', 'Produktmanagement', 'Business', 'Produkt', [], 'Problemverständnis, Priorisierung, Roadmaps.'),
  S('leadership', 'Führung', 'Business', 'Menschen', [], 'Ziele setzen, Feedback, Delegation.'),
  // Design
  S('ui-design', 'UI Design', 'Design', 'Interface', [], 'Typografie, Layout, Farben, Komponenten.'),
  S('ux-research', 'UX Research', 'Design', 'Forschung', [], 'Interviews, Usability-Tests, Personas.'),
  // Wissenschaft
  S('biology-cell', 'Zellbiologie', 'Naturwissenschaften', 'Biologie', [], 'Aufbau der Zelle, Organellen, Stoffwechsel.'),
  S('genetics', 'Genetik & Molekularbiologie', 'Naturwissenschaften', 'Biologie', ['biology-cell'], 'DNA, Proteinbiosynthese, Genregulation.'),
  S('chemistry-basics', 'Chemie Grundlagen', 'Naturwissenschaften', 'Chemie', [], 'Atombau, Bindungen, Reaktionen, Stöchiometrie.'),
  S('scientific-method', 'Wissenschaftliches Arbeiten', 'Naturwissenschaften', 'Methodik', [], 'Hypothesen, Experimente, Quellen, Auswertung.'),
  S('lab-methods', 'Labormethoden (Theorie)', 'Naturwissenschaften', 'Methodik', ['chemistry-basics', 'biology-cell'], 'PCR, Gelelektrophorese, Zellkultur — theoretische Grundlagen.'),
  // Selbstmanagement & Karriere
  S('learning-methods', 'Lernmethoden', 'Selbstmanagement', 'Lernen', [], 'Wiederholung, aktives Abrufen, Planung.'),
  S('time-management', 'Zeitmanagement', 'Selbstmanagement', 'Organisation', [], 'Priorisierung, Planung, Fokus.'),
  S('problem-solving', 'Problemlösen', 'Selbstmanagement', 'Denken', [], 'Probleme zerlegen, Hypothesen prüfen, Lösungen bewerten.'),
  S('job-application', 'Bewerbung & Lebenslauf', 'Karriere', 'Bewerbung', ['writing-de'], 'Lebenslauf, Anschreiben, Portfolio.'),
  S('interviewing', 'Vorstellungsgespräche', 'Karriere', 'Bewerbung', ['storytelling'], 'Vorbereitung, Antworten strukturieren, Rückfragen.'),
]

export const CATEGORIES = [...new Set(SKILLS.map((s) => s.category))]

const T = (id, title, description, targetState, skills, milestones) => ({
  id, title, description, targetState, skills, milestones,
})

// skills: [skillId, targetLevel (0–100)]
export const GOAL_TEMPLATES = [
  T('data-analyst', 'Data Analyst werden', 'Daten sammeln, bereinigen, analysieren und verständlich präsentieren.',
    'Eigenständig Datenanalysen mit SQL, Python und Visualisierungen durchführen und drei Projekte im Portfolio haben.',
    [['excel', 70], ['sql', 70], ['python-basics', 65], ['python-functions', 60], ['pandas', 60], ['statistics', 60], ['data-viz', 60]],
    ['SQL-Abfragen sicher schreiben', 'Erste Analyse mit pandas', 'Drei Analyseprojekte abschließen', 'Portfolio vorbereiten']),
  T('data-scientist', 'Data Scientist werden', 'Aus Daten Modelle und Vorhersagen entwickeln.',
    'Machine-Learning-Modelle bauen, evaluieren und Ergebnisse erklären können.',
    [['python-functions', 75], ['pandas', 70], ['sql', 60], ['statistics', 75], ['linear-algebra', 60], ['ml-basics', 65], ['ml-models', 60], ['data-viz', 60]],
    ['Datenanalyse-Grundlagen sicher', 'Statistik vertieft', 'Erstes ML-Modell evaluiert', 'ML-Projekt im Portfolio']),
  T('python-dev', 'Programmieren lernen (Python)', 'Mit Python eigene Programme und kleine Anwendungen schreiben.',
    'Eigene Python-Programme strukturieren, APIs nutzen und Fehler selbstständig beheben.',
    [['python-basics', 75], ['python-functions', 70], ['python-oop', 55], ['json', 60], ['apis', 55], ['error-handling', 60], ['git', 50]],
    ['Grundlagen sicher', 'Erstes eigenes Skript', 'API-Projekt abgeschlossen']),
  T('web-developer', 'Webentwickler werden', 'Moderne Weboberflächen und Anwendungen entwickeln.',
    'Responsive Webanwendungen mit React bauen und veröffentlichen.',
    [['html-css', 75], ['js-basics', 75], ['dom', 65], ['react', 60], ['apis', 55], ['git', 60], ['deployment', 50]],
    ['Erste statische Seite', 'Interaktive Seite mit JavaScript', 'React-App veröffentlicht']),
  T('saas', 'Eigenes SaaS entwickeln', 'Ein Softwareprodukt planen, bauen, veröffentlichen und vermarkten.',
    'Ein funktionierendes SaaS-Produkt mit ersten Nutzern.',
    [['product-mgmt', 60], ['js-basics', 65], ['react', 60], ['backend-node', 60], ['databases', 55], ['deployment', 55], ['business-model', 55], ['marketing', 50]],
    ['Problem validiert', 'MVP gebaut', 'Veröffentlicht', 'Erste Nutzer']),
  T('founder', 'Unternehmen gründen', 'Eine Geschäftsidee strukturiert prüfen und umsetzen.',
    'Ein geprüftes Geschäftsmodell mit Finanzplan und ersten Kunden.',
    [['business-model', 70], ['market-analysis', 65], ['finance-basics', 60], ['marketing', 55], ['sales', 55], ['legal-basics', 45], ['presenting', 55]],
    ['Geschäftsmodell formuliert', 'Markt analysiert', 'Finanzplan erstellt', 'Erste Kunden gewonnen']),
  T('math-school', 'Mathematik verbessern', 'Mathematische Grundlagen festigen und Lücken schließen.',
    'Aufgaben der Sekundarstufe sicher und selbstständig lösen.',
    [['math-arithmetic', 80], ['math-algebra', 70], ['math-functions', 65], ['math-geometry', 60], ['probability', 55]],
    ['Grundlagen gefestigt', 'Gleichungen sicher', 'Funktionen verstanden']),
  T('abitur-math', 'Abitur vorbereiten (Mathematik)', 'Gezielte Vorbereitung auf die Mathematik-Abiturprüfung.',
    'Prüfungsaufgaben aus Analysis, Analytischer Geometrie und Stochastik sicher lösen.',
    [['math-functions', 80], ['math-calculus', 75], ['linear-algebra', 65], ['probability', 70], ['learning-methods', 50]],
    ['Analysis sicher', 'Analytische Geometrie sicher', 'Stochastik sicher', 'Probeklausur unter Zeitdruck']),
  T('english', 'Englisch verbessern', 'Englisch sicherer lesen, schreiben und sprechen.',
    'Im Beruf oder Studium sicher auf Englisch kommunizieren.',
    [['english-grammar', 70], ['english-vocab', 70], ['english-writing', 65], ['english-speaking', 65]],
    ['Grammatik gefestigt', 'Wortschatz erweitert', 'Längeren Text geschrieben', 'Präsentation auf Englisch']),
  T('presenting', 'Präsentieren lernen', 'Überzeugend und strukturiert vor anderen sprechen.',
    'Klare Präsentationen planen, gestalten und souverän halten.',
    [['storytelling', 70], ['slide-design', 60], ['presenting', 70]],
    ['Kernbotschaft formulieren', 'Folien gestalten', 'Präsentation gehalten']),
  T('biotech', 'Biotechnologie studieren', 'Fachliche Grundlagen für ein Biotechnologie-Studium aufbauen.',
    'Mit soliden Grundlagen in Biologie, Chemie und Mathematik ins Studium starten.',
    [['biology-cell', 70], ['genetics', 60], ['chemistry-basics', 65], ['math-functions', 60], ['statistics', 50], ['scientific-method', 55], ['lab-methods', 40]],
    ['Zellbiologie sicher', 'Chemie-Grundlagen sicher', 'Experiment geplant']),
  T('ux-designer', 'UX/UI Designer werden', 'Nutzerzentrierte digitale Produkte gestalten.',
    'Nutzerprobleme erforschen und daraus gute Interfaces gestalten.',
    [['ux-research', 65], ['ui-design', 70], ['html-css', 45], ['storytelling', 50], ['product-mgmt', 40]],
    ['Erste Nutzerinterviews', 'Erstes Interface-Konzept', 'Fallstudie im Portfolio']),
  T('automation', 'Automatisierungen bauen', 'Wiederkehrende Abläufe mit Werkzeugen und APIs automatisieren.',
    'Eigene Automatisierungen entwerfen, bauen und zuverlässig betreiben.',
    [['json', 65], ['apis', 65], ['python-functions', 55], ['automation', 65], ['prompting', 55], ['error-handling', 50]],
    ['API verstanden', 'Erste Automatisierung', 'Automatisierung im Alltag im Einsatz']),
]

// Career paths: ordered steps. type: skill | project | role
export const CAREER_PATHS = [
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    field: 'Daten & KI',
    summary: 'Von Programmiergrundlagen über Datenanalyse zu Machine Learning.',
    routes: ['Studium (z. B. Informatik, Statistik, Mathematik, Data Science)', 'Quereinstieg über Data-Analyst-Rollen', 'Weiterbildung mit nachweisbaren Projekten'],
    specializations: ['Machine Learning Engineering', 'Analytics', 'NLP', 'Computer Vision'],
    steps: [
      { title: 'Python Grundlagen', type: 'skill', skills: ['python-basics', 'python-functions'] },
      { title: 'Datenanalyse', type: 'skill', skills: ['pandas', 'data-viz'] },
      { title: 'SQL', type: 'skill', skills: ['sql'] },
      { title: 'Statistik', type: 'skill', skills: ['statistics'] },
      { title: '3 praktische Projekte', type: 'project', skills: ['pandas', 'sql', 'data-viz'], count: 3 },
      { title: 'Junior Data Analyst', type: 'role', skills: [] },
      { title: 'Machine Learning', type: 'skill', skills: ['linear-algebra', 'ml-basics', 'ml-models'] },
      { title: 'Data Scientist', type: 'role', skills: [] },
    ],
  },
  {
    id: 'web-developer',
    title: 'Webentwickler',
    field: 'Software',
    summary: 'Von HTML und CSS zu interaktiven Webanwendungen.',
    routes: ['Ausbildung Fachinformatiker/in Anwendungsentwicklung', 'Studium Informatik / Medieninformatik', 'Quereinstieg mit Portfolio'],
    specializations: ['Frontend', 'Backend', 'Fullstack'],
    steps: [
      { title: 'HTML & CSS', type: 'skill', skills: ['html-css'] },
      { title: 'JavaScript', type: 'skill', skills: ['js-basics', 'dom'] },
      { title: 'Git', type: 'skill', skills: ['git'] },
      { title: 'React', type: 'skill', skills: ['react'] },
      { title: '3 veröffentlichte Projekte', type: 'project', skills: ['react', 'deployment'], count: 3 },
      { title: 'Junior Frontend Developer', type: 'role', skills: [] },
      { title: 'Backend & Datenbanken', type: 'skill', skills: ['backend-node', 'databases'] },
      { title: 'Fullstack Developer', type: 'role', skills: [] },
    ],
  },
  {
    id: 'founder',
    title: 'Gründer/in',
    field: 'Unternehmertum',
    summary: 'Von der Idee über das Geschäftsmodell zum ersten Kunden.',
    routes: ['Gründung neben Studium oder Beruf', 'Gründerstipendien und Inkubatoren', 'Gründung im Team'],
    specializations: ['Software/SaaS', 'Dienstleistung', 'Handel', 'Social Business'],
    steps: [
      { title: 'Geschäftsmodell', type: 'skill', skills: ['business-model'] },
      { title: 'Marktanalyse', type: 'skill', skills: ['market-analysis'] },
      { title: 'Finanzplan', type: 'skill', skills: ['finance-basics'] },
      { title: 'Pitch', type: 'skill', skills: ['presenting', 'storytelling'] },
      { title: 'Validierungsprojekt', type: 'project', skills: ['market-analysis', 'sales'], count: 1 },
      { title: 'Gründung', type: 'role', skills: ['legal-basics'] },
    ],
  },
  {
    id: 'ux-designer',
    title: 'UX/UI Designer',
    field: 'Design',
    summary: 'Von Nutzerforschung zu gestalteten Produkten.',
    routes: ['Studium Kommunikations- oder Interaktionsdesign', 'Quereinstieg mit Fallstudien-Portfolio'],
    specializations: ['UX Research', 'UI Design', 'Product Design'],
    steps: [
      { title: 'UX Research', type: 'skill', skills: ['ux-research'] },
      { title: 'UI Design', type: 'skill', skills: ['ui-design'] },
      { title: 'Grundlagen Web', type: 'skill', skills: ['html-css'] },
      { title: '2 Fallstudien', type: 'project', skills: ['ux-research', 'ui-design'], count: 2 },
      { title: 'Junior UX/UI Designer', type: 'role', skills: [] },
    ],
  },
  {
    id: 'automation-engineer',
    title: 'Automation Specialist',
    field: 'Daten & KI',
    summary: 'Abläufe mit APIs, Skripten und KI-Werkzeugen automatisieren.',
    routes: ['Weiterbildung im aktuellen Beruf', 'Quereinstieg über interne Automatisierungsprojekte'],
    specializations: ['Business Automation', 'KI-Workflows', 'Integrationen'],
    steps: [
      { title: 'JSON & APIs', type: 'skill', skills: ['json', 'apis'] },
      { title: 'Python', type: 'skill', skills: ['python-basics', 'python-functions'] },
      { title: 'KI-Werkzeuge', type: 'skill', skills: ['ai-basics', 'prompting'] },
      { title: 'Automatisierungen', type: 'skill', skills: ['automation', 'error-handling'] },
      { title: '2 produktive Automatisierungen', type: 'project', skills: ['automation'], count: 2 },
      { title: 'Automation Specialist', type: 'role', skills: [] },
    ],
  },
]

const M = (id, title, summary, skills, level, hours, steps, result) => ({
  id, title, summary, skills, level, hours, steps, result,
})

export const MISSIONS = [
  M('weather-app', 'Baue deine erste Wetter-App', 'Rufe echte Wetterdaten über eine API ab und zeige sie in einer eigenen Oberfläche an.',
    ['python-functions', 'apis', 'json', 'error-handling'], 'Einsteiger', 6, [
      { title: 'Grundlagen klären', detail: 'Wiederhole Funktionen, Dictionaries und Listen in Python.', deliverable: 'Kurze Notiz: Welche Python-Konzepte brauchst du?' },
      { title: 'API verstehen', detail: 'Wähle eine frei nutzbare Wetter-API (z. B. Open-Meteo) und lies die Dokumentation.', deliverable: 'Beispiel-URL und Beschreibung der Antwortfelder.' },
      { title: 'Daten abrufen', detail: 'Rufe die aktuellen Wetterdaten für deine Stadt ab und extrahiere Temperatur und Wetterlage.', deliverable: 'Funktionierendes Skript mit Ausgabe.' },
      { title: 'Interface bauen', detail: 'Baue eine einfache Oberfläche (Kommandozeile, Web oder GUI) für die Stadtauswahl.', deliverable: 'Screenshot oder Link.' },
      { title: 'Fehler testen', detail: 'Teste falsche Städtenamen, fehlendes Internet und ungültige Antworten.', deliverable: 'Liste der getesteten Fehlerfälle.' },
      { title: 'Ergebnis präsentieren', detail: 'Beschreibe, was du gebaut hast, was du gelernt hast und was du verbessern würdest.', deliverable: 'Kurze Projektbeschreibung.' },
    ], 'Eine funktionierende Wetter-App mit Fehlerbehandlung.'),
  M('company-analysis', 'Analysiere ein Unternehmen', 'Untersuche Geschäftsmodell, Markt und Wettbewerb eines realen Unternehmens.',
    ['business-model', 'market-analysis', 'writing-de'], 'Einsteiger', 5, [
      { title: 'Unternehmen wählen', detail: 'Wähle ein Unternehmen mit öffentlich zugänglichen Informationen.', deliverable: 'Begründung der Auswahl.' },
      { title: 'Geschäftsmodell beschreiben', detail: 'Wertversprechen, Kunden, Kanäle und Erlösquellen.', deliverable: 'Business Model Canvas.' },
      { title: 'Markt und Wettbewerb', detail: 'Identifiziere 3 Wettbewerber und vergleiche sie.', deliverable: 'Vergleichstabelle mit Quellen.' },
      { title: 'Stärken und Risiken', detail: 'Leite Stärken, Schwächen, Chancen und Risiken ab.', deliverable: 'SWOT-Analyse.' },
      { title: 'Bericht schreiben', detail: 'Fasse deine Analyse mit Quellen zusammen.', deliverable: 'Bericht (1–3 Seiten).' },
    ], 'Ein quellenbasierter Analysebericht.'),
  M('experiment-plan', 'Plane ein wissenschaftliches Experiment', 'Formuliere eine Hypothese und plane ein Experiment, das sie überprüft.',
    ['scientific-method', 'statistics', 'writing-de'], 'Fortgeschritten', 5, [
      { title: 'Fragestellung', detail: 'Formuliere eine überprüfbare Forschungsfrage.', deliverable: 'Forschungsfrage.' },
      { title: 'Hypothese', detail: 'Formuliere Hypothese und Nullhypothese.', deliverable: 'Hypothesen.' },
      { title: 'Versuchsaufbau', detail: 'Variablen, Kontrollgruppe, Material, Ablauf.', deliverable: 'Versuchsprotokoll-Entwurf.' },
      { title: 'Auswertung planen', detail: 'Welche Daten werden erhoben und wie werden sie ausgewertet?', deliverable: 'Auswertungsplan.' },
      { title: 'Risiken & Grenzen', detail: 'Mögliche Fehlerquellen und Sicherheitsaspekte.', deliverable: 'Liste der Fehlerquellen.' },
    ], 'Ein vollständiger Experimentplan.'),
  M('presentation', 'Erstelle und halte eine Präsentation', 'Plane eine 5-Minuten-Präsentation zu einem Thema deiner Wahl.',
    ['storytelling', 'slide-design', 'presenting'], 'Einsteiger', 4, [
      { title: 'Kernbotschaft', detail: 'Was sollen Zuhörer in einem Satz mitnehmen?', deliverable: 'Kernbotschaft.' },
      { title: 'Struktur', detail: 'Einstieg, Hauptteil mit 3 Punkten, Abschluss.', deliverable: 'Gliederung.' },
      { title: 'Folien', detail: 'Maximal 7 klare Folien.', deliverable: 'Foliensatz.' },
      { title: 'Probe', detail: 'Halte die Präsentation laut und stoppe die Zeit.', deliverable: 'Dauer und Verbesserungsnotizen.' },
      { title: 'Feedback', detail: 'Halte sie vor mindestens einer Person und sammle Feedback.', deliverable: 'Feedback-Notizen.' },
    ], 'Eine gehaltene Präsentation mit Feedback.'),
  M('landing-page', 'Entwickle eine Landingpage', 'Baue eine responsive Landingpage für ein Produkt oder Projekt.',
    ['html-css', 'ui-design', 'js-basics', 'deployment'], 'Einsteiger', 8, [
      { title: 'Ziel & Zielgruppe', detail: 'Für wen ist die Seite und was sollen Besucher tun?', deliverable: 'Kurzbriefing.' },
      { title: 'Struktur & Texte', detail: 'Abschnitte und Texte entwerfen.', deliverable: 'Wireframe mit Texten.' },
      { title: 'Umsetzung', detail: 'HTML und CSS, responsive für Mobilgeräte.', deliverable: 'Code.' },
      { title: 'Interaktion', detail: 'Ein interaktives Element mit JavaScript (z. B. Formularvalidierung).', deliverable: 'Funktionierendes Element.' },
      { title: 'Veröffentlichen', detail: 'Seite öffentlich erreichbar machen.', deliverable: 'Link.' },
    ], 'Eine veröffentlichte, responsive Landingpage.'),
  M('data-analysis', 'Führe eine Datenanalyse durch', 'Analysiere einen öffentlichen Datensatz und beantworte eine konkrete Frage.',
    ['pandas', 'statistics', 'data-viz'], 'Fortgeschritten', 8, [
      { title: 'Frage & Datensatz', detail: 'Formuliere eine Frage und wähle einen offenen Datensatz.', deliverable: 'Frage und Quelle des Datensatzes.' },
      { title: 'Daten bereinigen', detail: 'Fehlende Werte, Datentypen, Ausreißer.', deliverable: 'Bereinigungsschritte.' },
      { title: 'Explorative Analyse', detail: 'Verteilungen, Zusammenhänge, Gruppen.', deliverable: 'Erkenntnisse mit Kennzahlen.' },
      { title: 'Visualisierung', detail: '2–4 aussagekräftige Diagramme.', deliverable: 'Diagramme.' },
      { title: 'Fazit', detail: 'Beantworte die Frage und nenne Grenzen der Analyse.', deliverable: 'Analysebericht.' },
    ], 'Ein reproduzierbarer Analysebericht.'),
  M('finance-plan', 'Erstelle einen Finanzplan', 'Plane Kosten, Umsätze und Liquidität für eine Geschäftsidee über 12 Monate.',
    ['finance-basics', 'excel', 'business-model'], 'Einsteiger', 5, [
      { title: 'Annahmen', detail: 'Preise, Absatzmengen, Kosten — begründet.', deliverable: 'Annahmenliste.' },
      { title: 'Kostenplan', detail: 'Fixe und variable Kosten.', deliverable: 'Kostentabelle.' },
      { title: 'Umsatzplan', detail: 'Monatliche Umsatzplanung.', deliverable: 'Umsatztabelle.' },
      { title: 'Liquidität', detail: 'Monatlicher Kontostand und Break-even.', deliverable: 'Liquiditätsplan.' },
      { title: 'Szenarien', detail: 'Bester, realistischer und schlechter Fall.', deliverable: 'Szenariovergleich.' },
    ], 'Ein 12-Monats-Finanzplan mit Szenarien.'),
  M('application-sim', 'Simuliere eine Bewerbung', 'Bereite dich auf eine reale Stellenausschreibung vor.',
    ['job-application', 'interviewing', 'writing-de'], 'Einsteiger', 4, [
      { title: 'Ausschreibung wählen', detail: 'Wähle eine reale Ausschreibung, die zu deinem Ziel passt.', deliverable: 'Link und Anforderungen.' },
      { title: 'Abgleich', detail: 'Vergleiche Anforderungen mit deinem Skill Graph.', deliverable: 'Abgleichstabelle.' },
      { title: 'Unterlagen', detail: 'Lebenslauf und Anschreiben passend formulieren.', deliverable: 'Entwurf.' },
      { title: 'Interview-Probe', detail: 'Übe typische Fragen mit Junis AI.', deliverable: 'Notizen zu deinen Antworten.' },
    ], 'Bewerbungsunterlagen und Interview-Vorbereitung.'),
  M('first-automation', 'Baue deine erste Automatisierung', 'Automatisiere einen wiederkehrenden Ablauf aus deinem Alltag.',
    ['automation', 'apis', 'json', 'error-handling'], 'Fortgeschritten', 6, [
      { title: 'Ablauf wählen', detail: 'Welcher Ablauf kostet regelmäßig Zeit?', deliverable: 'Beschreibung des Ablaufs.' },
      { title: 'Werkzeuge & APIs', detail: 'Welche Dienste und Schnittstellen sind beteiligt?', deliverable: 'Übersicht der Schnittstellen.' },
      { title: 'Umsetzung', detail: 'Baue die Automatisierung als Skript oder Workflow.', deliverable: 'Funktionierende Automatisierung.' },
      { title: 'Fehlerfälle', detail: 'Was passiert, wenn ein Dienst nicht antwortet?', deliverable: 'Getestete Fehlerfälle.' },
      { title: 'Betrieb', detail: 'Eine Woche nutzen und Ergebnis messen.', deliverable: 'Erfahrungsbericht mit gesparter Zeit.' },
    ], 'Eine produktiv genutzte Automatisierung.'),
]

const skillMap = new Map(SKILLS.map((s) => [s.id, s]))
export const getCatalogSkill = (id) => skillMap.get(id)
export const getTemplate = (id) => GOAL_TEMPLATES.find((t) => t.id === id)
export const getMission = (id) => MISSIONS.find((m) => m.id === id)
export const getCareerPath = (id) => CAREER_PATHS.find((c) => c.id === id)

/** Skills that depend (directly) on the given skill. */
export const dependents = (id) => SKILLS.filter((s) => s.requires.includes(id)).map((s) => s.id)
