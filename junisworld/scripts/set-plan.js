// Operator tool: set a plan without Stripe (e.g. for staff accounts or manual invoicing).
// Usage: npm run plan:set -- user <email> <free|plus|pro>
//        npm run plan:set -- org <orgId> <teams|business|family|pending> [seats]
import { one, run } from '../server/db.js'
import { PLANS } from '../server/lib/plans.js'

const [kind, target, plan, seats] = process.argv.slice(2)
if (kind === 'user') {
  if (!['free', 'plus', 'pro'].includes(plan)) throw new Error('Plan muss free, plus oder pro sein.')
  const u = one('SELECT id FROM users WHERE email = ?', String(target).toLowerCase())
  if (!u) throw new Error(`Kein Nutzer mit E-Mail ${target}.`)
  run("UPDATE subscriptions SET plan = ?, status = 'active', cancel_at_period_end = 0, updated_at = datetime('now') WHERE user_id = ?", plan, u.id)
  console.log(`Nutzer ${target} → ${PLANS[plan].name}`)
} else if (kind === 'org') {
  if (!['teams', 'business', 'family', 'pending'].includes(plan)) throw new Error('Plan muss teams, business, family oder pending sein.')
  run('UPDATE organizations SET plan = ?, seats = COALESCE(?, seats) WHERE id = ?', plan, seats ? Number(seats) : null, Number(target))
  console.log(`Organisation ${target} → ${plan}`)
} else {
  console.log('Verwendung: npm run plan:set -- user <email> <free|plus|pro> | org <id> <teams|business|family|pending> [seats]')
}
