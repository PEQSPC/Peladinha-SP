# Deployment Guide — Peladinha-SP Subsystem A

---

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Yarn (backend uses `yarn`)
- A Twilio account with WhatsApp sandbox (development) or WhatsApp Business API (production)

---

## Environment Variables

Create a `.env` file in `backend/`. Never commit this file.

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/peladinha_dev

# File uploads
UPLOAD_DIR=./uploads
MAX_PHOTO_SIZE_MB=5

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   # sandbox number for dev
```

For production, add:
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@prod-host:5432/peladinha_prod
TWILIO_WHATSAPP_FROM=whatsapp:+351xxxxxxxxx  # your approved business number
```

---

## Local Development Setup

```bash
# 1. Create the database
createdb peladinha_dev

# 2. Install dependencies
cd backend
yarn install

# 3. Run migrations
yarn knex migrate:latest

# 4. Start the backend (ts-node-dev or similar)
yarn dev
```

```bash
# Frontend (separate terminal)
cd frontend
yarn install
yarn dev
```

Backend runs on `http://localhost:3000`.
Frontend runs on `http://localhost:5173` (Vite default).

---

## Database Migrations

Migrations live in `backend/src/db/migrations/`.

```bash
# Apply all pending migrations
yarn knex migrate:latest

# Roll back the most recent migration
yarn knex migrate:rollback

# Create a new migration file
yarn knex migrate:make migration_name
```

Migration order:
1. `001_create_players`
2. `002_create_games`
3. `003_create_game_players`

---

## File Uploads

Photos are stored at the path set in `UPLOAD_DIR` (default `./uploads`).

The Express server serves this directory at `/uploads`. In production, proxy this path through nginx or serve from a CDN/object store.

Ensure `UPLOAD_DIR` exists and is writable by the process:
```bash
mkdir -p backend/uploads/players
```

---

## Twilio Setup

### Development (sandbox)

1. Log in to [console.twilio.com](https://console.twilio.com)
2. Go to **Messaging → Try it out → Send a WhatsApp message**
3. Follow instructions to join the sandbox from your WhatsApp
4. Use the sandbox `From` number in `.env`

### Production

1. Apply for WhatsApp Business API access via Twilio
2. Get a dedicated WhatsApp-enabled number approved by Meta
3. Update `TWILIO_WHATSAPP_FROM` in production env

Message templates must be pre-approved by Meta for production use. Submit the post-game and reminder message templates before going live.

---

## Running Tests

```bash
# Create a test database
createdb peladinha_test

# Set test env
export DATABASE_URL=postgresql://user:password@localhost:5432/peladinha_test
export NODE_ENV=test

cd backend
yarn test
```

---

## Production Checklist

- [ ] `.env` set with production values (not committed to git)
- [ ] `NODE_ENV=production`
- [ ] Production database created and migrations applied
- [ ] `uploads/` directory writable by process (or CDN configured)
- [ ] Twilio production number approved for WhatsApp
- [ ] Message templates approved by Meta
- [ ] `PORT` set and nginx/reverse proxy configured
- [ ] Process manager configured (PM2 or systemd) to restart on crash
- [ ] Cron job health monitored (log output from `reminderJob.ts`)
