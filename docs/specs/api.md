# API Specification — Peladinha-SP Subsystem A

Base URL: `http://localhost:3000` (development)

All request and response bodies are `application/json` unless noted (photo upload uses `multipart/form-data`).

---

## Players

### `GET /players`

List all registered players.

**Response 200**
```json
[
  {
    "id": 1,
    "name": "Teles Gomes",
    "phone": "+351912345678",
    "photo_url": "/uploads/players/1.jpg",
    "created_at": "2026-06-12T10:00:00Z"
  }
]
```

---

### `POST /players`

Create a new player. Accepts `multipart/form-data`.

**Request fields**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | |
| `phone` | string | Yes | International format, e.g. `+351912345678` |
| `photo` | file | No | JPEG/PNG, max 5MB |

**Response 201**
```json
{
  "id": 2,
  "name": "João Silva",
  "phone": "+351961234567",
  "photo_url": "/uploads/players/2.jpg",
  "created_at": "2026-06-12T11:00:00Z"
}
```

**Errors**

| Status | Condition |
|--------|-----------|
| 400 | Missing `name` or `phone` |
| 413 | Photo exceeds 5MB |

---

### `PATCH /players/:id`

Update an existing player. Accepts `multipart/form-data`. All fields optional.

**Request fields**

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | |
| `phone` | string | |
| `photo` | file | Replaces existing photo |

**Response 200** — updated player object (same shape as POST 201)

**Errors**

| Status | Condition |
|--------|-----------|
| 404 | Player not found |

---

## Games

### `GET /games`

List all games ordered by date descending. Frontend groups by year.

**Response 200**
```json
[
  {
    "id": 5,
    "date": "2026-06-12",
    "time": "21:00",
    "location": "Braga",
    "playtomic_url": "https://app.playtomic.com/matches/abc123",
    "status": "scheduled",
    "pricing_mode": "total",
    "price_per_player": null,
    "total_amount": "60.00",
    "remind_at": "2026-06-14T09:00:00Z",
    "reminder_sent_at": null,
    "completed_at": null,
    "created_at": "2026-06-11T18:00:00Z"
  }
]
```

---

### `POST /games`

Create a game. Send either `raw_message` (Playtomic paste) or manual fields.

**Request body**

```json
{
  "raw_message": "JOGO NO FUT7 !\n\n 📅 sexta-feira, 12, 21:00 (15min)\n 📍 Braga\n...",
  "date": null,
  "time": null,
  "location": null,
  "playtomic_url": null,
  "pricing_mode": "total",
  "price_per_player": null,
  "total_amount": 60.00,
  "remind_at": "2026-06-14T09:00:00Z"
}
```

If `raw_message` is provided, `date`, `time`, `location`, and `playtomic_url` are extracted from it and any manually provided values for those fields are ignored.

If `raw_message` is absent, `date`, `time`, and `location` are required.

**Response 201** — created game object (same shape as GET /games item)

**Errors**

| Status | Condition |
|--------|-----------|
| 400 | `raw_message` provided but could not be parsed |
| 400 | Manual mode but `date`, `time`, or `location` missing |
| 400 | `pricing_mode` invalid or required price field missing |
| 422 | `total` mode but no players yet (division by zero guard — recalculated on attendance set) |

---

### `GET /games/:id`

Game detail including attendees.

**Response 200**
```json
{
  "id": 5,
  "date": "2026-06-12",
  "time": "21:00",
  "location": "Braga",
  "playtomic_url": "https://app.playtomic.com/matches/abc123",
  "status": "scheduled",
  "pricing_mode": "total",
  "price_per_player": "6.00",
  "total_amount": "60.00",
  "remind_at": "2026-06-14T09:00:00Z",
  "reminder_sent_at": null,
  "completed_at": null,
  "created_at": "2026-06-11T18:00:00Z",
  "players": [
    {
      "id": 1,
      "name": "Teles Gomes",
      "phone": "+351912345678",
      "photo_url": "/uploads/players/1.jpg",
      "guests_count": 1,
      "paid": false,
      "amount_due": "12.00"
    }
  ]
}
```

`amount_due` is computed: `price_per_player × (1 + guests_count)`. Not stored in the DB.

**Errors**

| Status | Condition |
|--------|-----------|
| 404 | Game not found |

---

### `PATCH /games/:id`

Update game fields (e.g. change `remind_at`, adjust pricing). All fields optional.

**Request body**
```json
{
  "remind_at": "2026-06-15T10:00:00Z",
  "pricing_mode": "per_player",
  "price_per_player": 7.50,
  "total_amount": null
}
```

**Response 200** — updated game object

**Errors**

| Status | Condition |
|--------|-----------|
| 404 | Game not found |
| 400 | Invalid pricing fields |

---

### `POST /games/:id/players`

Set the attendance list for a game. Replaces existing attendance.

**Request body**
```json
{
  "player_ids": [1, 3, 7]
}
```

In `total` mode, `price_per_player` is recalculated after updating attendance.

**Response 200**
```json
{ "attending": 3, "price_per_player": "20.00" }
```

**Errors**

| Status | Condition |
|--------|-----------|
| 404 | Game not found |
| 400 | Unknown player ID in list |

---

### `PATCH /games/:id/players/:playerId`

Update a specific player's attendance record: toggle paid or update guest count.

**Request body** (all fields optional)
```json
{
  "paid": true,
  "guests_count": 2
}
```

In `total` mode, changing `guests_count` triggers `price_per_player` recalculation.

**Response 200**
```json
{
  "game_id": 5,
  "player_id": 1,
  "guests_count": 2,
  "paid": true,
  "amount_due": "18.00"
}
```

**Errors**

| Status | Condition |
|--------|-----------|
| 404 | Game or player not found, or player not attending this game |

---

### `POST /games/:id/complete`

Mark a game as done and send WhatsApp to all attendees.

**Request body** — none

**Response 200**
```json
{ "status": "done", "completed_at": "2026-06-12T23:15:00Z", "whatsapp_sent": 8 }
```

**Errors**

| Status | Condition |
|--------|-----------|
| 404 | Game not found |
| 409 | Game already marked done |
| 500 | Twilio failure (game IS marked done; WhatsApp failed) |

---

### `POST /games/:id/remind`

Send WhatsApp reminder immediately to all unpaid players in this game.

**Request body** — none

**Response 200**
```json
{ "reminded": 3 }
```

`reminded` is the count of messages sent. Returns 0 if all players have paid.

**Errors**

| Status | Condition |
|--------|-----------|
| 404 | Game not found |
| 500 | Twilio failure |

---

## Error Response Shape

All error responses follow this shape:

```json
{
  "error": "Human-readable message"
}
```
