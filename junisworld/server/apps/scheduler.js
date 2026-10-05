// Background jobs for the business apps. Runs inside the server process.
import { runDueScans } from './a11y/service.js'
import { sendDueReminders } from './contracts/service.js'
import { sendTaskReminders } from './office/service.js'

const HOUR = 3600e3

export function startScheduler() {
  const tick = async () => {
    try {
      await sendDueReminders()
      sendTaskReminders()
      await runDueScans()
    } catch (e) {
      console.error('Scheduler-Fehler:', e)
    }
  }
  setTimeout(tick, 30e3)
  return setInterval(tick, HOUR)
}
