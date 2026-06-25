import { Router } from 'express'
import { db } from '../db/knex'
import { calculatePricePerPlayer, calculateAmountDue } from '../services/pricing'

/**
 * Attendance Router
 * Manages player attendance per game: setting the list, toggling payment,
 * updating guest counts, and recalculating prices in total mode.
 * Mounted under /games/:id/players in the games router.
 */

export const attendanceRouter = Router({ mergeParams: true })

/** Fetches a game by ID */
async function getGame(gameId: number) {
  return db('games').where({ id: gameId }).first()
}

/** POST /games/:id/players — Sets the attendance list (replaces existing) */
attendanceRouter.post('/', async (req, res) => {
  const { player_ids } = req.body
  const gameId = Number((req.params as any).id)
  const game = await getGame(gameId)
  if (!game) return res.status(404).json({ error: 'Game not found' })

  if (!player_ids || !Array.isArray(player_ids)) {
    return res.status(400).json({ error: 'player_ids array is required' })
  }

  const existing = await db('players').whereIn('id', player_ids).select('id')
  if (existing.length !== player_ids.length) {
    return res.status(400).json({ error: 'Unknown player ID in list' })
  }

  // Replace attendance
  await db('game_players').where({ game_id: gameId }).del()
  if (player_ids.length > 0) {
    await db('game_players').insert(
      player_ids.map((pid: number) => ({ game_id: gameId, player_id: pid }))
    )
  }

  // Recalculate price_per_player in total mode
  if (game.pricing_mode === 'total') {
    const attendees = await db('game_players').where({ game_id: gameId })
    const newPrice = calculatePricePerPlayer(Number(game.total_amount), attendees)
    await db('games').where({ id: gameId }).update({ price_per_player: newPrice })
  }

  res.json({ attending: player_ids.length, price_per_player: game.price_per_player })
})

/** PATCH /games/:id/players/:playerId — Updates paid status or guest count */
attendanceRouter.patch('/:playerId', async (req, res) => {
  const gameId = Number((req.params as any).id)
  const playerId = Number(req.params.playerId)
  const game = await getGame(gameId)
  if (!game) return res.status(404).json({ error: 'Game not found' })

  const record = await db('game_players').where({ game_id: gameId, player_id: playerId }).first()
  if (!record) return res.status(404).json({ error: 'Player not attending this game' })

  const updates: any = {}
  if (req.body.paid !== undefined) updates.paid = req.body.paid
  if (req.body.guests_count !== undefined) updates.guests_count = req.body.guests_count

  await db('game_players').where({ game_id: gameId, player_id: playerId }).update(updates)

  // Recalculate price_per_player in total mode if guests changed
  if (game.pricing_mode === 'total' && req.body.guests_count !== undefined) {
    const attendees = await db('game_players').where({ game_id: gameId })
    const newPrice = calculatePricePerPlayer(Number(game.total_amount), attendees)
    await db('games').where({ id: gameId }).update({ price_per_player: newPrice })
    game.price_per_player = newPrice
  }

  const updated = await db('game_players').where({ game_id: gameId, player_id: playerId }).first()
  const amountDue = calculateAmountDue(Number(game.price_per_player), updated.guests_count)

  res.json({
    game_id: gameId,
    player_id: playerId,
    guests_count: updated.guests_count,
    paid: updated.paid,
    amount_due: amountDue.toFixed(2),
  })
})