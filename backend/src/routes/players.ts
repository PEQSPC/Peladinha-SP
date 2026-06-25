import { Router } from 'express'
import { db } from '../db/knex'
import { upload } from '../middleware/upload'

/**
 * Players Router
 * Handles CRUD operations for the player roster.
 * All routes are organizer-managed (no self-registration).
 */

export const playersRouter = Router()

/** GET /players — Returns all registered players */
playersRouter.get('/', async (_req, res) => {
  const players = await db('players').select('*')
  res.json(players)
})

/** POST /players — Creates a new player (multipart/form-data with optional photo) */
playersRouter.post('/', upload.single('photo'), async (req, res) => {
  const { name, phone } = req.body
  if (!name || !phone) {
    return res.status(400).json({ error: 'name and phone are required' })
  }
  const photoUrl = req.file ? `/uploads/players/${req.file.filename}` : null
  const [player] = await db('players')
    .insert({ name, phone, photo_url: photoUrl })
    .returning('*')
  res.status(201).json(player)
})

/** PATCH /players/:id — Updates a player (all fields optional, returns 404 if not found) */
playersRouter.patch('/:id', upload.single('photo'), async (req, res) => {
  const { id } = req.params
  const existing = await db('players').where({ id }).first()
  if (!existing) {
    return res.status(404).json({ error: 'Player not found' })
  }
  const updates: Record<string, string | undefined> = {}
  if (req.body.name) updates.name = req.body.name
  if (req.body.phone) updates.phone = req.body.phone
  if (req.file) updates.photo_url = `/uploads/players/${req.file.filename}`
  const [player] = await db('players').where({ id }).update(updates).returning('*')
  res.json(player)
})