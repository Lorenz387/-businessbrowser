import { createApp } from './app.js'

const port = Number(process.env.PORT || 8787)
createApp().listen(port, () => {
  console.log(`JunisWorld API läuft auf http://localhost:${port}`)
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) console.log('Hinweis: ANTHROPIC_API_KEY fehlt — Junis-AI-Funktionen zeigen einen Einrichtungshinweis.')
  if (!process.env.STRIPE_SECRET_KEY) console.log('Hinweis: STRIPE_SECRET_KEY fehlt — kostenpflichtige Tarife können nicht gebucht werden.')
})
