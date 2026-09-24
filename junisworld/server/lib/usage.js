import { one, run } from '../db.js'
import { ApiError } from './http.js'
import { entitlements } from './auth.js'

const today = () => new Date().toISOString().slice(0, 10)
const period = () => new Date().toISOString().slice(0, 7)

export function usageToday(userId) {
  return one('SELECT ai_messages, lessons FROM usage_daily WHERE user_id = ? AND day = ?', userId, today()) || { ai_messages: 0, lessons: 0 }
}

/** Checks and increments a daily counter ('ai_messages' | 'lessons'). */
export function consumeDaily(userId, counter) {
  const plan = entitlements(userId)
  const limit = counter === 'ai_messages' ? plan.limits.aiMessagesPerDay : plan.limits.lessonsPerDay
  const used = usageToday(userId)[counter]
  if (used >= limit) {
    const what = counter === 'ai_messages' ? 'Junis-AI-Nachrichten' : 'neuen Lektionen'
    throw new ApiError(429, 'limit_reached', `Du hast heute alle ${limit} ${what} deines Tarifs ${plan.name} genutzt. Das Limit wird um Mitternacht (UTC) zurückgesetzt.`, { limit, counter })
  }
  run(
    `INSERT INTO usage_daily (user_id, day, ${counter}) VALUES (?, ?, 1)
     ON CONFLICT(user_id, day) DO UPDATE SET ${counter} = ${counter} + 1`,
    userId, today(),
  )
}

/** Credit balance; grants the plan's monthly credits once per calendar month. */
export function creditBalance(userId) {
  const plan = entitlements(userId)
  const p = period()
  if (plan.limits.monthlyCredits > 0 && !one("SELECT 1 FROM credit_ledger WHERE user_id = ? AND period = ? AND reason = 'monthly_grant'", userId, p)) {
    // Monthly credits do not roll over: expire what is left from earlier grants.
    const left = one('SELECT COALESCE(SUM(amount), 0) AS b FROM credit_ledger WHERE user_id = ?', userId).b
    if (left > 0) run("INSERT INTO credit_ledger (user_id, amount, reason, period) VALUES (?, ?, 'monthly_expiry', ?)", userId, -left, p)
    run("INSERT INTO credit_ledger (user_id, amount, reason, period) VALUES (?, ?, 'monthly_grant', ?)", userId, plan.limits.monthlyCredits, p)
  }
  return one('SELECT COALESCE(SUM(amount), 0) AS b FROM credit_ledger WHERE user_id = ?', userId).b
}

export function spendCredits(userId, amount, reason) {
  const balance = creditBalance(userId)
  if (balance < amount) {
    throw new ApiError(402, 'credits_required', `Für diese Aktion werden ${amount} Credits benötigt. Dein Guthaben: ${balance}.`, { required: amount, balance })
  }
  run('INSERT INTO credit_ledger (user_id, amount, reason, period) VALUES (?, ?, ?, ?)', userId, -amount, reason, period())
}

export function refundCredits(userId, amount, reason) {
  run('INSERT INTO credit_ledger (user_id, amount, reason, period) VALUES (?, ?, ?, ?)', userId, amount, `refund:${reason}`, period())
}
