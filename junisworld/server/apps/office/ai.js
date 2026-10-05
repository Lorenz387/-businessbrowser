// KI im Büro-Assistenten: eingehende Dokumente einordnen und Briefe entwerfen. Ergebnisse sind Vorschläge zum Prüfen.
import { ApiError } from '../../lib/http.js'
import { aiCreate, aiText, BASE_SYSTEM } from '../../lib/ai.js'
import { CATEGORIES } from './service.js'

const CLASSIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'sender', 'category', 'summary', 'reference', 'deadline', 'amount', 'tasks', 'isContract'],
  properties: {
    title: { type: 'string', description: 'Kurzer, sprechender Titel, z. B. "Rechnung Bürobedarf Müller GmbH"' },
    sender: { type: 'string', description: 'Absender (Firma/Behörde/Person), leer wenn unklar' },
    category: { type: 'string', enum: Object.keys(CATEGORIES) },
    summary: { type: 'string', description: '2–3 Sätze: worum geht es, was wird verlangt' },
    reference: { type: 'string', description: 'Rechnungs-, Kunden-, Aktenzeichen oder Vertragsnummer; leer wenn keine' },
    deadline: { type: 'string', description: 'Wichtigste Frist im Dokument als YYYY-MM-DD (Zahlungsziel, Antwortfrist, Termin); leer wenn keine' },
    amount: { type: 'number', description: 'Zu zahlender Betrag in EUR (brutto), -1 wenn keiner' },
    tasks: {
      type: 'array',
      description: 'Konkrete Aufgaben, die sich aus dem Dokument ergeben (max. 4)',
      items: { type: 'object', additionalProperties: false, required: ['title', 'due'], properties: { title: { type: 'string' }, due: { type: 'string', description: 'YYYY-MM-DD oder leer' } } },
    },
    isContract: { type: 'boolean', description: 'Ist das Dokument ein Vertrag oder eine Vertragsbestätigung mit Laufzeit?' },
  },
}

export async function classifyDocument({ filename, mime, buffer, text }) {
  const content = []
  if (mime === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') } })
  else if (/^image\/(png|jpeg|gif|webp)$/.test(mime)) content.push({ type: 'image', source: { type: 'base64', media_type: mime, data: buffer.toString('base64') } })
  else if (text) content.push({ type: 'text', text: `Dokument „${filename}“:\n\n${text.slice(0, 60000)}` })
  else throw new ApiError(415, 'unsupported', 'Dieser Dateityp kann nicht ausgelesen werden. Unterstützt: PDF, Bilder, Textdateien.')
  content.push({ type: 'text', text: `Ordne dieses eingegangene Geschäftsdokument für die Büroorganisation ein. Heute ist ${new Date().toISOString().slice(0, 10)}. Nur Angaben, die im Dokument stehen — nichts erfinden; Unklares leer lassen bzw. -1.` })
  const msg = await aiCreate({ max_tokens: 4000, system: BASE_SYSTEM, messages: [{ role: 'user', content }], output_config: { format: { type: 'json_schema', schema: CLASSIFY_SCHEMA } } })
  try {
    const out = JSON.parse(aiText(msg))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(out.deadline)) out.deadline = ''
    out.tasks = (out.tasks || []).slice(0, 4).map((t) => ({ title: String(t.title).slice(0, 200), due: /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : '' }))
    return out
  } catch {
    throw new ApiError(502, 'ai_error', 'Junis AI hat eine unlesbare Antwort geliefert. Bitte erneut versuchen.')
  }
}

export async function draftLetter({ instruction, recipient, subject, sender, current }) {
  const prompt = `Schreibe den Text eines deutschen Geschäftsbriefs (nur Anrede bis Grußformel, ohne Adressfeld, ohne Datum, ohne Betreffzeile).
Regeln: DIN 5008 — Anrede mit Komma, danach kleiner Satzbeginn (außer Substantive), Grußformel „Mit freundlichen Grüßen“ ohne Satzzeichen. Klar, freundlich, ohne Floskeln. Keine erfundenen Fakten, Beträge oder Fristen — fehlende Angaben als {{platzhalter}} lassen.
Absender: ${sender || '-'}
Empfänger: ${recipient || '-'}
Betreff: ${subject || '-'}
${current ? `Bisheriger Entwurf (verbessern):\n${current}\n` : ''}Auftrag: ${instruction}`
  const msg = await aiCreate({ max_tokens: 2000, system: BASE_SYSTEM, messages: [{ role: 'user', content: prompt }] })
  return aiText(msg).trim()
}
