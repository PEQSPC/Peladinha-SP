import request from 'supertest'
import { app } from '../index'
import { db } from '../db/knex'

beforeEach(async () => { await db('players').del() })
afterAll(async () => { await db.destroy() })

test('GET /players returns 200 and empty array when no players', async () => {
  const res = await request(app).get('/players')
  expect(res.status).toBe(200)
  expect(res.body).toEqual([])
})

test('POST /players returns 201 with created player', async () => {
  const res = await request(app).post('/players')
    .field('name', 'Teles Gomes').field('phone', '+351****5678')
  expect(res.status).toBe(201)
  expect(res.body.id).toBeDefined()
})

test('POST /players returns 400 when name is missing', async () => {
  const res = await request(app).post('/players').field('phone', '+351****5678')
  expect(res.status).toBe(400)
})

test('PATCH /players/:id updates phone and returns 200', async () => {
  const { body: player } = await request(app).post('/players')
    .field('name', 'João').field('phone', '+351****0000')
  const res = await request(app).patch(`/players/${player.id}`).field('phone', '+351****1111')
  expect(res.status).toBe(200)
  expect(res.body.phone).toBe('+351****1111')
})

test('PATCH /players/:id returns 404 for unknown player', async () => {
  const res = await request(app).patch('/players/999').send({ name: 'Ghost' })
  expect(res.status).toBe(404)
})
