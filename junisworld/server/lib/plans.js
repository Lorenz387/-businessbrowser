// Plan definitions and entitlements. Prices must match the Stripe prices configured
// via STRIPE_PRICE_* environment variables — see README.

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    monthly: 0,
    yearly: 0,
    perSeat: false,
    summary: 'Zum Kennenlernen: Basis-Junis-AI, erster Skill Scan und Zielplanung.',
    features: ['Basis Junis AI', 'Skill Scan & Basis-Skill-Graph', 'Basis-Zielplanung (2 Ziele)', '3 Lektionen pro Tag', '1 aktive Mission'],
    limits: { goals: 2, projects: 2, activeMissions: 1, aiMessagesPerDay: 15, lessonsPerDay: 3, monthlyCredits: 0 },
    flags: { adaptive: false, memory: false, documents: false, career: false, research: false, portfolio: false, verification: false, fullGap: false },
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    monthly: 12.99,
    yearly: 129,
    perSeat: false,
    summary: 'Für kontinuierliches Lernen mit adaptiven Lernpfaden und Projekten.',
    features: ['Vollständige Lernpfade', 'Adaptives Lernen', 'Junis Memory', 'Projekte & Missions', 'Erweiterter Skill Graph', 'Dokumentanalyse', 'Mehr Junis AI (100 Nachrichten/Tag)', '20 Credits pro Monat'],
    limits: { goals: 5, projects: 10, activeMissions: 5, aiMessagesPerDay: 100, lessonsPerDay: 20, monthlyCredits: 20 },
    flags: { adaptive: true, memory: true, documents: true, career: false, research: false, portfolio: false, verification: false, fullGap: false },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthly: 24.99,
    yearly: 249,
    perSeat: false,
    summary: 'Für Karriereentwicklung mit Nachweisen, Research und Portfolio.',
    features: ['Alles aus Plus', 'Career Intelligence', 'Vollständige Skill-Gap-Analyse', 'Junis Research', 'Portfolio', 'Skill Verification', 'Umfangreiche Projekte', '300 Nachrichten/Tag', '100 Credits pro Monat'],
    limits: { goals: 20, projects: 50, activeMissions: 20, aiMessagesPerDay: 300, lessonsPerDay: 60, monthlyCredits: 100 },
    flags: { adaptive: true, memory: true, documents: true, career: true, research: true, portfolio: true, verification: true, fullGap: true },
  },
  family: {
    id: 'family',
    name: 'Family',
    monthly: 29.99,
    yearly: 299,
    perSeat: false,
    seats: 5,
    summary: 'Bis zu 5 getrennte Profile mit Plus-Funktionen. Keine gegenseitige Einsicht in persönliche Inhalte.',
    features: ['Bis zu 5 Nutzerprofile', 'Plus-Funktionen für alle Mitglieder', 'Strikt getrennte persönliche Daten'],
    limits: { goals: 5, projects: 10, activeMissions: 5, aiMessagesPerDay: 100, lessonsPerDay: 20, monthlyCredits: 20 },
    flags: { adaptive: true, memory: true, documents: true, career: false, research: false, portfolio: false, verification: false, fullGap: false },
  },
  teams: {
    id: 'teams',
    name: 'Teams',
    monthly: 15,
    yearly: 150,
    perSeat: true,
    summary: 'Für Teams: Team Skill Graph, Lernprogramme und Admin-Dashboard.',
    features: ['Pro-Funktionen für alle Mitglieder', 'Team Skill Graph', 'Lernprogramme', 'Admin Dashboard', 'Rollenverwaltung', 'Organisationswissen'],
    limits: { goals: 20, projects: 50, activeMissions: 20, aiMessagesPerDay: 300, lessonsPerDay: 60, monthlyCredits: 100 },
    flags: { adaptive: true, memory: true, documents: true, career: true, research: true, portfolio: true, verification: true, fullGap: true },
  },
  business: {
    id: 'business',
    name: 'Business',
    monthly: 25,
    yearly: 250,
    perSeat: true,
    summary: 'Für größere Organisationen mit Analytics und eigenen Lernprogrammen.',
    features: ['Alles aus Teams', 'Organisations-Analytics', 'Organisations-Skill-Graph über alle Teams', 'Eigene Lernprogramme je Team'],
    limits: { goals: 20, projects: 50, activeMissions: 20, aiMessagesPerDay: 300, lessonsPerDay: 60, monthlyCredits: 150 },
    flags: { adaptive: true, memory: true, documents: true, career: true, research: true, portfolio: true, verification: true, fullGap: true },
  },
}

export const CREDIT_COSTS = {
  research_standard: 5,
  research_deep: 15,
  document_large: 3,
}

export const FEATURE_LABELS = {
  adaptive: 'Adaptives Lernen',
  memory: 'Junis Memory',
  documents: 'Dokumentanalyse',
  career: 'Career Intelligence',
  research: 'Junis Research',
  portfolio: 'Portfolio',
  verification: 'Skill Verification',
  fullGap: 'Vollständige Skill-Gap-Analyse',
}

/** Minimum individual plan that unlocks a feature flag. */
export function minPlanFor(flag) {
  for (const id of ['plus', 'pro']) if (PLANS[id].flags[flag]) return id
  return 'pro'
}
