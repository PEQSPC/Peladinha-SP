/**
 * Peladinha-SP Backend — Entry Point
 *
 * Express + TypeScript server for the Peladinha-SP betting game app.
 * Provides REST API for managing players, games, attendance, and payments.
 * Includes a cron job that runs every 5 hours to remind unpaid players via WhatsApp.
 *
 * Routes:
 *  - /health          Health check
 *  - /players         Player roster CRUD (with photo upload)
 *  - /games           Game scheduling, detail, and status management
 *  - /games/:id/players  Attendance management
 *  - /games/:id/complete Mark game done + WhatsApp broadcast
 *  - /games/:id/remind   Send WhatsApp to unpaid players
 */
import 'dotenv/config'
import express from 'express'
import path from 'path'
import { playersRouter } from './routes/players'
import { gamesRouter } from './routes/games'
import { startReminderJob } from './services/reminderJob'

export const app = express()
app.use(express.json())
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/players', playersRouter)
app.use('/games', gamesRouter)

if (require.main === module) {
  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  startReminderJob()
}