import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getGame, updateAttendee, completeGame, remindUnpaid, ApiError } from '../services/api'
import type { GameDetail } from '../services/api'

export function GameDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const gameId = Number(id)

  const [game, setGame] = useState<GameDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [reminding, setReminding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const fetchGame = () => {
    getGame(gameId)
      .then(setGame)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchGame() }, [gameId])

  const handleTogglePaid = async (playerId: number, current: boolean) => {
    try {
      await updateAttendee(gameId, playerId, { paid: !current })
      fetchGame()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleGuestsChange = async (playerId: number, guests: number) => {
    try {
      await updateAttendee(gameId, playerId, { guests_count: guests })
      fetchGame()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleComplete = async () => {
    setCompleting(true)
    try {
      const result = await completeGame(gameId)
      setMessage(`Game completed! WhatsApp sent to ${result.whatsapp_sent} player(s).`)
      fetchGame()
    } catch (e: any) {
      setError(e.message ?? 'WhatsApp failed to send — retry?')
    } finally {
      setCompleting(false)
    }
  }

  const handleRemind = async () => {
    setReminding(true)
    try {
      const result = await remindUnpaid(gameId)
      if (result.reminded > 0) {
        setMessage(`${result.reminded} reminder(s) sent.`)
      } else {
        setMessage('All players have paid.')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setReminding(false)
    }
  }

  if (loading) return <p>Loading...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>
  if (!game) return <p>Game not found.</p>

  return (
    <div style={{ maxWidth: 600 }}>
      <button onClick={() => navigate('/')} style={{ marginBottom: 16 }}>← Back to games</button>

      <h1>Game #{game.id}</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <span style={{
          padding: '2px 8px',
          borderRadius: 4,
          background: game.status === 'done' ? '#d4edda' : '#fff3cd',
          color: game.status === 'done' ? '#155724' : '#856404',
        }}>{game.status}</span>
      </div>

      <p><strong>Date:</strong> {game.date}</p>
      <p><strong>Time:</strong> {game.time}</p>
      <p><strong>Location:</strong> {game.location}</p>
      {game.playtomic_url && (
        <p><strong>Playtomic:</strong> <a href={game.playtomic_url} target="_blank" rel="noopener noreferrer">Open match</a></p>
      )}
      <p><strong>Pricing:</strong> {game.pricing_mode} {game.price_per_player ? `(€${game.price_per_player}/person)` : ''}</p>
      {game.remind_at && <p><strong>Remind at:</strong> {game.remind_at}</p>}
      {game.reminder_sent_at && <p><strong>Reminder sent at:</strong> {game.reminder_sent_at}</p>}
      {game.completed_at && <p><strong>Completed at:</strong> {game.completed_at}</p>}

      {message && <p style={{ color: 'green', background: '#d4edda', padding: 8, borderRadius: 4 }}>{message}</p>}

      <div style={{ margin: '16px 0', display: 'flex', gap: 8 }}>
        {game.status !== 'done' && (
          <button onClick={handleComplete} disabled={completing}>
            {completing ? 'Completing...' : 'Mark done'}
          </button>
        )}
        <button onClick={handleRemind} disabled={reminding}>
          {reminding ? 'Sending...' : 'Remind unpaid now'}
        </button>
      </div>

      <h2>Attendees</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(game.players ?? []).map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              border: '1px solid #ccc',
              borderRadius: 8,
            }}
          >
            {p.photo_url && (
              <img src={`/api${p.photo_url}`} alt={p.name} width={36} height={36} style={{ borderRadius: '50%', objectFit: 'cover' }} />
            )}
            <div style={{ flex: 1 }}>
              <strong>{p.name}</strong>
              <div style={{ fontSize: '0.85em', color: '#666' }}>
                Due: €{p.amount_due}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label>
                Guests:
                <input
                  type="number"
                  min={0}
                  value={p.guests_count}
                  onChange={(e) => handleGuestsChange(p.id, Number(e.target.value))}
                  style={{ width: 48, marginLeft: 4 }}
                />
              </label>
              <button onClick={() => handleTogglePaid(p.id, p.paid)}>
                {p.paid ? 'Paid ✓' : 'Mark paid'}
              </button>
            </div>
          </div>
        ))}
        {(game.players ?? []).length === 0 && <p>No attendees set for this game.</p>}
      </div>
    </div>
  )
}