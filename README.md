# Stride

Stride is an autoregulated hypertrophy training app — a Renaissance Periodization–style
tracker. You build an exercise library, plan a mesocycle, log every set in the gym, and
rate recovery after each session. Next week's prescription is then generated automatically:
volume climbs from MEV toward MRV when you're recovering well and backs off when you're not,
target RIR ramps down across the block, load follows double progression, and the final week
is a deload.

It's multi-user — each person signs in with Google and only ever sees their own library,
plans, and history.

## Stack

- **Next.js 16** (App Router, server components, server actions)
- **Auth.js / NextAuth v5** with the **Drizzle adapter** (Google OAuth, database sessions)
- **Drizzle ORM** on **Neon Postgres**
- Pure, unit-tested progression engine in `lib/progression/`

## Getting started

1. **Install**

   ```bash
   npm install
   ```

2. **Configure environment.** Copy the template and fill it in:

   ```bash
   cp .env.example .env.local
   ```

   - `DATABASE_URL` — a Neon Postgres connection string (free at https://neon.tech).
   - `AUTH_SECRET` — generate one with `npx auth secret`.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from a Google OAuth client
     (https://console.cloud.google.com/apis/credentials). Authorized redirect URI for local
     dev: `http://localhost:3000/api/auth/callback/google`.

3. **Push the schema and seed the catalog** — 14 muscle groups with their volume landmarks,
   plus a curated starter library of ~30 popular exercises (with sensible rep ranges). The
   seed is idempotent, so it's safe to re-run on an existing database.

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Run it**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 — you'll be sent to sign in first.

## Using the app

- **Library** (`/library`) — comes pre-loaded with popular exercises; add your own and tag
  each to a primary muscle (plus optional secondary muscles). Primary muscles count a full
  set toward weekly volume, secondary muscles count half.
- **Plan** (`/plan`) — create a mesocycle, add training days, and add exercises to each day
  (pick from your library or create one inline). Reorder days with the ↑/↓ controls, swap or
  remove exercises, and optionally set a fixed **sets per session** per exercise (leave it
  "Auto" to let the engine choose). Then **Start mesocycle** to generate week 1. You can edit
  a running meso, **mark it complete**, **reactivate** it, or **start the next block carrying
  the plan over**. Plans can be edited mid-mesocycle.
- **Today / Workout** (`/` and `/workout`) — log your sets in the gym with instant
  (optimistic) updates, skip or add sets, swap or add an exercise on the fly, and use the
  rest timer (which keeps accurate time in the background / across app switches). Finish any
  time with **Finish & log recovery** — completed sets are kept and you rate pump, soreness,
  joint pain, and workload, which drives next week's volume.
- **Dashboard** (`/`) — shows your active mesocycle's week-by-week progress and a
  per-muscle weekly volume overview against MEV/MAV/MRV.
- **History** (`/history`) — your completed workouts, newest first, each expandable to show
  the exercises and the weight × reps you logged.

When a training week is fully logged, generate the next week from the dashboard or the
workout screen — it's autoregulated from your logs and recovery feedback.

## How progression works

`lib/progression/` is a pure module (no DB/React imports), so the logic is easy to test:

- `rir.ts` — target RIR per week (ramps 3 → 0 across working weeks, deload kept easy).
- `volume.ts` — reads recovery feedback and decides ±sets, clamped to each muscle's
  MEV/MAV/MRV landmarks (a manual "sets per session" goal overrides this when set).
- `load.ts` — double progression: add reps toward the top of the range, then add load and
  reset toward the bottom.
- `prescribe.ts` — ties them together into one prescription per exercise.

Run the tests:

```bash
npm test
```

## Deploying (Vercel)

Connect the repo to Vercel and add the same environment variables (`DATABASE_URL`,
`AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) in **Project → Settings →
Environment Variables**. Add your production domain's callback URL
(`https://your-domain/api/auth/callback/google`) to the Google OAuth client.

Note: deploys do **not** run database migrations. After changing the schema, run
`npm run db:push` against the production database yourself.
