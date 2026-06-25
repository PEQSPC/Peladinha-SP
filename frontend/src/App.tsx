import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Games } from './pages/Games'
import { Players } from './pages/Players'
import { AddEditPlayer } from './pages/AddEditPlayer'
import { CreateGame } from './pages/CreateGame'
import { GameDetail } from './pages/GameDetail'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ borderBottom: '2px solid #eee', paddingBottom: 8 }}>Peladinha-SP</h1>
        <nav style={{ display: 'flex', gap: 16, margin: '16px 0' }}>
          <a href="/">Games</a>
          <a href="/players">Players</a>
        </nav>
        <Routes>
          <Route path="/" element={<Games />} />
          <Route path="/players" element={<Players />} />
          <Route path="/players/new" element={<AddEditPlayer />} />
          <Route path="/players/:id" element={<AddEditPlayer />} />
          <Route path="/games/new" element={<CreateGame />} />
          <Route path="/games/:id" element={<GameDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}