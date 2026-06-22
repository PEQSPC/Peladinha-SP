# Implementation Plan — Frontend (Peladinha-SP Subsystem A)

**Prerequisite:** Backend must be running on `localhost:3000` before starting frontend work.
Reference: [API spec](api.md) | [architecture design](2026-06-12-subsystem-a-design.md)

Frontend pages are verified manually in the browser (organizer-only internal tool). The API service layer has no logic to unit-test — all business logic lives in the backend.

---

## Phase 1 — Scaffolding

Configuration only — no behaviour to test.

**1.1** Scaffold with Vite from the project root
```bash
yarn create vite frontend --template react-ts
cd frontend && yarn install
```

**1.2** Configure Vite proxy in `frontend/vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

All frontend fetch calls use the `/api/...` prefix.

**1.3** Install dependencies
```bash
yarn add react-router-dom
```

**1.4** Set up routing in `src/App.tsx`

| Path | Component |
|------|-----------|
| `/` | `Games` |
| `/players` | `Players` |
| `/players/new` | `AddEditPlayer` (create mode) |
| `/players/:id` | `AddEditPlayer` (edit mode) |
| `/games/new` | `CreateGame` |
| `/games/:id` | `GameDetail` |

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Games } from './pages/Games'
import { Players } from './pages/Players'
import { AddEditPlayer } from './pages/AddEditPlayer'
import { CreateGame } from './pages/CreateGame'
import { GameDetail } from './pages/GameDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Games />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/new" element={<AddEditPlayer />} />
        <Route path="/players/:id" element={<AddEditPlayer />} />
        <Route path="/games/new" element={<CreateGame />} />
        <Route path="/games/:id" element={<GameDetail />} />
      </Routes>
    </BrowserRouter>
  )
}
```

---

## Phase 2 — API Service Layer

File: `src/services/api.ts`

Create this before building any page. Pages import all API calls from here — no raw `fetch` calls in pages.

**2.1** Define `ApiError` and the `request` wrapper
```typescript
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isFormData = body instanceof FormData
  const res = await fetch(`/api${path}`, {
    method,
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, data.error ?? 'Unknown error')
  }
  return res.json()
}
```

**2.2** Export typed functions for all 11 endpoints

```typescript
// Types
export interface Player {
  id: number; name: string; phone: string; photo_url: string | null; created_at: string
}
export interface Game {
  id: number; date: string; time: string; location: string; playtomic_url: string | null
  status: 'scheduled' | 'done'; pricing_mode: 'per_player' | 'total'
  price_per_player: string | null; total_amount: string | null
  remind_at: string | null; reminder_sent_at: string | null; completed_at: string | null
}
export interface Attendee extends Player {
  guests_count: number; paid: boolean; amount_due: string
}
export interface GameDetail extends Game { players: Attendee[] }

// Players
export const getPlayers = () => request<Player[]>('GET', '/players')
export const createPlayer = (data: FormData) => request<Player>('POST', '/players', data)
export const updatePlayer = (id: number, data: FormData) => request<Player>('PATCH', `/players/${id}`, data)

// Games
export const getGames = () => request<Game[]>('GET', '/games')
export const createGame = (data: object) => request<Game>('POST', '/games', data)
export const getGame = (id: number) => request<GameDetail>('GET', `/games/${id}`)
export const updateGame = (id: number, data: object) => request<Game>('PATCH', `/games/${id}`, data)

// Attendance
export const setAttendance = (gameId: number, playerIds: number[]) =>
  request<{ attending: number; price_per_player: string }>('POST', `/games/${gameId}/players`, { player_ids: playerIds })
export const updateAttendee = (gameId: number, playerId: number, data: { paid?: boolean; guests_count?: number }) =>
  request<Attendee>('PATCH', `/games/${gameId}/players/${playerId}`, data)

// Actions
export const completeGame = (gameId: number) =>
  request<{ status: string; completed_at: string; whatsapp_sent: number }>('POST', `/games/${gameId}/complete`)
export const remindUnpaid = (gameId: number) =>
  request<{ reminded: number }>('POST', `/games/${gameId}/remind`)
```

---

## Phase 3 — Players Pages

Verify each step manually: `cd frontend && yarn dev`, open `http://localhost:5173`.

### 3.1 — Players list page (`src/pages/Players.tsx`)

Build and verify:
- [ ] Page loads without console errors
- [ ] `GET /api/players` is called on mount (check Network tab)
- [ ] Empty state shown when no players
- [ ] Player cards show name, phone, thumbnail photo
- [ ] "Add player" button navigates to `/players/new`
- [ ] Clicking a player card navigates to `/players/:id`

```typescript
// Minimum structure
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlayers, Player, ApiError } from '../services/api'

export function Players() {
  const [players, setPlayers] = useState<Player[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <div>
      <button onClick={() => navigate('/players/new')}>Add player</button>
      {players.map(p => (
        <div key={p.id} onClick={() => navigate(`/players/${p.id}`)}>
          {p.photo_url && <img src={p.photo_url} alt={p.name} width={40} />}
          <span>{p.name}</span>
          <span>{p.phone}</span>
        </div>
      ))}
    </div>
  )
}
```

### 3.2 — Add/Edit player page (`src/pages/AddEditPlayer.tsx`)

Build and verify:
- [ ] `/players/new` shows empty form
- [ ] `/players/:id` pre-fills form with existing player data
- [ ] Photo file input shows a preview of the selected image
- [ ] Submit calls `POST /api/players` (create) or `PATCH /api/players/:id` (edit)
- [ ] Success navigates back to `/players`
- [ ] API error message is shown under the form
- [ ] Submit button disabled while request is in flight

Key implementation notes:
- Use `useParams()` to detect create vs edit mode (`id === undefined` → create)
- Fetch existing player data on mount when in edit mode
- Use `FormData` to submit (required for photo upload)
- Photo preview: `URL.createObjectURL(file)` on `input[type=file]` change

---

## Phase 4 — Games Pages

### 4.1 — Games list page (`src/pages/Games.tsx`)

Build and verify:
- [ ] `GET /api/games` called on mount
- [ ] Games grouped under year headings (e.g. **2026**, **2025**), years descending
- [ ] Within each year, games sorted by date descending
- [ ] Each card shows date, time, location, status badge (`scheduled` / `done`)
- [ ] "Create game" button navigates to `/games/new`
- [ ] Clicking a game navigates to `/games/:id`

Grouping logic:
```typescript
const byYear = games.reduce<Record<number, Game[]>>((acc, g) => {
  const year = new Date(g.date).getFullYear()
  acc[year] = [...(acc[year] ?? []), g]
  return acc
}, {})
const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)
```

### 4.2 — Create game page (`src/pages/CreateGame.tsx`)

Build and verify:
- [ ] Toggle between "Paste Playtomic message" and "Manual entry" modes
- [ ] In Playtomic mode: textarea accepts the share message
- [ ] In manual mode: date, time, location fields shown
- [ ] Pricing section: radio for `per_player` / `total`, number input for the chosen mode
- [ ] Optional `remind_at` datetime-local input
- [ ] On 400 from API: show error banner, switch to manual mode, pre-fill any extracted fields
- [ ] On 201: navigate to `/games/:id`
- [ ] Submit button disabled while request is in flight

Payload construction:
```typescript
// Playtomic mode
const payload = { raw_message: message, pricing_mode, price_per_player, total_amount, remind_at }

// Manual mode
const payload = { date, time, location, pricing_mode, price_per_player, total_amount, remind_at }
```

### 4.3 — Game detail page (`src/pages/GameDetail.tsx`)

Build and verify:
- [ ] `GET /api/games/:id` called on mount
- [ ] Header shows date, time, location, status badge
- [ ] Playtomic URL shown as a clickable link (when not null)
- [ ] Pricing info: `price_per_player` and `total_amount` (when set)
- [ ] `remind_at` shown when set; `reminder_sent_at` shown when sent
- [ ] Attendee list: photo thumbnail, name, `amount_due`, paid toggle, guests count input
  - Paid toggle: calls `PATCH /api/games/:id/players/:playerId { paid: !current }`; updates UI on success
  - Guests input: on change, calls `PATCH` with `{ guests_count: N }`; `amount_due` updates in UI
- [ ] "Mark done" button: calls `POST /api/games/:id/complete`
  - On success: status badge updates to `done`
  - On 500: show error banner "WhatsApp failed to send — retry?"
  - Button hidden when game is already `done`
- [ ] "Remind unpaid now" button: calls `POST /api/games/:id/remind`
  - On success: show `"X reminder(s) sent"`
  - Returns 0 if all paid: show `"All players have paid"`

---

## Frontend Verification Checklist

Complete the full organizer flow manually before considering the frontend done:

- [ ] Add a player with a photo → photo appears in the list
- [ ] Edit a player's phone number → change persists on reload
- [ ] Create a game by pasting a real Playtomic message → fields populated correctly
- [ ] Create a game manually → appears in the games list under the correct year
- [ ] Set attendance on a game → players appear on Game Detail
- [ ] Mark a player as paid → paid indicator updates immediately
- [ ] Add guests for a player → `amount_due` updates to reflect guests
- [ ] Set `remind_at` on a game → value shown on Game Detail
- [ ] Mark game as done → status updates to `done`, "Mark done" button disappears
- [ ] Click "Remind unpaid now" → count of messages shown
- [ ] All pages show loading state while fetching
- [ ] All pages show error message on API failure (test by stopping the backend)
- [ ] No console errors in any flow
