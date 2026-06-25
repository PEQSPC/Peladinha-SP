import request from 'supertest'
import { app } from '../index'
import { db } from '../db/knex'

let gameId: number
let p1Id: number
let p2Id: number

beforeEach(async () => {
  await db('game_players').del()
  await db('games').del()
  await db('players').del()

  const [p1] = await db('players').insert({ name: 'Player 1', phone: '+351****1111' }).returning('*')
  const [p2] = await db('players').insert({ name: 'Player 2', phone: '+351****2222' }).returning('*')
  p1Id = p1.id
  p2Id = p2.id

  const [game] = await db('games').insert({ date: '2026-06-20', time: '21:00', location: 'Porto', pricing_mode: 'per_player', price_per_player: 8 }).returning('*')
  gameId = game.id
})

afterAll(async () => { await db.destroy() })

test('POST /games/:id/players sets attendance and returns attending count', async () => {
  const res = await request(app)
    .post(`/games/${gameId}/players`)
    .send({ player_ids: [p1Id, p2Id] })
  expect(res.status).toBe(200)
  expect(res.body.attending).toBe(2)
})

test('POST replaces existing attendance', async () => {
  await request(app).post(`/games/${gameId}/players`).send({ player_ids: [p1Id] })
  const res = await request(app).post(`/games/${gameId}/players`).send({ player_ids: [p2Id] })
  expect(res.status).toBe(200)
  expect(res.body.attending).toBe(1)
})

test('PATCH toggles paid to true', async () => {
  await request(app).post(`/games/${gameId}/players`).send({ player_ids: [p1Id] })
  const res = await request(app)
    .patch(`/games/${gameId}/players/${p1Id}`)
    .send({ paid: true })
  expect(res.status).toBe(200)
  expect(res.body.paid).toBe(true)
})

test('PATCH guests_count recalculates price in total mode', async () => {
  const [game] = await db('games').insert({ date: '2026-07-01', time: '20:00', location: 'Lisboa', pricing_mode: 'total', total_amount: 60 }).returning('*')
  await request(app).post(`/games/${game.id}/players`).send({ player_ids: [p1Id, p2Id] })
  const res = await request(app)
    .patch(`/games/${game.id}/players/${p1Id}`)
    .send({ guests_count: 1 })
  expect(res.status).toBe(200)
  // total=60, 3 heads (p1+1guest + p2), price_per_player=20, p1 owes 20*2=40
  expect(res.body.amount_due).toBe('40.00')
})

test('Unknown player in list returns 400', async () => {
  const res = await request(app)
    .post(`/games/${gameId}/players`)
    .send({ player_ids: [9999] })
  expect(res.status).toBe(400)
})
