# Test Plan — Peladinha-SP Subsystem A

---

## Test Framework

- **Runner:** Jest
- **HTTP testing:** Supertest (against the Express app)
- **Test database:** PostgreSQL test database (separate from dev); migrations applied before suite, rolled back after

---

## Coverage Targets

| Layer | Target |
|-------|--------|
| Unit — pure services | 100% of branches |
| Integration — API routes | Happy path + key error cases per endpoint |
| Background job | Cron trigger logic mocked at clock level |

Frontend is not tested in this subsystem — it is an organizer-only internal tool.

---

## Unit Tests

### `playtomicParser.ts`

| Test | Input | Expected |
|------|-------|----------|
| Parses standard message | Full Playtomic share message (see below) | Correct date, time, location, URL |
| Parses message without URL | Message with no link | date/time/location extracted; `playtomic_url: null` |
| Handles extra whitespace | Message with CRLF line endings | Same output as clean input |
| Throws on garbled input | Random string | `ParseError` thrown |
| Handles Portuguese day name | `"sexta-feira, 12, 21:00"` | date field populated |

**Sample input for parser tests:**
```
JOGO NO FUT7 !

 📅 sexta-feira, 12, 21:00 (15min)
 📍 Braga
 ✅ Teles Gomes
 ⚪ ??
https://app.playtomic.com/matches/7b6c3138-75c6-4e26-b691-ac01e02612c7
```

---

### `pricing.ts`

| Test | Scenario | Expected |
|------|----------|----------|
| `per_player` mode | `price_per_player = 7.50`, 5 players, 0 guests | `price_per_player = 7.50`; each player owes 7.50 |
| `total` mode, no guests | `total_amount = 60`, 6 players | `price_per_player = 10.00` |
| `total` mode, with guests | `total_amount = 60`, 5 players, one brings 1 guest | 6 paying heads → `price_per_player = 10.00`; host owes 20.00 |
| `total` mode, 0 players | `total_amount = 60`, 0 attendees | Throws `PricingError` |
| `per_player` mode, player with guests | `price_per_player = 8`, player brings 2 guests | `amount_due = 24.00` |

---

## Integration Tests

### `/players` routes

| Test | Method | Expected |
|------|--------|----------|
| List players | `GET /players` | 200, returns array |
| Create player without photo | `POST /players` (JSON name+phone) | 201, player in DB |
| Create player with photo | `POST /players` (multipart) | 201, `photo_url` set |
| Create player missing name | `POST /players` (no name) | 400 |
| Edit player phone | `PATCH /players/1` | 200, phone updated |
| Edit unknown player | `PATCH /players/999` | 404 |

---

### `/games` routes

| Test | Method | Expected |
|------|--------|----------|
| Create game from Playtomic message | `POST /games` with `raw_message` | 201, fields parsed correctly |
| Create game manually | `POST /games` with date/time/location | 201 |
| Create game with bad paste | `POST /games` with garbled `raw_message` | 400 |
| Create game missing location | `POST /games` manual, no location | 400 |
| Get game detail with attendees | `GET /games/1` | 200, `players` array included |
| Get unknown game | `GET /games/999` | 404 |
| List games | `GET /games` | 200, ordered by date desc |
| Update remind_at | `PATCH /games/1` | 200, remind_at updated |

---

### Attendance routes

| Test | Method | Expected |
|------|--------|----------|
| Set attendance list | `POST /games/1/players` | 200, price recalculated in total mode |
| Replace attendance list | `POST /games/1/players` (second call) | Old players removed, new ones added |
| Toggle paid | `PATCH /games/1/players/1` `{ paid: true }` | 200, paid updated |
| Add guests | `PATCH /games/1/players/1` `{ guests_count: 2 }` | 200, `amount_due` updated |
| Unknown player in attendance | `POST /games/1/players` with invalid ID | 400 |

---

### Notification routes

| Test | Method | Expected |
|------|--------|----------|
| Mark game complete | `POST /games/1/complete` | 200, status=done, Twilio called for each attendee |
| Complete already-done game | `POST /games/1/complete` (second call) | 409 |
| Manual remind | `POST /games/1/remind` | 200, Twilio called only for unpaid players |
| Manual remind all paid | `POST /games/1/remind` | 200, `{ reminded: 0 }` |

In tests, Twilio is mocked at the `whatsapp.ts` service boundary (Jest mock). Integration tests do NOT call the real Twilio API.

---

### Reminder cron job

| Test | Scenario | Expected |
|------|----------|----------|
| Fires every 5h to unpaid players | Unpaid attendance records exist across non-done games | Twilio mock called for each unpaid player |
| Skips paid players | All players marked paid | Twilio mock NOT called |
| Skips completed games | Game status is `done` | Twilio mock NOT called for that game's players |
| Handles Twilio failure | Twilio mock throws | Error logged, loop continues to next player |

Cron expression: `0 */5 * * *` (every 5 hours at minute 0).

---

## Running Tests

```bash
cd backend
npm test                  # run all tests once
npm run test:watch        # watch mode during development
npm run test:coverage     # generate coverage report
```

Set `NODE_ENV=test` and `DATABASE_URL` to a separate test database before running.
