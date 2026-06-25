jest.mock('./whatsapp')
import { sendMessage } from './whatsapp'
import { runReminderCheck } from './reminderJob'
import { db } from '../db/knex'

let gameId: number
let playerId: number

beforeEach(async () => {
  await db('game_players').del()
  await db('games').del()
  await db('players').del()
  jest.clearAllMocks()

  const [p] = await db('players').insert({ name: 'Unpaid Player', phone: '+351****9999' }).returning('*')
  playerId = p.id

  const [g] = await db('games').insert({
    date: '2026-06-20', time: '21:00', location: 'Porto',
    pricing_mode: 'per_player', price_per_player: 10,
    status: 'scheduled',
  }).returning('*')
  gameId = g.id

  await db('game_players').insert({ game_id: gameId, player_id: playerId, paid: false })
})

afterAll(async () => { await db.destroy() })

test('sends WhatsApp to all unpaid players across non-done games', async () => {
  await runReminderCheck()
  expect(sendMessage).toHaveBeenCalledTimes(1)
})

test('does not remind players who already paid', async () => {
  await db('game_players').where({ game_id: gameId, player_id: playerId }).update({ paid: true })
  await runReminderCheck()
  expect(sendMessage).not.toHaveBeenCalled()
})

test('does not remind for completed games', async () => {
  await db('games').where({ id: gameId }).update({ status: 'done' })
  await runReminderCheck()
  expect(sendMessage).not.toHaveBeenCalled()
})

test('Twilio failure does not crash the cron', async () => {
  ;(sendMessage as jest.Mock).mockRejectedValueOnce(new Error('Twilio down'))
  await runReminderCheck() // should not throw
  expect(sendMessage).toHaveBeenCalledTimes(1)
})
