import { Router } from 'express'
import { db } from '../db/knex'
import { parsePlaytomicMessage, ParseError } from '../services/playtomicParser'
import { calculateAmountDue } from '../services/pricing'
import { sendMessage, gameCompleteMessage, unpaidReminderMessage } from '../services/whatsapp'
import { attendanceRouter } from './attendance'

/**
 * Games Router
 * Handles game creation (Playtomic paste or manual), listing, detail,
 * pricing updates, completion with WhatsApp broadcast, and unpaid reminders.
 * Attendance sub-routes are mounted under /:id/players.
 */

export const gamesRouter = Router()

/** Validates pricing_mode and required price fields */
function validatePricing(body: any): string | null {
  const { pricing_mode, price_per_player, total_amount } = body
  if (!pricing_mode || !['per_player', 'total'].includes(pricing_mode)) {
    return 'pricing_mode must be per_player or total'
  }
  if (pricing_mode === 'per_player' && !price_per_player) {
    return 'price_per_player is required in per_player mode'
  }
  if (pricing_mode === 'total' && !total_amount) {
    return 'total_amount is required in total mode'
  }
  return null
}

/** POST /games — Creates a game from Playtomic message or manual fields */
gamesRouter.post('/', async (req, res) => {
  const { raw_message, date, time, location, pricing_mode, price_per_player, total_amount, remind_at } = req.body

  const pricingError = validatePricing(req.body)
  if (pricingError) return res.status(400).json({ error: pricingError })

  let gameData: any = { pricing_mode, price_per_player, total_amount, remind_at }

  if (raw_message) {
    try {
      const parsed = parsePlaytomicMessage(raw_message)
      const dateValid = parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
      const timeValid = parsed.time && /^\d{2}:\d{2}$/.test(parsed.time)
      gameData = {
        ...gameData,
        date: dateValid ? parsed.date : null,
        time: timeValid ? parsed.time : null,
        location: parsed.location,
        playtomic_url: parsed.playtomicUrl,
      }
    } catch (e) {
      if (e instanceof ParseError) return res.status(400).json({ error: 'Could not parse message' })
      throw e
    }
  } else {
    if (!date || !time || !location) {
      return res.status(400).json({ error: 'date, time, and location are required' })
    }
    gameData = { ...gameData, date, time, location }
  }

  const [game] = await db('games').insert(gameData).returning('*')
  res.status(201).json(game)
})

/** GET /games — Returns all games ordered by date descending */
gamesRouter.get('/', async (_req, res) => {
  const games = await db('games').select('*').orderBy('date', 'desc')
  res.json(games)
})

/** GET /games/:id — Game detail with attendees and computed amount_due */
gamesRouter.get('/:id', async (req, res) => {
  const { id } = req.params
  const game = await db('games').where({ id }).first()
  if (!game) return res.status(404).json({ error: 'Game not found' })

  const players = await db('game_players as gp')
    .join('players as p', 'p.id', 'gp.player_id')
    .where({ 'gp.game_id': id })
    .select('p.*', 'gp.guests_count', 'gp.paid')

  const attendees = players.map((p: any) => {
    const amountDue = calculateAmountDue(Number(game.price_per_player), p.guests_count)
    return { ...p, amount_due: amountDue.toFixed(2) }
  })

  res.json({ ...game, players: attendees })
})

/** PATCH /games/:id — Updates game fields (remind_at, pricing, etc.) */
gamesRouter.patch('/:id', async (req, res) => {
  const { id } = req.params
  const existing = await db('games').where({ id }).first()
  if (!existing) return res.status(404).json({ error: 'Game not found' })

  const updates: any = {}
  const allowed = ['remind_at', 'pricing_mode', 'price_per_player', 'total_amount']
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key]
  }

  const [game] = await db('games').where({ id }).update(updates).returning('*')
  res.json(game)
})

/** Sub-router: attendance endpoints at /games/:id/players */
gamesRouter.use('/:id/players', attendanceRouter)

/** POST /games/:id/complete — Marks game done + sends WhatsApp to all attendees */
gamesRouter.post('/:id/complete', async (req, res) => {
  const { id } = req.params
  const game = await db('games').where({ id }).first()
  if (!game) return res.status(404).json({ error: 'Game not found' })
  if (game.status === 'done') return res.status(409).json({ error: 'Game already marked done' })

  const [updated] = await db('games').where({ id }).update({
    status: 'done',
    completed_at: new Date().toISOString(),
  }).returning('*')

  const attendees = await db('game_players as gp')
    .join('players as p', 'p.id', 'gp.player_id')
    .where({ 'gp.game_id': id })
    .select('p.phone', 'p.name')

  let sent = 0
  for (const attendee of attendees) {
    try {
      await sendMessage(attendee.phone, gameCompleteMessage(game.date, game.location))
      sent++
    } catch (e) {
      console.error(`WhatsApp failed for ${attendee.phone}:`, e)
    }
  }

  res.json({ status: 'done', completed_at: updated.completed_at, whatsapp_sent: sent })
})

/** POST /games/:id/remind — Sends WhatsApp to unpaid players */
gamesRouter.post('/:id/remind', async (req, res) => {
  const { id } = req.params
  const game = await db('games').where({ id }).first()
  if (!game) return res.status(404).json({ error: 'Game not found' })

  const unpaidAttendees = await db('game_players as gp')
    .join('players as p', 'p.id', 'gp.player_id')
    .where({ 'gp.game_id': id, 'gp.paid': false })
    .select('p.phone', 'p.name', 'gp.guests_count')

  let reminded = 0
  for (const attendee of unpaidAttendees) {
    const amountDue = calculateAmountDue(Number(game.price_per_player), attendee.guests_count)
    try {
      await sendMessage(attendee.phone, unpaidReminderMessage(game.date, amountDue.toFixed(2)))
      reminded++
    } catch (e) {
      console.error(`WhatsApp failed for ${attendee.phone}:`, e)
    }
  }

  res.json({ reminded })
})