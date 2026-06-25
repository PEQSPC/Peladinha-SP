/**
 * Reminder Cron Job
 * Runs every 5 hours and sends WhatsApp reminders to all unpaid players
 * across all games that are not yet marked as done.
 * Errors per-player are caught and logged so one failure doesn't block others.
 */
import * as cron from 'node-cron'
import { db } from '../db/knex'
import { sendMessage, unpaidReminderMessage } from './whatsapp'
import { calculateAmountDue } from './pricing'

/**
 * Queries all unpaid attendance records across non-done games and sends
 * reminders. Each send is wrapped in try/catch for resilience.
 */
export async function runReminderCheck(): Promise<void> {
  const unpaidRecords = await db('game_players as gp')
    .join('games as g', 'g.id', 'gp.game_id')
    .join('players as p', 'p.id', 'gp.player_id')
    .where('g.status', '!=', 'done')
    .where('gp.paid', false)
    .select('p.phone', 'g.date', 'g.price_per_player', 'gp.guests_count')

  for (const record of unpaidRecords) {
    const amountDue = calculateAmountDue(Number(record.price_per_player), record.guests_count)
    try {
      await sendMessage(record.phone, unpaidReminderMessage(String(record.date), amountDue.toFixed(2)))
    } catch (e) {
      console.error(`Cron reminder failed for ${record.phone}:`, e)
    }
  }
}

/**
 * Starts the cron scheduler inside the Express process.
 * Runs every 5 hours at minute 0 (e.g. 00:00, 05:00, 10:00).
 */
export function startReminderJob(): ReturnType<typeof cron.schedule> {
  return cron.schedule('0 */5 * * *', () => {
    runReminderCheck().catch(e => console.error('Reminder cron error:', e))
  })
}