# Implementation Plan — Backend (Peladinha-SP Subsystem A)

**TDD Iron Law:** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.
Write the test → watch it fail → write minimal code → watch it pass → refactor.
Configuration files and scaffolding (tsconfig, package.json, .env) are the only exceptions.

Reference: [architecture design](2026-06-12-subsystem-a-design.md) | [ERD](erd.md) | [API spec](api.md) | [test plan](test-plan.md)

---

## How to read this plan

```
🔴 RED    — write the test, run it, confirm it fails with the expected message
🟢 GREEN  — write the minimal code to make it pass, run tests, confirm green
🔵 REFACTOR — clean up duplication/names, keep tests green
```

Run `cd backend && yarn test <file>` after every RED and GREEN step.

---

## Phase 1 — Scaffolding

Configuration only — TDD exception. No behaviour to test.

**1.1** Add `backend/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

**1.2** Add scripts to `backend/package.json`
```json
"scripts": {
  "dev": "ts-node-dev --respawn src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "jest --runInBand",
  "test:coverage": "jest --coverage",
  "migrate": "knex --knexfile src/db/knexfile.ts migrate:latest",
  "migrate:rollback": "knex --knexfile src/db/knexfile.ts migrate:rollback"
}
```

**1.3** Install production dependencies
```bash
yarn add express knex pg multer twilio node-cron dotenv
```

**1.4** Install dev dependencies
```bash
yarn add -D typescript ts-node ts-node-dev jest supertest \
  @types/express @types/node @types/multer @types/node-cron \
  @types/supertest @types/jest ts-jest
```

**1.5** Add Jest config to `backend/package.json`
```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "setupFiles": ["dotenv/config"]
}
```

**1.6** Create `backend/.env.example` — copy to `.env`, add `.env` to `.gitignore`
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/peladinha_dev
UPLOAD_DIR=./uploads
MAX_PHOTO_SIZE_MB=5
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**1.7** Create `backend/src/db/knex.ts`
```typescript
import knex from 'knex'
export const db = knex({ client: 'pg', connection: process.env.DATABASE_URL })
```

**1.8** Create `backend/src/db/knexfile.ts`
```typescript
import type { Knex } from 'knex'
const config: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: { directory: './migrations', extension: 'ts' },
}
export default config
```

**1.9** Refactor `backend/src/index.ts` — export `app` separately from `listen` so tests can import it without starting the server
```typescript
import 'dotenv/config'
import express from 'express'
import path from 'path'

export const app = express()
app.use(express.json())
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')))

if (require.main === module) {
  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}
```

---

## Phase 2 — Database Migrations

Generated schema — TDD exception. Verify manually with psql.

**2.1** `mkdir -p backend/src/db/migrations`

**2.2** Create `001_create_players.ts`
```typescript
import type { Knex } from 'knex'
export async function up(knex: Knex) {
  await knex.schema.createTable('players', (t) => {
    t.increments('id').primary()
    t.string('name', 100).notNullable()
    t.string('phone', 20).notNullable()
    t.string('photo_url', 500).nullable()
    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
  })
}
export async function down(knex: Knex) { await knex.schema.dropTable('players') }
```

**2.3** Create `002_create_games.ts`
```typescript
export async function up(knex: Knex) {
  await knex.schema.createTable('games', (t) => {
    t.increments('id').primary()
    t.date('date').notNullable()
    t.time('time').notNullable()
    t.string('location', 200).notNullable()
    t.string('playtomic_url', 500).nullable()
    t.string('status', 20).notNullable().defaultTo('scheduled')
    t.string('pricing_mode', 20).notNullable()
    t.decimal('price_per_player', 8, 2).nullable()
    t.decimal('total_amount', 8, 2).nullable()
    t.timestamp('remind_at').nullable()
    t.timestamp('reminder_sent_at').nullable()
    t.timestamp('completed_at').nullable()
    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
  })
}
export async function down(knex: Knex) { await knex.schema.dropTable('games') }
```

**2.4** Create `003_create_game_players.ts`
```typescript
export async function up(knex: Knex) {
  await knex.schema.createTable('game_players', (t) => {
    t.integer('game_id').notNullable().references('id').inTable('games').onDelete('CASCADE')
    t.integer('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE')
    t.integer('guests_count').notNullable().defaultTo(0)
    t.boolean('paid').notNullable().defaultTo(false)
    t.primary(['game_id', 'player_id'])
  })
}
export async function down(knex: Knex) { await knex.schema.dropTable('game_players') }
```

**2.5** Apply and verify
```bash
createdb peladinha_dev
cd backend && yarn migrate
# psql peladinha_dev -c "\dt"   → should show 3 tables
```

---

## Phase 3 — Health Route

The existing `src/routes/health.test.ts` is the starting RED.

🔴 RED — `yarn test src/routes/health.test.ts` — fails because `/health` is not on the exported `app` yet

🟢 GREEN — add to `src/index.ts`:
```typescript
app.get('/health', (_req, res) => res.json({ status: 'ok' }))
```

🔵 REFACTOR — extract to `src/routes/health.ts` if preferred; keep test green.

---

## Phase 4 — Playtomic Parser Service

File: `src/services/playtomicParser.ts` | Tests: `src/services/playtomicParser.test.ts`

### 4.1 — Parses standard message

🔴 RED — create `playtomicParser.test.ts`:
```typescript
import { parsePlaytomicMessage } from './playtomicParser'

const SAMPLE = `JOGO NO FUT7 !\n\n 📅 sexta-feira, 12, 21:00 (15min)\n 📍 Braga\n ✅ Teles Gomes\nhttps://app.playtomic.com/matches/7b6c3138-75c6-4e26-b691-ac01e02612c7`

test('parses time, location and URL from a standard Playtomic message', () => {
  const result = parsePlaytomicMessage(SAMPLE)
  expect(result.time).toBe('21:00')
  expect(result.location).toBe('Braga')
  expect(result.playtomicUrl).toContain('7b6c3138')
})
```
Run — confirm: module not found.

🟢 GREEN — create `playtomicParser.ts`, implement minimum to pass.

🔵 REFACTOR — extract regex constants, normalise line endings once at top.

### 4.2 — No URL returns null

🔴 RED:
```typescript
test('returns null playtomicUrl when no URL present', () => {
  const noUrl = SAMPLE.split('\n').filter(l => !l.startsWith('https')).join('\n')
  expect(parsePlaytomicMessage(noUrl).playtomicUrl).toBeNull()
})
```
🟢 GREEN — make URL extraction return `null` when not found.

### 4.3 — Garbled input throws ParseError

🔴 RED:
```typescript
import { ParseError } from './playtomicParser'
test('throws ParseError on garbled input', () => {
  expect(() => parsePlaytomicMessage('random garbage')).toThrow(ParseError)
})
```
🟢 GREEN — define `export class ParseError extends Error {}`, throw when required fields missing.

### 4.4 — CRLF line endings

🔴 RED:
```typescript
test('handles CRLF line endings', () => {
  const crlf = SAMPLE.replace(/\n/g, '\r\n')
  expect(parsePlaytomicMessage(crlf).location).toBe('Braga')
})
```
🟢 GREEN — `text.replace(/\r\n/g, '\n')` at the top of the function.

---

## Phase 5 — Pricing Service

File: `src/services/pricing.ts` | Tests: `src/services/pricing.test.ts`

### 5.1 — calculateAmountDue

🔴 RED:
```typescript
import { calculateAmountDue } from './pricing'
test('amount due is price × (1 + guests)', () => {
  expect(calculateAmountDue(7.5, 0)).toBe(7.5)
  expect(calculateAmountDue(10, 1)).toBe(20)
})
```
🟢 GREEN — create `pricing.ts`, implement `calculateAmountDue`.

### 5.2 — calculatePricePerPlayer, no guests

🔴 RED:
```typescript
import { calculatePricePerPlayer } from './pricing'
test('splits total evenly with no guests', () => {
  const attendees = [{ guests_count: 0 }, { guests_count: 0 }, { guests_count: 0 }]
  expect(calculatePricePerPlayer(60, attendees)).toBe(20)
})
```
🟢 GREEN — implement `calculatePricePerPlayer`.

### 5.3 — calculatePricePerPlayer, with guests

🔴 RED:
```typescript
test('counts guests in the split', () => {
  const attendees = [
    { guests_count: 0 }, { guests_count: 0 }, { guests_count: 0 },
    { guests_count: 0 }, { guests_count: 1 },
  ]
  expect(calculatePricePerPlayer(60, attendees)).toBe(10)
})
```
🟢 GREEN — sum `(1 + guests_count)` across all attendees.

### 5.4 — Throws PricingError on zero attendees

🔴 RED:
```typescript
import { PricingError } from './pricing'
test('throws PricingError when no attendees', () => {
  expect(() => calculatePricePerPlayer(60, [])).toThrow(PricingError)
})
```
🟢 GREEN — define `export class PricingError extends Error {}`, throw when total heads is 0.

---

## Phase 6 — Player Routes

File: `src/routes/players.ts` | Tests: `src/routes/players.test.ts`

```typescript
// test setup
import request from 'supertest'
import { app } from '../index'
import { db } from '../db/knex'
beforeEach(async () => { await db('players').del() })
afterAll(async () => { await db.destroy() })
```

### 6.1 — GET /players returns empty array

🔴 RED:
```typescript
test('GET /players returns 200 and empty array when no players', async () => {
  const res = await request(app).get('/players')
  expect(res.status).toBe(200)
  expect(res.body).toEqual([])
})
```
🟢 GREEN — create `players.ts` route, mount in `index.ts`.

### 6.2 — POST /players creates player

🔴 RED:
```typescript
test('POST /players returns 201 with created player', async () => {
  const res = await request(app).post('/players')
    .field('name', 'Teles Gomes').field('phone', '+351912345678')
  expect(res.status).toBe(201)
  expect(res.body.id).toBeDefined()
})
```
🟢 GREEN — create `src/middleware/upload.ts` (multer config), wire into POST handler.

### 6.3 — POST /players returns 400 on missing name

🔴 RED:
```typescript
test('POST /players returns 400 when name is missing', async () => {
  const res = await request(app).post('/players').field('phone', '+351912345678')
  expect(res.status).toBe(400)
})
```
🟢 GREEN — validate required fields before insert.

### 6.4 — PATCH /players/:id updates player

🔴 RED:
```typescript
test('PATCH /players/:id updates phone and returns 200', async () => {
  const { body: player } = await request(app).post('/players')
    .field('name', 'João').field('phone', '+351900000000')
  const res = await request(app).patch(`/players/${player.id}`).field('phone', '+351911111111')
  expect(res.status).toBe(200)
  expect(res.body.phone).toBe('+351911111111')
})
```
🟢 GREEN — implement PATCH handler.

### 6.5 — PATCH /players/:id returns 404 for unknown player

🔴 RED:
```typescript
test('PATCH /players/999 returns 404', async () => {
  const res = await request(app).patch('/players/999').send({ name: 'Ghost' })
  expect(res.status).toBe(404)
})
```
🟢 GREEN — existence check before update.

---

## Phase 7 — Game Routes

File: `src/routes/games.ts` | Tests: `src/routes/games.test.ts`

```typescript
// test setup
beforeEach(async () => {
  await db('game_players').del()
  await db('games').del()
  await db('players').del()
})
afterAll(async () => { await db.destroy() })
```

### 7.1 — POST /games with Playtomic message

🔴 RED:
```typescript
test('POST /games parses Playtomic message and returns 201', async () => {
  const res = await request(app).post('/games').send({
    raw_message: `JOGO NO FUT7 !\n\n 📅 sexta-feira, 12, 21:00 (15min)\n 📍 Braga\nhttps://app.playtomic.com/matches/abc123`,
    pricing_mode: 'per_player', price_per_player: 8,
  })
  expect(res.status).toBe(201)
  expect(res.body.location).toBe('Braga')
  expect(res.body.time).toBe('21:00')
})
```
🟢 GREEN — create `games.ts`, call `parsePlaytomicMessage`, insert, return 201.

### 7.2 — POST /games returns 400 on bad message

🔴 RED:
```typescript
test('POST /games returns 400 when raw_message cannot be parsed', async () => {
  const res = await request(app).post('/games').send({ raw_message: 'garbage', pricing_mode: 'per_player', price_per_player: 8 })
  expect(res.status).toBe(400)
})
```
🟢 GREEN — catch `ParseError`, return 400.

### 7.3 — POST /games manual entry

🔴 RED:
```typescript
test('POST /games creates game from manual fields', async () => {
  const res = await request(app).post('/games').send({
    date: '2026-06-20', time: '21:00', location: 'Porto',
    pricing_mode: 'total', total_amount: 60,
  })
  expect(res.status).toBe(201)
  expect(res.body.location).toBe('Porto')
})
```
🟢 GREEN — handle the no-`raw_message` branch, validate required fields.

### 7.4 — GET /games returns ordered list

🔴 RED — expect 200 + array.
🟢 GREEN — `SELECT * FROM games ORDER BY date DESC`.

### 7.5 — GET /games/:id includes players with amount_due

🔴 RED:
```typescript
test('GET /games/:id returns players with amount_due', async () => {
  // seed game (per_player, 8), player, game_players row
  const res = await request(app).get(`/games/${gameId}`)
  expect(res.status).toBe(200)
  expect(res.body.players[0].amount_due).toBe('8.00')
})
```
🟢 GREEN — JOIN query + compute `amount_due = price_per_player × (1 + guests_count)`.

### 7.6 — GET /games/:id returns 404

🔴 RED — GET /games/999 → 404.
🟢 GREEN — existence check.

### 7.7 — PATCH /games/:id updates remind_at

🔴 RED — PATCH with `{ remind_at: '2026-06-15T10:00:00Z' }` → 200 + updated field.
🟢 GREEN — implement PATCH handler.

---

## Phase 8 — Attendance Routes

File: `src/routes/attendance.ts` | Tests: `src/routes/attendance.test.ts`

### 8.1 — POST /games/:id/players sets attendance

🔴 RED:
```typescript
test('POST /games/:id/players sets attendance and returns attending count', async () => {
  const res = await request(app)
    .post(`/games/${gameId}/players`)
    .send({ player_ids: [p1Id, p2Id] })
  expect(res.status).toBe(200)
  expect(res.body.attending).toBe(2)
})
```
🟢 GREEN — create `attendance.ts`, DELETE existing rows then INSERT new ones, mount router.

### 8.2 — POST replaces existing attendance

🔴 RED — call twice with different lists, expect only the second list to remain.
🟢 GREEN — DELETE before INSERT already handles this; confirm test passes.

### 8.3 — PATCH toggles paid

🔴 RED:
```typescript
test('PATCH toggles paid to true', async () => {
  const res = await request(app)
    .patch(`/games/${gameId}/players/${playerId}`)
    .send({ paid: true })
  expect(res.status).toBe(200)
  expect(res.body.paid).toBe(true)
})
```
🟢 GREEN — implement `PATCH /games/:id/players/:playerId`.

### 8.4 — PATCH guests_count recalculates price in total mode

🔴 RED — game with `pricing_mode=total`, change `guests_count`, expect `amount_due` to update.
🟢 GREEN — call `calculatePricePerPlayer` and update `games.price_per_player` when mode is `total`.

### 8.5 — Unknown player in list returns 400

🔴 RED — `player_ids: [9999]` → 400.
🟢 GREEN — validate all IDs exist before deleting/inserting.

---

## Phase 9 — WhatsApp Service

Integration boundary only — no unit tests. Mocked for all other tests.

**9.1** Create `src/services/whatsapp.ts`
```typescript
import twilio from 'twilio'
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

export async function sendMessage(to: string, body: string): Promise<void> {
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: `whatsapp:${to}`,
    body,
  })
}

export const gameCompleteMessage = (date: string, location: string) =>
  `O jogo de ${date} em ${location} terminou! Obrigado a todos que jogaram. 🏆`

export const unpaidReminderMessage = (date: string, amountDue: string) =>
  `Lembrete: ainda tens ${amountDue}€ por pagar do jogo de ${date}. Obrigado! 💸`
```

**9.2** Create `src/services/__mocks__/whatsapp.ts`
```typescript
export const sendMessage = jest.fn().mockResolvedValue(undefined)
export const gameCompleteMessage = jest.requireActual('../whatsapp').gameCompleteMessage
export const unpaidReminderMessage = jest.requireActual('../whatsapp').unpaidReminderMessage
```

---

## Phase 10 — Complete & Remind Endpoints

Add to `src/routes/games.test.ts`. Add `jest.mock('../services/whatsapp')` at the top.

### 10.1 — POST /games/:id/complete marks done and sends WhatsApp

🔴 RED:
```typescript
import { sendMessage } from '../services/whatsapp'
jest.mock('../services/whatsapp')

test('complete marks game done and sends WhatsApp to all attendees', async () => {
  // seed game + 2 attending players
  const res = await request(app).post(`/games/${gameId}/complete`)
  expect(res.status).toBe(200)
  expect(res.body.status).toBe('done')
  expect(sendMessage).toHaveBeenCalledTimes(2)
})
```
🟢 GREEN — implement `POST /games/:id/complete`.

### 10.2 — Completing already-done game returns 409

🔴 RED — call complete twice, expect 409 on second call.
🟢 GREEN — check `status === 'done'` before updating.

### 10.3 — POST /games/:id/remind sends only to unpaid

🔴 RED:
```typescript
test('remind sends WhatsApp only to unpaid players', async () => {
  // seed 3 attendees, mark 1 as paid
  const res = await request(app).post(`/games/${gameId}/remind`)
  expect(res.status).toBe(200)
  expect(res.body.reminded).toBe(2)
  expect(sendMessage).toHaveBeenCalledTimes(2)
})
```
🟢 GREEN — implement `POST /games/:id/remind`.

### 10.4 — Remind when all paid returns 0

🔴 RED — mark all paid, expect `{ reminded: 0 }`.
🟢 GREEN — query already handles this; confirm test passes.

---

## Phase 11 — Reminder Cron Job

File: `src/services/reminderJob.ts` | Tests: `src/services/reminderJob.test.ts`

Export `runReminderCheck()` separately from the cron schedule so it is directly testable.

The cron runs **every 5 hours** and sends WhatsApp reminders to all unpaid players across all games that are not yet `done`. There is no `remind_at` gating — it simply finds any unpaid attendance record and reminds the player.

### 11.1 — Sends reminders to all unpaid players

🔴 RED:
```typescript
jest.mock('./whatsapp')
import { sendMessage } from './whatsapp'
import { runReminderCheck } from './reminderJob'
import { db } from '../db/knex'

test('sends WhatsApp to all unpaid players across non-done games', async () => {
  // seed 2 games (status=scheduled), each with 1 unpaid player
  await runReminderCheck()
  expect(sendMessage).toHaveBeenCalledTimes(2)
})
```
🟢 GREEN — create `reminderJob.ts`, implement `runReminderCheck()` and `startReminderJob()`.

### 11.2 — Does not remind players who already paid

🔴 RED — mark all paid → `sendMessage` not called.
🟢 GREEN — `WHERE paid = false` handles it; verify passes.

### 11.3 — Does not remind for completed games

🔴 RED — game status is `done` → `sendMessage` not called for that game's players.
🟢 GREEN — join with `games` and filter `WHERE games.status != 'done'`; verify passes.

### 11.4 — Twilio failure does not crash the cron

🔴 RED:
```typescript
(sendMessage as jest.Mock).mockRejectedValueOnce(new Error('Twilio down'))
await runReminderCheck()  // should not throw
```
🟢 GREEN — wrap each send in try/catch; log error and continue to next player.

**11.5** Wire `startReminderJob()` in `src/index.ts` inside `require.main === module` block with `cron.schedule('0 */5 * * *', runReminderCheck)`.

---

## Backend Verification Checklist

Run after every phase before moving to the next:

- [ ] `yarn test` — zero failures, no skipped tests
- [ ] Every function has a test that was written first and watched fail
- [ ] Each test failed for the expected reason (feature missing, not a typo)
- [ ] Minimal code written — no extra features beyond what the test requires
- [ ] `yarn dev` starts without errors
- [ ] After Phase 3: `curl localhost:3000/health` → `{ status: 'ok' }`
- [ ] After Phase 6: create a player via curl, retrieve with GET /players
- [ ] After Phase 10: mark game done → Twilio sandbox receives WhatsApp message
- [ ] After Phase 11: set `remind_at` 2 min from now → cron fires, unpaid players get WhatsApp
