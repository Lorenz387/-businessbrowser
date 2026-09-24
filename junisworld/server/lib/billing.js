import Stripe from 'stripe'
import { one, run } from '../db.js'
import { PLANS } from './plans.js'

let stripe = null
export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY
}
export function getStripe() {
  if (!stripeConfigured()) return null
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY)
  return stripe
}

/** Stripe price id for plan + cycle, e.g. STRIPE_PRICE_PLUS_MONTHLY. */
export function priceId(plan, cycle) {
  return process.env[`STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}`] || null
}

/** Reverse lookup: which plan/cycle does a Stripe price id belong to? */
export function planForPrice(id) {
  for (const plan of Object.keys(PLANS)) {
    for (const cycle of ['monthly', 'yearly']) if (priceId(plan, cycle) === id) return { plan, cycle }
  }
  return null
}

export function appUrl() {
  return (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
}

/** Apply a Stripe subscription object to a user or organization. */
export function syncSubscription(sub) {
  const item = sub.items?.data?.[0]
  const mapped = item ? planForPrice(item.price.id) : null
  const periodEnd = item?.current_period_end ?? sub.current_period_end
  const end = periodEnd ? new Date(periodEnd * 1000).toISOString() : null
  const status = sub.status
  const orgId = sub.metadata?.org_id ? Number(sub.metadata.org_id) : null
  if (orgId) {
    const active = ['active', 'trialing', 'past_due'].includes(status)
    run('UPDATE organizations SET plan = ?, seats = ? WHERE id = ?', active && mapped ? mapped.plan : 'pending', item?.quantity ?? 1, orgId)
    return
  }
  const userId = Number(sub.metadata?.user_id) || one('SELECT user_id FROM subscriptions WHERE stripe_customer_id = ?', sub.customer)?.user_id
  if (!userId) return
  const plan = ['active', 'trialing', 'past_due'].includes(status) && mapped ? mapped.plan : 'free'
  run(
    `UPDATE subscriptions SET plan = ?, status = ?, billing_cycle = ?, current_period_end = ?, cancel_at_period_end = ?,
     stripe_subscription_id = ?, stripe_customer_id = ?, updated_at = datetime('now') WHERE user_id = ?`,
    plan, status === 'canceled' ? 'active' : status, mapped?.cycle ?? 'monthly', end, sub.cancel_at_period_end ? 1 : 0,
    status === 'canceled' ? null : sub.id, sub.customer, userId,
  )
}
