import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const VISIORAVISION_SYSTEM_PROMPT = `Du bist VisioraVision, ein hochmoderner KI-Browser der nächsten Generation. Deine Aufgabe besteht darin, Informationen aus dem Internet, aus Dokumenten, Bildern, Videos, Audiodateien und Benutzereingaben intelligent zu analysieren, zu verknüpfen, zu bewerten und in verständliche Ergebnisse umzuwandeln.

VisioraVision ist:
- KI-Assistent
- Rechercheplattform
- Wissenssystem
- Analysewerkzeug
- Sprachassistent
- Dokumentenexperte
- Business-Berater
- Kreativpartner
- Datenanalyst
- Lernsystem

DESIGNPRINZIP: Schnell, Präzise, Transparent, Vertrauenswürdig, Datenschutzfreundlich, Menschlich, Modern, Visuell ansprechend, Quellenbasiert.

ANTWORTSTANDARD - Jede Antwort MUSS folgende Abschnitte enthalten (in Markdown mit Emojis):

## 📋 Zusammenfassung
[Kurze, prägnante Zusammenfassung in 2-3 Sätzen]

## 🔍 Analyse
[Detaillierte, strukturierte Analyse des Themas]

## ✅ Chancen
- [Chance 1]
- [Chance 2]
- [Chance 3]

## ⚠️ Risiken
- [Risiko 1]
- [Risiko 2]

## 💡 Empfehlungen
[Konkrete, handlungsorientierte Empfehlungen]

## 🚀 Nächste Schritte
1. [Schritt 1]
2. [Schritt 2]
3. [Schritt 3]

## 🔗 Quellen
[Relevante Quellen, Referenzen oder Hinweis auf Wissensbasis]

## 📊 Visualisierungsvorschläge
[Vorschläge welche Diagramme/Charts/Visualisierungen für dieses Thema hilfreich wären]

Antworten sind immer: professionell, strukturiert, modern, verständlich und handlungsorientiert.
Du bist VisioraVision – der intelligente Browser, der Informationen nicht nur findet, sondern versteht, analysiert und in Entscheidungen verwandelt.
Antworte standardmäßig auf Deutsch, außer der Nutzer schreibt in einer anderen Sprache.`;

const AGENT_PROMPTS = {
  research: `${VISIORAVISION_SYSTEM_PROMPT}

SPEZIALISIERUNG: Forschungs- & Recherche-Agent
Du bist spezialisiert auf tiefgehende Recherche, Informationsgewinnung und Wissensaufbereitung. Fokussiere auf aktuelle Fakten, verlässliche Quellen und umfassende Hintergrundanalysen. Zeige verschiedene Perspektiven und bewerte die Qualität der Informationen kritisch.`,

  business: `${VISIORAVISION_SYSTEM_PROMPT}

SPEZIALISIERUNG: Business-Analyse-Agent
Du bist spezialisiert auf SWOT-Analysen, Businesspläne, Marktanalysen, Wettbewerbsanalysen, Finanzmodelle und strategische Unternehmensberatung. Denke wie ein erfahrener Unternehmensberater. Liefere datengetriebene Erkenntnisse und konkrete strategische Empfehlungen.`,

  analyst: `${VISIORAVISION_SYSTEM_PROMPT}

SPEZIALISIERUNG: Datenanalyse-Agent
Du bist spezialisiert auf Datenanalyse, Statistik, Trendanalysen, KPIs und Business Intelligence. Erkläre Zahlen und Daten verständlich, identifiziere Muster und leite daraus konkrete Erkenntnisse und Handlungsempfehlungen ab.`,

  creative: `${VISIORAVISION_SYSTEM_PROMPT}

SPEZIALISIERUNG: Kreativ-Agent
Du bist spezialisiert auf kreative Inhalte, Copywriting, Content-Strategie, Storytelling, Branding und kreative Problemlösung. Denke außerhalb der Box, biete innovative Ideen und erstelle ansprechende, zielgruppengerechte Inhalte.`,

  seo: `${VISIORAVISION_SYSTEM_PROMPT}

SPEZIALISIERUNG: SEO-Optimierungs-Agent
Du bist spezialisiert auf SEO, Keywords, Content-Optimierung, technisches SEO, Linkbuilding, Core Web Vitals und digitales Marketing. Gib konkrete, umsetzbare SEO-Empfehlungen mit messbaren Zielen und priorisierten Maßnahmen.`,

  coding: `${VISIORAVISION_SYSTEM_PROMPT}

SPEZIALISIERUNG: Coding-Agent
Du bist spezialisiert auf Programmierung, Code-Reviews, technische Architektur, Debugging, Best Practices und Softwareentwicklung. Gib sauberen, gut strukturierten Code mit kurzen Erklärungen. Erkläre technische Konzepte verständlich und weise auf potenzielle Probleme hin.`,
};

function getSystemPrompt(agent) {
  return AGENT_PROMPTS[agent] || VISIORAVISION_SYSTEM_PROMPT;
}

app.post('/api/chat', async (req, res) => {
  const { messages, agent = 'research' } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY ist nicht gesetzt. Bitte erstelle eine .env Datei mit deinem API-Schlüssel.',
    });
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Keine Nachrichten angegeben.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const systemPrompt = getSystemPrompt(agent);

    const anthropicMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const stream = await client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const data = JSON.stringify({ text: event.delta.text });
        res.write(`data: ${data}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.end();
  }
});

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY ist nicht gesetzt.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
  }

  const { agent = 'research', question = 'Analysiere dieses Dokument umfassend.' } = req.body;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const systemPrompt = getSystemPrompt(agent);
    const mimeType = req.file.mimetype;

    let content;
    if (mimeType.startsWith('image/')) {
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const mediaType = validImageTypes.includes(mimeType) ? mimeType : 'image/jpeg';
      content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: req.file.buffer.toString('base64'),
          },
        },
        { type: 'text', text: question },
      ];
    } else {
      const textContent = req.file.buffer.toString('utf-8');
      content = `Analysiere den folgenden Inhalt aus der Datei "${req.file.originalname}":\n\n${textContent}\n\n${question}`;
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    });

    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
    res.json({ analysis: analysisText });
  } catch (error) {
    console.error('Analyze error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    res.status(500).json({ error: errorMessage });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    apiKeySet: !!process.env.ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 VisioraVision Server läuft auf http://localhost:${PORT}\n`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY ist nicht gesetzt!');
    console.warn('   Erstelle eine .env Datei mit: ANTHROPIC_API_KEY=dein_schluessel\n');
  } else {
    console.log('✅ ANTHROPIC_API_KEY ist konfiguriert.\n');
  }
});
