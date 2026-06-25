import request from 'supertest'
import { app } from '../index'
import { db } from '../db/knex'

jest.mock('../services/whatsapp')

beforeEach(async () => {
  await db('game_players').del()
  await db('games').del()
  await db('players').del()
})
afterAll(async () => { await db.destroy() })

test('POST /games parses Playtomic message and returns 201', async () => {
  const res = await request(app).post('/games').send({
    raw_message: `JOGO NO FUT7 !

 📅 sexta-feira, 12, 21:00 (15min)
 📍 Braga
https://app.playtomic.com/matches/abc123`,
    pricing_mode: 'per_player', price_per_player: 8,
  })
  expect(res.status).toBe(201)
  expect(res.body.location).toBe('Braga')
  expect(res.body.time).toContain('21:00')
})

test('POST /games returns 400 when raw_message cannot be parsed', async () => {
  const res = await request(app).post('/games').send({ raw_message: 'garbage', pricing_mode: 'per_player', price_per_player: 8 })
  expect(res.status).toBe(400)
})

test('POST /games creates game from manual fields', async () => {
  const res = await request(app).post('/games').send({
    date: '2026-06-20', time: '21:00', location: 'Porto',
    pricing_mode: 'total', total_amount: 60,
  })
  expect(res.status).toBe(201)
  expect(res.body.location).toBe('Porto')
})

test('GET /games returns ordered list', async () => {
  await request(app).post('/games').send({ date: '2026-06-20', time: '21:00', location: 'Porto', pricing_mode: 'total', total_amount: 60 })
  const res = await request(app).get('/games')
  expect(res.status).toBe(200)
  expect(res.body.length).toBe(1)
})

test('GET /games/:id includes players with amount_due', async () => {
  const player = await db('players').insert({ name: 'Test', phone: '+351****0000' }).returning('*')
  const game = await request(app).post('/games').send({ date: '2026-06-20', time: '21:00', location: 'Porto', pricing_mode: 'per_player', price_per_player: 8 })
  await db('game_players').insert({ game_id: game.body.id, player_id: player[0].id })
  const res = await request(app).get(`/games/${game.body.id}`)
  expect(res.status).toBe(200)
  expect(res.body.players[0].amount_due).toBe('8.00')
})

test('GET /games/:id returns 404', async () => {
  const res = await request(app).get('/games/999')
  expect(res.status).toBe(404)
})

test('PATCH /games/:id updates remind_at', async () => {
  const game = await request(app).post('/games').send({ date: '2026-06-20', time: '21:00', location: 'Porto', pricing_mode: 'total', total_amount: 60 })
  const res = await request(app).patch(`/games/${game.body.id}`).send({ remind_at: '2026-06-15T10:00:00Z' })
  expect(res.status).toBe(200)
  expect(res.body.remind_at).toBeDefined()
})

describe('notifications', () => {
  const sendMessage = require('../services/whatsapp').sendMessage

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('POST /games/:id/complete marks done and sends WhatsApp to all attendees', async () => {
    const game = await request(app).post('/games').send({ date: '2026-06-20', time: '21:00', location: 'Porto', pricing_mode: 'per_player', price_per_player: 8 })
    const player = await db('players').insert({ name: 'Test', phone: '+351****0000' }).returning('*')
    await db('game_players').insert({ game_id: game.body.id, player_id: player[0].id })
    const res = await request(app).post(`/games/${game.body.id}/complete`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('done')
    expect(sendMessage).toHaveBeenCalledTimes(1)
  })

  test('POST /games/:id/complete returns 409 for already-done game', async () => {
    const game = await request(app).post('/games').send({ date: '2026-06-20', time: '21:00', location: 'Porto', pricing_mode: 'per_player', price_per_player: 8 })
    await request(app).post(`/games/${game.body.id}/complete`)
    const res = await request(app).post(`/games/${game.body.id}/complete`)
    expect(res.status).toBe(409)
  })

  test('POST /games/:id/remind sends only to unpaid', async () => {
    const game = await request(app).post('/games').send({ date: '2026-06-20', time: '21:00', location: 'Porto', pricing_mode: 'per_player', price_per_player: 8 })
    const p1 = await db('players').insert({ name: 'P1', phone: '+351****0001' }).returning('*')
    const p2 = await db('players').insert({ name: 'P2', phone: '+351****0002' }).returning('*')
    await db('game_players').insert([
      { game_id: game.body.id, player_id: p1[0].id, paid: true },
      { game_id: game.body.id, player_id: p2[0].id, paid: false },
    ])
    const res = await request(app).post(`/games/${game.body.id}/remind`)
    expect(res.status).toBe(200)
    expect(res.body.reminded).toBe(1)
    expect(sendMessage).toHaveBeenCalledTimes(1)
  })

  test('POST /games/:id/remind returns 0 when all paid', async () => {
    const game = await request(app).post('/games').send({ date: '2026-06-20', time: '21:00', location: 'Porto', pricing_mode: 'per_player', price_per_player: 8 })
    const p1 = await db('players').insert({ name: 'P1', phone: '+351****0001' }).returning('*')
    await db('game_players').insert({ game_id: game.body.id, player_id: p1[0].id, paid: true })
    const res = await request(app).post(`/games/${game.body.id}/remind`)
    expect(res.status).toBe(200)
    expect(res.body.reminded).toBe(0)
  })
})
