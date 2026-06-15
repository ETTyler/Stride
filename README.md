# Hypertrophy

An autoregulated hypertrophy training app — a Renaissance Periodization–style
tracker. You build an exercise library, plan a mesocycle, log every set, and rate
recovery after each session. Next week's volume and load are then prescribed
automatically: volume climbs from MEV toward MRV when you're recovering well and
backs off when you're not, RIR ramps down across the block, and the final week is
a deload.

## Stack

- **Next.js 16** (App Router, server actions)
- **Drizzle ORM** on **Neon Postgres**
- Pure, unit-tested progression engine in `lib/progression/`

## Getting started

1. **Install**

   ```bash
   npm install
   ```

2. **Configure the database.** Create a Neon Postgres database, then copy the env
   template and paste your connection string:

   ```bash
   cp .env.example .env.local
   # edit .env.local and set DATABASE_URL
   ```

3. **Push the schema and seed the catalog** — 14 muscle groups with their volume
   landmarks, plus a curated starter library of ~30 of the most popular
   exercises (with sensible rep ranges). The seed is idempotent, so it's safe to
   re-run on an existing database.

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Run it**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Using the app

- **Library** (`/library`) — comes pre-loaded with a curated set of popular
  exercises; add your own and tag each to a muscle. Primary muscles drive weekly
  volume; secondary muscles count half.
- **Plan** (`/plan`) — create a mesocycle, add training days, and add exercises to
  each day. You can pick from your library or **create a new exercise inline**
  while building the day. Then **Start mesocycle** to generate week 1.
- **Today** (`/` and `/workout`) — log your sets in the gym, run the rest timer,
  and rate recovery at the end. When a week is fully logged, generate the next
  week — it's autoregulated from your logs and feedback.

## How progression works

`lib/progression/` is a pure module (no DB/React imports) so the logic is easy to
test:

- `rir.ts` — target RIR per week (ramps 3 → 0, deload high).
- `volume.ts` — reads recovery feedback and decides ±sets, clamped to each
  muscle's MEV/MAV/MRV landmarks.
- `load.ts` — double progression: add reps to the top of the range, then add load.
- `prescribe.ts` — ties them together into one prescription per exercise.

Run the tests:

```bash
npm test
```
