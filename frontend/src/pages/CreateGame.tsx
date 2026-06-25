import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createGame, ApiError } from '../services/api'

export function CreateGame() {
  const navigate = useNavigate()

  const [mode, setMode] = useState<'playtomic' | 'manual'>('playtomic')
  const [rawMessage, setRawMessage] = useState('')

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')

  const [pricingMode, setPricingMode] = useState<'per_player' | 'total'>('per_player')
  const [pricePerPlayer, setPricePerPlayer] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [remindAt, setRemindAt] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload: any = {
        pricing_mode: pricingMode,
        price_per_player: pricingMode === 'per_player' ? Number(pricePerPlayer) : null,
        total_amount: pricingMode === 'total' ? Number(totalAmount) : null,
        remind_at: remindAt || null,
      }

      if (mode === 'playtomic') {
        payload.raw_message = rawMessage
      } else {
        payload.date = date
        payload.time = time
        payload.location = location
      }

      const game = await createGame(payload)
      navigate(`/games/${game.id}`)
    } catch (e: any) {
      if (mode === 'playtomic' && e instanceof ApiError && e.status === 400) {
        setMode('manual')
        setError(`${e.message} — switching to manual mode. Fill in the fields below.`)
      } else {
        setError(e.message ?? 'Failed to create game')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1>Create Game</h1>

      <div style={{ marginBottom: 16 }}>
        <label>
          <input type="radio" checked={mode === 'playtomic'} onChange={() => setMode('playtomic')} />
          {' '}Paste Playtomic message
        </label>
        {' '}
        <label>
          <input type="radio" checked={mode === 'manual'} onChange={() => setMode('manual')} />
          {' '}Manual entry
        </label>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
        {mode === 'playtomic' ? (
          <div>
            <label>Playtomic message</label>
            <textarea
              value={rawMessage}
              onChange={(e) => setRawMessage(e.target.value)}
              rows={6}
              style={{ width: '100%' }}
              placeholder="Paste the Playtomic share message here..."
            />
          </div>
        ) : (
          <>
            <div>
              <label>Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div>
              <label>Time *</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div>
              <label>Location *</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} required style={{ width: '100%' }} />
            </div>
          </>
        )}

        <fieldset>
          <legend>Pricing</legend>
          <div>
            <label>
              <input type="radio" checked={pricingMode === 'per_player'} onChange={() => setPricingMode('per_player')} />
              {' '}Per player
            </label>
            {' '}
            <label>
              <input type="radio" checked={pricingMode === 'total'} onChange={() => setPricingMode('total')} />
              {' '}Total
            </label>
          </div>
          {pricingMode === 'per_player' ? (
            <div>
              <label>Price per player (€)</label>
              <input type="number" step="0.01" value={pricePerPlayer} onChange={(e) => setPricePerPlayer(e.target.value)} required style={{ width: '100%' }} />
            </div>
          ) : (
            <div>
              <label>Total amount (€)</label>
              <input type="number" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required style={{ width: '100%' }} />
            </div>
          )}
        </fieldset>

        <div>
          <label>Remind at (optional)</label>
          <input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} style={{ width: '100%' }} />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Game'}
        </button>
        <button type="button" onClick={() => navigate('/')}>Cancel</button>
      </form>
    </div>
  )
}