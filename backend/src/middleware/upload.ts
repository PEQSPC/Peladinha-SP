/**
 * Multer File Upload Middleware
 * Handles photo uploads for player profiles.
 * Files are stored to UPLOAD_DIR/players with unique timestamps.
 * Max file size is configurable via MAX_PHOTO_SIZE_MB env var (default 5MB).
 */
import multer from 'multer'
import path from 'path'

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(process.env.UPLOAD_DIR || './uploads', 'players'))
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  },
})

export const upload = multer({
  storage,
  limits: { fileSize: (Number(process.env.MAX_PHOTO_SIZE_MB) || 5) * 1024 * 1024 },
})