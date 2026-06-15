import { db } from "./client";
import { muscleGroups, exercises, exerciseMuscles } from "./schema";

/**
 * Seed the catalog:
 *   1. Muscle groups with RP-style volume landmarks (sets/week) — the
 *      autoregulation engine needs these.
 *   2. A curated starter library of the most popular strength-training
 *      exercises, each tagged to a muscle group with a sensible rep range.
 *      (Selection based on StrengthLog's "best exercises per body part":
 *      https://www.strengthlog.com/exercise-directory/)
 *
 * You're not locked into this list — add your own exercises in the app anytime.
 *
 * This seed is idempotent: it inserts muscles/exercises only if a row with the
 * same name doesn't already exist, so it's safe to re-run (e.g. to pull in new
 * curated lifts on an existing database).
 *
 * Run with: npm run db:seed
 *
 * Landmark and rep-range numbers are sensible starting defaults — tune them.
 */

const MUSCLES = [
  { name: "Upper Chest", category: "Chest & Shoulders", mev: 6, mav: 14, mrv: 20 },
  { name: "Chest", category: "Chest & Shoulders", mev: 8, mav: 16, mrv: 22 },
  { name: "Front Delt", category: "Chest & Shoulders", mev: 6, mav: 12, mrv: 16 },
  { name: "Side Delt", category: "Chest & Shoulders", mev: 8, mav: 18, mrv: 26 },
  { name: "Rear Delt", category: "Chest & Shoulders", mev: 6, mav: 14, mrv: 20 },
  { name: "Triceps", category: "Arms & Forearms", mev: 6, mav: 14, mrv: 18 },
  { name: "Back", category: "Back", mev: 10, mav: 18, mrv: 25 },
  { name: "Biceps", category: "Arms & Forearms", mev: 8, mav: 16, mrv: 20 },
  { name: "Forearms", category: "Arms & Forearms", mev: 4, mav: 10, mrv: 16 },
  { name: "Abs", category: "Core", mev: 6, mav: 16, mrv: 25 },
  { name: "Quads", category: "Legs", mev: 8, mav: 16, mrv: 20 },
  { name: "Hamstrings", category: "Legs", mev: 6, mav: 12, mrv: 16 },
  { name: "Glutes", category: "Legs", mev: 4, mav: 12, mrv: 16 },
  { name: "Calves", category: "Legs", mev: 6, mav: 14, mrv: 20 },
];

type SeedExercise = {
  name: string;
  low: number;
  high: number;
  step: number;
  primary: string;
  secondary?: string[];
};

// Compounds get lower rep ranges; isolation/machine work gets higher. Load
// "step" is the smallest sensible increment (barbell/machine ~2.5–5kg,
// dumbbells jump ~2kg per hand).
const EXERCISES: SeedExercise[] = [
  // ---- Chest ----
  { name: "Bench Press", low: 5, high: 8, step: 2.5, primary: "Chest", secondary: ["Front Delt", "Triceps"] },
  { name: "Incline Dumbbell Press", low: 8, high: 12, step: 2, primary: "Upper Chest", secondary: ["Front Delt", "Triceps"] },
  { name: "Bar Dip", low: 8, high: 12, step: 2.5, primary: "Chest", secondary: ["Triceps", "Front Delt"] },
  { name: "Standing Cable Chest Fly", low: 12, high: 15, step: 2.5, primary: "Chest" },

  // ---- Shoulders ----
  { name: "Overhead Press", low: 6, high: 10, step: 2.5, primary: "Front Delt", secondary: ["Side Delt", "Triceps"] },
  { name: "Seated Dumbbell Shoulder Press", low: 8, high: 12, step: 2, primary: "Front Delt", secondary: ["Side Delt", "Triceps"] },
  { name: "Dumbbell Lateral Raise", low: 12, high: 20, step: 2, primary: "Side Delt" },
  { name: "Reverse Dumbbell Fly", low: 12, high: 20, step: 2, primary: "Rear Delt" },

  // ---- Back ----
  { name: "Deadlift", low: 4, high: 6, step: 5, primary: "Back", secondary: ["Hamstrings", "Glutes"] },
  { name: "Lat Pulldown", low: 8, high: 12, step: 5, primary: "Back", secondary: ["Biceps"] },
  { name: "Pull-Up", low: 6, high: 10, step: 2.5, primary: "Back", secondary: ["Biceps"] },
  { name: "Barbell Row", low: 8, high: 12, step: 2.5, primary: "Back", secondary: ["Biceps", "Rear Delt"] },
  { name: "Dumbbell Row", low: 8, high: 12, step: 2, primary: "Back", secondary: ["Biceps"] },

  // ---- Biceps ----
  { name: "Barbell Curl", low: 8, high: 12, step: 2.5, primary: "Biceps", secondary: ["Forearms"] },
  { name: "Dumbbell Curl", low: 8, high: 12, step: 2, primary: "Biceps", secondary: ["Forearms"] },
  { name: "Hammer Curl", low: 8, high: 12, step: 2, primary: "Biceps", secondary: ["Forearms"] },

  // ---- Triceps ----
  { name: "Lying Triceps Extension", low: 8, high: 12, step: 2.5, primary: "Triceps" },
  { name: "Overhead Cable Triceps Extension", low: 10, high: 15, step: 2.5, primary: "Triceps" },
  { name: "Triceps Pushdown", low: 10, high: 15, step: 2.5, primary: "Triceps" },
  { name: "Close-Grip Bench Press", low: 6, high: 10, step: 2.5, primary: "Triceps", secondary: ["Chest", "Front Delt"] },

  // ---- Quads ----
  { name: "Squat", low: 5, high: 8, step: 5, primary: "Quads", secondary: ["Glutes", "Hamstrings"] },
  { name: "Hack Squat", low: 8, high: 12, step: 5, primary: "Quads", secondary: ["Glutes"] },
  { name: "Leg Extension", low: 12, high: 15, step: 5, primary: "Quads" },
  { name: "Bulgarian Split Squat", low: 8, high: 12, step: 2, primary: "Quads", secondary: ["Glutes"] },

  // ---- Hamstrings ----
  { name: "Seated Leg Curl", low: 10, high: 15, step: 5, primary: "Hamstrings" },
  { name: "Lying Leg Curl", low: 10, high: 15, step: 5, primary: "Hamstrings" },
  { name: "Romanian Deadlift", low: 8, high: 12, step: 2.5, primary: "Hamstrings", secondary: ["Glutes", "Back"] },

  // ---- Glutes ----
  { name: "Hip Thrust", low: 8, high: 12, step: 5, primary: "Glutes", secondary: ["Hamstrings"] },

  // ---- Abs ----
  { name: "Cable Crunch", low: 10, high: 15, step: 2.5, primary: "Abs" },
  { name: "Hanging Leg Raise", low: 10, high: 20, step: 2.5, primary: "Abs" },
  { name: "Crunch", low: 12, high: 20, step: 2.5, primary: "Abs" },

  // ---- Calves ----
  { name: "Standing Calf Raise", low: 8, high: 15, step: 5, primary: "Calves" },
  { name: "Seated Calf Raise", low: 10, high: 15, step: 5, primary: "Calves" },
];

async function main() {
  // 1. Muscles — insert any that don't already exist (by name).
  const existingMuscles = await db.select().from(muscleGroups);
  const existingMuscleNames = new Set(existingMuscles.map((m) => m.name));
  const missingMuscles = MUSCLES.filter((m) => !existingMuscleNames.has(m.name));
  if (missingMuscles.length) await db.insert(muscleGroups).values(missingMuscles);

  const allMuscles = await db.select().from(muscleGroups);
  const byName = new Map(allMuscles.map((m) => [m.name, m.id]));

  // 2. Exercises — insert any that don't already exist (by name) + their links.
  const existingEx = await db.select().from(exercises);
  const existingExNames = new Set(existingEx.map((e) => e.name));

  let added = 0;
  for (const ex of EXERCISES) {
    if (existingExNames.has(ex.name)) continue;

    const primaryId = byName.get(ex.primary);
    if (primaryId == null) {
      console.warn(`Skipping "${ex.name}" — unknown primary muscle "${ex.primary}".`);
      continue;
    }

    const [row] = await db
      .insert(exercises)
      .values({ name: ex.name, repRangeLow: ex.low, repRangeHigh: ex.high, loadStep: ex.step })
      .returning();

    const secondaryLinks = (ex.secondary ?? [])
      .map((s) => byName.get(s))
      .filter((id): id is number => id != null)
      .map((id) => ({ exerciseId: row.id, muscleGroupId: id, role: "SECONDARY" as const }));

    await db.insert(exerciseMuscles).values([
      { exerciseId: row.id, muscleGroupId: primaryId, role: "PRIMARY" as const },
      ...secondaryLinks,
    ]);
    added++;
  }

  console.log(
    `Muscles: ${allMuscles.length} total (${missingMuscles.length} new). ` +
      `Exercises: ${added} added of ${EXERCISES.length} curated.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
