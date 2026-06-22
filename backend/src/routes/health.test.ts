import request from 'supertest'
import express from 'express'

const app = express()
app.use(express.json())
app.get('/health', (req, res) => res.json({ status: 'ok' }))

describe('GET /health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/health')
    expect(res.statusCode).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})