# SwishIt

Mobile-first basketball minigame app with two modes:

1. **Undefeated** — spin a year + team, draft a starting five (position-locked) plus a sixth man from real season lines, then get an 82-game record and storylines vs all-time competition.
2. **Detective** — daily NYT Connections-style puzzle with NBA players and coaches. Resets at midnight America/New_York. Scores out of 100 (time, accuracy, difficulty).

## Quick start (local prototype)

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Local DB is SQLite (`DATABASE_URL=file:./prisma/dev.db`) so you can prototype without Docker.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma ORM
- SQLite locally → Postgres on Render

## Expanding the Undefeated database

Seed data lives in:

- `prisma/data/players.ts` — player-seasons (1980–2026 coverage; prototype sample, expandable toward thousands)
- `prisma/data/teams.ts`
- `prisma/data/coaches.ts` — for Detective
- `prisma/data/puzzles.ts` — dated daily boards + rotation bank

Add rows, then `npm run db:seed`.

### Daily Detective puzzles

Add a puzzle with `puzzleDate: "YYYY-MM-DD"` (ET calendar date) in `prisma/data/puzzles.ts`, re-seed, or insert via Prisma Studio. If no dated puzzle exists for today, a bank puzzle rotates by date.

## Deploying to Render

This repo includes a `render.yaml` Blueprint. It runs on SQLite: migrate + seed happen at build, then `next start`.

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, pick the repo, apply `render.yaml`.
3. After the first deploy, open the service URL (e.g. `https://swishit.onrender.com`).

Free web services spin down when idle — the first request after a nap can take a minute.

Postgres is still the right move later if you store user data. Until then, seed-only SQLite is enough.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local Next.js |
| `npm run db:seed` | Reseed players, coaches, puzzles |
| `npm run db:studio` | Browse the DB |
| `npm run build` | Production build |
# SwishIt
