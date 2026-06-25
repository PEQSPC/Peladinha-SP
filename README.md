# Peladinha-SP

A friendly betting game among friends, built as a web app.

Players are given a fixed amount of play tokens (fake money) to start. A game is created and confirmed via PlayAtomic. Players pay real money to participate (e.g. court costs). If a player brings outside players, those players pay real money to the player who brought them. Once the game is set up, players place their live bets using fake tokens on which team will win. After the game, token stakes are distributed among the winners and final results are recorded.

### Features

- Players start with a fixed amount of play tokens (fake money)
- Create and schedule games, confirmed via PlayAtomic
- Real money payment system for game participation (e.g. court costs)
- Track who pays whom when a player brings outside players
- Place and confirm bets using play tokens on which team will win
- Distribute token winnings automatically to winners
- Record final scores and track player rankings
- Upload and save game videos if the match is recorded
- Scorecard to display game results and player rankings
- Ranking system with weighted token gains/losses (higher-ranked players lose more tokens when they lose, lower-ranked players lose less)
- End-of-season ranking: bottom-ranked players buy dinner

Built with React, Material UI, Express, TypeScript, PostgreSQL (Knex), and WhatsApp notifications via Twilio.

## Request Flow

```
Client (Browser / Mobile)
        │
        ▼
  ┌──────────────────────────────┐
  │  Express Server (index.ts)   │
  │  - JSON body parse           │
  │  - Static /uploads serve     │
  │  - Health check (/health)    │
  └────────┬─────────────────────┘
           │
           ▼
  ┌──────────────────────────────┐
  │  Router Layer (routes/)      │
  │  - /players  → players.ts    │
  │  - /games    → games.ts      │
  │  - /games/:id/players → att. │
  └────────┬─────────────────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌──────────┐ ┌──────────┐
│ Services │ │ Database │
│ .ts      │ │ (knex)   │
│          │ │          │
│ pricing  │ │ players  │
│ parser   │ │ games    │
│ whatsapp │ │ g_players│
│ cron     │ │          │
└──────────┘ └──────────┘
     │
     ▼
  Twilio WhatsApp API

Examples:
  GET  /players          →  DB query  →  JSON array of players
  POST /games            →  Parse Playtomic msg →  INSERT game  →  201 JSON
  POST /games/:id/complete →  UPDATE status →  Twilio to all attendees  →  200 JSON
  cron (every 5h)        →  DB query unpaid →  Twilio reminders
```

## How to run this project

### Docker

Build the image:
```bash
cd backend
yarn docker:build
```

Run the server (foreground):
```bash
yarn docker:run
```

Run as a daemon (production-like):
```bash
yarn docker:run:prod
```


### Local development

```bash
cd backend
yarn install
yarn dev
```

The API runs on `http://localhost:3000`.


## tools used
Appflowy for agile development
yarn
react
material ui
express js
typescript
knex migrations
docker