# Entity Relationship Diagram — Peladinha-SP Subsystem A

---

## Diagram

```
┌──────────────────────────────┐
│           players            │
├──────────────────────────────┤
│ id          SERIAL PK        │
│ name        VARCHAR(100)     │
│ phone       VARCHAR(20)      │
│ photo_url   VARCHAR(500)     │
│ created_at  TIMESTAMP        │
└─────────────┬────────────────┘
              │ 1
              │
              │ N
┌─────────────▼────────────────┐       ┌──────────────────────────────────┐
│         game_players         │       │             games                │
├──────────────────────────────┤       ├──────────────────────────────────┤
│ game_id      FK → games.id   ├───N──►│ id               SERIAL PK       │
│ player_id    FK → players.id │   1   │ date             DATE             │
│ guests_count INTEGER          │       │ time             TIME             │
│ paid         BOOLEAN          │       │ location         VARCHAR(200)     │
│ PK (game_id, player_id)      │       │ playtomic_url    VARCHAR(500) NULL│
└──────────────────────────────┘       │ status           VARCHAR(20)      │
                                       │ pricing_mode     VARCHAR(20)      │
                                       │ price_per_player DECIMAL(8,2) NULL│
                                       │ total_amount     DECIMAL(8,2) NULL│
                                       │ remind_at        TIMESTAMP NULL   │
                                       │ reminder_sent_at TIMESTAMP NULL   │
                                       │ completed_at     TIMESTAMP NULL   │
                                       │ created_at       TIMESTAMP        │
                                       └──────────────────────────────────┘
```

---

## Table Definitions

### `players`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-incrementing player ID |
| `name` | VARCHAR(100) | NOT NULL | Player display name |
| `phone` | VARCHAR(20) | NOT NULL | WhatsApp-capable phone number (international format) |
| `photo_url` | VARCHAR(500) | NULL | Path to uploaded photo served by the backend |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Record creation time |

### `games`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-incrementing game ID |
| `date` | DATE | NOT NULL | Date the game takes place |
| `time` | TIME | NOT NULL | Kick-off time |
| `location` | VARCHAR(200) | NOT NULL | Field name or address |
| `playtomic_url` | VARCHAR(500) | NULL | Playtomic match URL (populated from parsed message) |
| `status` | VARCHAR(20) | NOT NULL DEFAULT 'scheduled' | `scheduled` or `done` |
| `pricing_mode` | VARCHAR(20) | NOT NULL | `per_player` or `total` |
| `price_per_player` | DECIMAL(8,2) | NULL | Set directly in `per_player` mode; calculated in `total` mode |
| `total_amount` | DECIMAL(8,2) | NULL | Total field cost (used only in `total` mode) |
| `remind_at` | TIMESTAMP | NULL | Organizer-chosen datetime to fire the unpaid reminder |
| `reminder_sent_at` | TIMESTAMP | NULL | Set after reminder WhatsApp is successfully sent |
| `completed_at` | TIMESTAMP | NULL | Set when organizer marks game as done |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Record creation time |

### `game_players`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `game_id` | INTEGER | FK → `games.id`, NOT NULL | References the game |
| `player_id` | INTEGER | FK → `players.id`, NOT NULL | References the attending player |
| `guests_count` | INTEGER | NOT NULL DEFAULT 0 | Number of extra people this player brought |
| `paid` | BOOLEAN | NOT NULL DEFAULT false | Whether this player (and their guests) have paid |

**Primary key:** `(game_id, player_id)`

---

## Relationships

| From | To | Type | Notes |
|------|----|------|-------|
| `players` | `game_players` | 1 → N | One player appears in many games |
| `games` | `game_players` | 1 → N | One game has many attending players |

---

## Business Rules

- A player cannot appear twice in the same game (`game_players` PK enforces this).
- `price_per_player` is always the per-head cost. In `total` mode it is calculated and stored after every attendance change: `total_amount / Σ(1 + guests_count)`.
- A player's total amount due = `price_per_player × (1 + guests_count)`.
- `reminder_sent_at` is only set on successful Twilio delivery. Failed sends leave it NULL so the cron retries.
- `completed_at` is set when `status` changes to `done`. It does NOT change if the organizer later edits the game.
