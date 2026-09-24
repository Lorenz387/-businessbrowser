import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadUser, requireAuth } from './lib/auth.js'
import { ApiError } from './lib/http.js'
import { getStripe, syncSubscription } from './lib/billing.js'
import authRoutes from './routes/auth.js'
import coreRoutes from './routes/core.js'
import assistantRoutes from './routes/assistant.js'
import accountRoutes from './routes/account.js'
import orgRoutes from './routes/org.js'
import { PLANS } from './lib/plans.js'

const here = path.dirname(fileURLToPath(import.meta.url))

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('X-Frame-Options', 'DENY')
    next()
  })

  // Stripe webhook needs the raw body for signature verification.
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const stripe = getStripe()
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ error: 'billing_unavailable' })
    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)
    } catch {
      return res.status(400).json({ error: 'invalid_signature' })
    }
    try {
      if (event.type === 'checkout.session.completed' && event.data.object.subscription) {
        syncSubscription(await stripe.subscriptions.retrieve(event.data.object.subscription))
      } else if (event.type.startsWith('customer.subscription.')) {
        syncSubscription(event.data.object)
      }
      res.json({ received: true })
    } catch (e) {
      console.error('Stripe webhook failed', e)
      res.status(500).json({ error: 'webhook_failed' })
    }
  })

  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use(loadUser)

  // CSRF mitigation: state-changing API calls must be JSON or multipart from our own origin.
  app.use('/api', (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
    const ct = req.headers['content-type'] || ''
    if (req.method !== 'DELETE' && !ct.startsWith('application/json') && !ct.startsWith('multipart/form-data') && req.headers['content-length'] !== '0') {
      return next(new ApiError(415, 'unsupported_media', 'Ungültiges Anfrageformat.'))
    }
    const origin = req.headers.origin
    if (origin && process.env.APP_URL && !origin.startsWith(process.env.APP_URL.replace(/\/$/, '')) && process.env.NODE_ENV === 'production') {
      return next(new ApiError(403, 'forbidden_origin', 'Anfrage von unbekannter Herkunft.'))
    }
    next()
  })

  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.get('/api/plans', (_req, res) => res.json({ plans: Object.values(PLANS) }))
  app.get('/api/legal', (_req, res) => {
    const legal = { operator: process.env.LEGAL_OPERATOR_NAME || null, address: process.env.LEGAL_ADDRESS || null, email: process.env.LEGAL_EMAIL || null }
    res.json({ ...legal, complete: !!(legal.operator && legal.address && legal.email) })
  })
  app.use('/api/auth', authRoutes)
  app.use('/api', requireAuth, coreRoutes, assistantRoutes, accountRoutes, orgRoutes)
  app.use('/api', (_req, _res, next) => next(new ApiError(404, 'not_found', 'Diese Schnittstelle existiert nicht.')))

  // Serve the built frontend in production.
  const dist = path.join(here, '..', 'dist')
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }))
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.code, message: err.message, ...err.extra })
    if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'too_large', message: 'Die Datei ist zu groß (max. 20 MB).' })
    if (err?.status === 415) return res.status(415).json({ error: 'unsupported', message: err.message })
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_request', message: 'Die Anfrage enthält ungültiges JSON.' })
    console.error(err)
    res.status(500).json({ error: 'internal', message: 'Auf dem Server ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.' })
  })
  return app
}
