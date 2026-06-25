import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGames, ApiError } from '../services/api'
import type { Game } from '../services/api'

export function Games() {
  const [games, setGames] = useState<Game[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getGames()
      .then(setGames)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  const byYear = games.reduce<Record<number, Game[]>>((acc, g) => {
    const year = new Date(g.date).getFullYear()
    acc[year] = [...(acc[year] ?? []), g]
    return acc
  }, {})
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  return (
    <div>
      <h1>Games</h1>
      <button onClick={() => navigate('/games/new')}>+ Create game</button>

      {years.map((year) => (
        <div key={year} style={{ marginTop: 24 }}>
          <h2>{year}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byYear[year].map((g) => (
              <div
                key={g.id}
                onClick={() => navigate(`/games/${g.id}`)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 12,
                  border: '1px solid #ccc',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                <div>
                  <strong>{g.date}</strong> {g.time} — {g.location}
                </div>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: '0.85em',
                  background: g.status === 'done' ? '#d4edda' : '#fff3cd',
                  color: g.status === 'done' ? '#155724' : '#856404',
                }}>
                  {g.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {games.length === 0 && <p>No games yet. Create one!</p>}
    </div>
  )
}