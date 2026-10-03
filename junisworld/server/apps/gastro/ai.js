// GastroFlow KI: Kochstudio, Betriebsplanung und Antwortentwürfe — mit den echten Daten des Restaurants als Kontext.
import { all, one } from '../../db.js'
import { aiCreate, aiText } from '../../lib/ai.js'
import { ALLERGENS, dishOut } from './service.js'

const SYSTEM = `Du bist GastroFlow KI, Fachassistenz für Gastronomiebetriebe in Deutschland (Küche, Service, Kalkulation, Einkauf, Personalplanung).
Grundsätze:
- Antworte auf Deutsch, konkret und umsetzbar, mit kurzen Abschnitten und Listen.
- Rechne nachvollziehbar: nenne Formeln und Annahmen. Erfinde keine Marktzahlen, Lieferantenpreise oder Studien; fehlen Daten, frage nach oder kennzeichne die Annahme.
- Nutze die mitgelieferten Betriebsdaten (Konzept, Karte, Lager, Kosten), wenn sie relevant sind.
- Fachstand (Deutschland, 2026): Speisen in der Gastronomie 7 % USt. (seit 1.1.2026 dauerhaft, auch vor Ort), Getränke 19 %. Wareneinsatzquote = Wareneinsatz ÷ Nettoverkaufspreis. 14 Hauptallergene nach LMIV: ${ALLERGENS.join(', ')} — Allergene bei neuen Gerichten immer benennen.
- Keine Rechts-, Steuer- oder Gesundheitsberatung im Einzelfall; bei Hygiene/HACCP auf betriebliche Pflichten und Fachstellen verweisen.`

const MODES = {
  general: 'Allgemeine Betriebsfrage',
  dish: 'Entwickle ein neues Gericht: Name, Gästetext (1–2 Sätze), Zutaten mit Mengen pro Portion, Zubereitung in Schritten, Anrichte-Idee, Allergene (LMIV), grobe Wareneinsatz-Kalkulation mit Formel und Preisvorschlag bei Ziel-Wareneinsatzquote. Fehlende Angaben als Annahmen kennzeichnen.',
  week: 'Erstelle einen 7-Tage-Plan (Gericht der Woche bzw. Tagesgerichte) mit saisonalen, möglichst regionalen Zutaten. Pro Tag: Gericht, Hauptzutaten, Saisonbegründung, Mise en place, Kalkulationshinweis, Gästetext, Allergene. Nutze Zutatenüberschneidungen, um Ausschuss zu vermeiden. Gib die Tage als Überschriften mit Datum aus.',
  tips: 'Analysiere das beschriebene Gericht/Konzept und gib konkrete Verbesserungen für Geschmack, Textur, Optik, Ablauf am Pass, Wareneinsatz und Ausschuss.',
  menu: 'Analysiere die aktuelle Speisekarte mit den gelieferten Wareneinsatzquoten: Welche Gerichte sind Ertragsstützen, welche Problemfälle (hohe Quote, geringer Deckungsbeitrag)? Konkrete Vorschläge zu Preis, Portion, Rezeptur oder Kartenposition — mit Rechnung.',
  planning: 'Betriebsplanung: Kapazität, Personal, Einkauf, Vorbereitung. Lege Annahmen offen und rechne transparent.',
}

export const AI_MODES = Object.keys(MODES)

function restaurantContext(restaurant) {
  const dishes = all('SELECT * FROM gastro_dishes WHERE restaurant_id = ? AND active = 1 ORDER BY category, position, name LIMIT 60', restaurant.id).map(dishOut)
  const low = all('SELECT name, stock, unit, reorder_level FROM gastro_ingredients WHERE restaurant_id = ? AND stock <= reorder_level ORDER BY name LIMIT 30', restaurant.id)
  const ingredients = all('SELECT name, unit, unit_cost FROM gastro_ingredients WHERE restaurant_id = ? ORDER BY name LIMIT 80', restaurant.id)
  const tables = one('SELECT COUNT(*) AS n, COALESCE(SUM(seats), 0) AS seats FROM gastro_tables WHERE restaurant_id = ?', restaurant.id)
  return [
    `Restaurant: ${restaurant.name}${restaurant.address ? `, ${restaurant.address}` : ''}`,
    `Konzept: ${restaurant.concept || 'nicht angegeben'}`,
    `Tische: ${tables.n}, Sitzplätze: ${tables.seats}`,
    dishes.length ? `Aktuelle Karte (Brutto-Preis | Wareneinsatz/Portion | Quote):\n${dishes.map((d) => `- [${d.category}] ${d.name}: ${d.price.toFixed(2)} € | ${d.costPerPortion != null ? `${d.costPerPortion.toFixed(2)} €` : 'ohne Rezept'} | ${d.foodCostPct != null ? `${d.foodCostPct} %` : '–'}`).join('\n')}` : 'Karte: noch keine Gerichte erfasst',
    ingredients.length ? `Lagerzutaten (Einkaufspreis je Einheit): ${ingredients.map((i) => `${i.name} ${i.unit_cost.toFixed(2)} €/${i.unit}`).join('; ')}` : '',
    low.length ? `Unter Meldebestand: ${low.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(', ')}` : '',
  ].filter(Boolean).join('\n')
}

export async function gastroAi(restaurant, { mode, prompt, context }) {
  const ctx = Object.entries(context || {}).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k}: ${v}`).join('\n')
  const msg = await aiCreate({
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: 'user', content: `Betriebsdaten:\n${restaurantContext(restaurant)}\n\nAufgabe (${mode}): ${MODES[mode]}\n${ctx ? `\nBriefing:\n${ctx}\n` : ''}${prompt ? `\nWunsch der Nutzerin/des Nutzers:\n${prompt}` : ''}` }],
  })
  return aiText(msg)
}

export async function feedbackReply(restaurant, fb) {
  const msg = await aiCreate({
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: 'user', content: `Formuliere eine kurze, persönliche Antwort des Restaurants „${restaurant.name}“ auf diese Gästebewertung (${fb.rating}/5 Sterne, Kanal: ${fb.channel}). Bedanke dich, gehe konkret auf den Inhalt ein, keine Ausreden, keine Versprechen, die das Team nicht halten kann, keine personenbezogenen Daten. 3–5 Sätze, nur der Antworttext.\n\nBewertung von ${fb.guest_name || 'Gast'}: „${fb.comment || '(ohne Text)'}“` }],
  })
  return aiText(msg).trim()
}
