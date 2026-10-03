import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// Load junisworld/.env (if present) before any module reads configuration.
const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)
if (process.argv.includes('--production')) process.env.NODE_ENV = 'production'

const { createApp } = await import('./app.js')
const { startScheduler } = await import('./apps/scheduler.js')

const port = Number(process.env.PORT || 8787)
startScheduler()
createApp().listen(port, () => {
  console.log(`JunisWorld läuft auf http://localhost:${port}`)
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN && !process.env.GEMINI_API_KEY) console.log('Hinweis: Kein KI-Schlüssel (ANTHROPIC_API_KEY oder GEMINI_API_KEY) — Junis-AI-Funktionen zeigen einen Einrichtungshinweis.')
  if (!process.env.STRIPE_SECRET_KEY) console.log('Hinweis: STRIPE_SECRET_KEY fehlt — kostenpflichtige Tarife können nicht gebucht werden.')
})
