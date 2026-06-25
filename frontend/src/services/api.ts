export class ApiError extends Error {
  declare status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
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

// ── Types ──

export interface Player {
  id: number
  name: string
  phone: string
  photo_url: string | null
  created_at: string
}

export interface Game {
  id: number
  date: string
  time: string
  location: string
  playtomic_url: string | null
  status: 'scheduled' | 'done'
  pricing_mode: 'per_player' | 'total'
  price_per_player: string | null
  total_amount: string | null
  remind_at: string | null
  reminder_sent_at: string | null
  completed_at: string | null
}

export interface Attendee extends Player {
  guests_count: number
  paid: boolean
  amount_due: string
}

export interface GameDetail extends Game {
  players: Attendee[]
}

// ── Players ──

export const getPlayers = () => request<Player[]>('GET', '/players')
export const createPlayer = (data: FormData) => request<Player>('POST', '/players', data)
export const updatePlayer = (id: number, data: FormData) => request<Player>('PATCH', `/players/${id}`, data)

// ── Games ──

export const getGames = () => request<Game[]>('GET', '/games')
export const createGame = (data: object) => request<Game>('POST', '/games', data)
export const getGame = (id: number) => request<GameDetail>('GET', `/games/${id}`)
export const updateGame = (id: number, data: object) => request<Game>('PATCH', `/games/${id}`, data)

// ── Attendance ──

export const setAttendance = (gameId: number, playerIds: number[]) =>
  request<{ attending: number; price_per_player: string }>('POST', `/games/${gameId}/players`, { player_ids: playerIds })
export const updateAttendee = (gameId: number, playerId: number, data: { paid?: boolean; guests_count?: number }) =>
  request<Attendee>('PATCH', `/games/${gameId}/players/${playerId}`, data)

// ── Actions ──

export const completeGame = (gameId: number) =>
  request<{ status: string; completed_at: string; whatsapp_sent: number }>('POST', `/games/${gameId}/complete`)
export const remindUnpaid = (gameId: number) =>
  request<{ reminded: number }>('POST', `/games/${gameId}/remind`)