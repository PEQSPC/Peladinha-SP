# Subsystem A — Player Registration & Game Scheduling

**Date:** 2026-06-12
**Project:** Peladinha-SP
**Status:** Approved

---

## 1. Purpose

Subsystem A is the foundation of Peladinha-SP. It handles everything needed before and during a game: managing the player roster, scheduling games (from a Playtomic share message or manually), tracking who attends, recording guest players brought by regulars, managing per-game pricing, and sending WhatsApp notifications when a game ends or when unpaid players need a reminder.

---

## 2. Scope

**In scope:**
- Organizer-managed player roster (name, phone, photo)
- Game creation via Playtomic share message paste or manual form
- Organizer marks attendance per game
- Guest player support: a regular player can bring extra people and pay for them
- Pricing: organizer sets price-per-player OR a total amount (backend splits equally)
- Post-game WhatsApp notification to all attendees via Twilio
- Scheduled WhatsApp reminder to unpaid players at an organizer-chosen time
- Manual "remind unpaid now" trigger
- Games list grouped and sorted by year (descending)

**Out of scope (other subsystems):**
- Live team betting (Subsystem C)
- Automated Playtomic API integration
- Player self-registration
- End-of-year ranking (Subsystem D)

---

## 3. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ORM | Knex | Direct SQL control, lightweight migrations, no code-generation step |
| Database | PostgreSQL | Relational data fits players/games/attendance model cleanly |
| WhatsApp | Twilio | Reliable, well-documented, production-ready |
| Playtomic integration | Regex text parser | No Playtomic API available; share message format is consistent |
| Photo storage | Local disk (`multer`) | Simple for current scale; can migrate to S3 later |
| Frontend | React + TypeScript via Vite | Matches backend language; fast dev loop |
| Player management | Organizer-only | No self-registration — closed friend group |
| Reminder trigger | Organizer sets explicit `remind_at` datetime | More control than a fixed post-game delay |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────┐
│         React Frontend (Vite)           │
│  Players | Games | CreateGame | Detail  │
└───────────────────┬─────────────────────┘
                    │ HTTP REST
┌───────────────────▼─────────────────────┐
│         Express + TypeScript API        │
│  routes/  services/  db/               │
└──────┬────────────────────┬─────────────┘
       │                    │
┌──────▼──────┐    ┌────────▼────────┐
│ PostgreSQL  │    │  Twilio (WA)    │
│  (Knex)     │    │  WhatsApp API   │
└─────────────┘    └─────────────────┘
       ▲
┌──────┴──────┐
│  node-cron  │  (runs inside Express process)
│  every 15m  │
└─────────────┘
```

---

## 5. Data Model

See [erd.md](erd.md) for full table definitions.

Summary:
- `players` — roster of registered players
- `games` — scheduled and completed games
- `game_players` — attendance join table; carries `guests_count` and `paid`

---

## 6. Pricing Logic

Two modes, set per game by the organizer:

**`per_player` mode:** organizer enters the price each person pays directly. Stored as `price_per_player`.

**`total` mode:** organizer enters the total field cost. Backend calculates:

```
price_per_player = total_amount / Σ(1 + guests_count)  for all attendees
```

A player who brought guests pays `price_per_player × (1 + guests_count)`. The `paid` flag on `game_players` covers the host and their guests together.

---

## 7. Playtomic Message Parsing

When the organizer pastes a Playtomic share message, the backend extracts:

| Field | Source | Regex pattern |
|-------|--------|---------------|
| Date + time | Line with day/date/time | `(\w+-\w+,?\s+\d+,\s+\d+:\d+)` |
| Location | Line after 📍 emoji | Line following `📍` |
| Playtomic URL | Any line starting with `https://app.playtomic.com` | `https://app\.playtomic\.com/matches/[^\s]+` |

On parse failure the endpoint returns 400 and the frontend falls back to the manual form.

---

## 8. WhatsApp Notifications

**Post-game message** (fires when organizer marks game `done`):
> "O jogo de [date] em [location] terminou! Obrigado a todos que jogaram."

**Unpaid reminder** (manual or scheduled):
> "Lembrete: ainda tens [amount]€ por pagar do jogo de [date]. Obrigado!"

Both use the Twilio WhatsApp sandbox in development and the Twilio WhatsApp Business API in production.

---

## 9. Reminder Scheduling

- `node-cron` runs **every 5 hours** (`0 */5 * * *`) inside the Express process.
- Query: all `game_players` rows where `paid = false`, joined with `games` where `status != 'done'`.
- On fire: sends WhatsApp reminder to every unpaid player across all non-completed games.
- If Twilio fails for a player: error is logged, loop continues to next player.
- No `remind_at` or `reminder_sent_at` gating — runs purely on a fixed schedule.

---

## 10. Error Handling

| Scenario | HTTP | Behaviour |
|----------|------|-----------|
| Playtomic parse fails | 400 | `{ error: "Could not parse message — fill fields manually" }` |
| `total` mode with 0 players | 422 | `{ error: "No players to split cost across" }` |
| Twilio fails on game complete | 500 | Log error; response: `{ error: "WhatsApp failed to send — retry?" }` |
| Twilio fails in cron | — | Log error; leave `reminder_sent_at` null; retry next tick |
| Photo upload exceeds limit | 413 | `{ error: "Photo too large — max 5MB" }` |
