import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlayers, ApiError } from '../services/api'
import type { Player } from '../services/api'

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
      <h1>Players</h1>
      <button onClick={() => navigate('/players/new')}>+ Add player</button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {players.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/players/${p.id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              border: '1px solid #ccc',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            {p.photo_url && (
              <img src={`/api${p.photo_url}`} alt={p.name} width={40} height={40} style={{ borderRadius: '50%', objectFit: 'cover' }} />
            )}
            <div>
              <strong>{p.name}</strong>
              <div style={{ fontSize: '0.85em', color: '#666' }}>{p.phone}</div>
            </div>
          </div>
        ))}
        {players.length === 0 && <p>No players yet. Add one!</p>}
      </div>
    </div>
  )
}