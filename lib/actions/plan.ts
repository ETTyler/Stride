"use server";

import { db } from "@/db/client";
import {
  mesocycles,
  days,
  dayExercises,
  exercises,
  workouts,
  setLogs,
} from "@/db/schema";
import { and, eq, ne, asc, max, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { targetRirForWeek } from "@/lib/progression";

/**
 * Meso builder actions: assemble the plan (meso -> days -> exercises) that
 * generateFirstWeek then turns into trackable workouts.
 *
 * These also work AFTER a meso has started: adding an exercise backfills set
 * rows into the not-yet-finished workouts, removing one clears its logs first,
 * and changing one swaps the slot and resets upcoming targets.
 */

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

const DEFAULT_SETS = 3;

export async function createMesocycle(input: {
  name: string;
  weeks: number;
}): Promise<Result<{ mesocycleId: number }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not authenticated" };
  }

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Give the mesocycle a name." };
  if (input.weeks < 2 || input.weeks > 12)
    return { ok: false, error: "A mesocycle should be 2–12 weeks (including the deload)." };

  const [meso] = await db
    .insert(mesocycles)
    .values({ userId: session.user.id, name, weeks: input.weeks, status: "planned" })
    .returning();

  revalidatePath("/plan");
  return { ok: true, mesocycleId: meso.id };
}

export async function addDay(input: {
  mesocycleId: number;
  label: string;
}): Promise<Result<{ dayId: number }>> {
  const label = input.label.trim();
  if (!label) return { ok: false, error: "Give the day a label, e.g. ‘Push A’." };

  const [{ value: maxOrder }] = await db
    .select({ value: max(days.dayOrder) })
    .from(days)
    .where(eq(days.mesocycleId, input.mesocycleId));

  const [day] = await db
    .insert(days)
    .values({ mesocycleId: input.mesocycleId, label, dayOrder: (maxOrder ?? 0) + 1 })
    .returning();

  revalidatePath("/plan");
  return { ok: true, dayId: day.id };
}

export async function addExerciseToDay(input: {
  dayId: number;
  exerciseId: number;
}): Promise<Result<{ dayExerciseId: number }>> {
  const [{ value: maxOrder }] = await db
    .select({ value: max(dayExercises.exerciseOrder) })
    .from(dayExercises)
    .where(eq(dayExercises.dayId, input.dayId));

  const [dx] = await db
    .insert(dayExercises)
    .values({
      dayId: input.dayId,
      exerciseId: input.exerciseId,
      exerciseOrder: (maxOrder ?? 0) + 1,
    })
    .returning();

  // If the meso is already running, this slot won't have set rows in the
  // workouts that were already generated. Backfill the not-finished ones so the
  // new exercise shows up in the current session immediately.
  const [ex] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, input.exerciseId))
    .limit(1);

  const liveWorkouts = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.dayId, input.dayId), ne(workouts.status, "done")));

  for (const wo of liveWorkouts) {
    const [meso] = await db
      .select()
      .from(mesocycles)
      .where(eq(mesocycles.id, wo.mesocycleId))
      .limit(1);
    const rir = targetRirForWeek(wo.weekNumber, meso?.weeks ?? 5);
    const rows = Array.from({ length: DEFAULT_SETS }, (_, i) => ({
      workoutId: wo.id,
      dayExerciseId: dx.id,
      setNumber: i + 1,
      targetReps: ex?.repRangeLow ?? 8,
      targetRir: rir,
      targetWeight: null,
      completed: false,
    }));
    await db.insert(setLogs).values(rows);
  }

  revalidatePath("/plan");
  revalidatePath("/workout");
  return { ok: true, dayExerciseId: dx.id };
}

export async function removeExerciseFromDay(input: { dayExerciseId: number }): Promise<Result> {
  // setLogs reference dayExercises without a cascade, so clear them first.
  await db.delete(setLogs).where(eq(setLogs.dayExerciseId, input.dayExerciseId));
  await db.delete(dayExercises).where(eq(dayExercises.id, input.dayExerciseId));
  revalidatePath("/plan");
  revalidatePath("/workout");
  return { ok: true };
}

/**
 * Swap which exercise occupies a slot. Keeps the slot (and its logged history)
 * but, for any not-finished workout, resets the upcoming targets since the new
 * lift has a different weight/rep profile.
 */
export async function changeExercise(input: {
  dayExerciseId: number;
  exerciseId: number;
}): Promise<Result> {
  await db
    .update(dayExercises)
    .set({ exerciseId: input.exerciseId })
    .where(eq(dayExercises.id, input.dayExerciseId));

  const [ex] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, input.exerciseId))
    .limit(1);

  // reset targets on not-completed sets that live in not-finished workouts
  const toReset = await db
    .select({ id: setLogs.id })
    .from(setLogs)
    .innerJoin(workouts, eq(workouts.id, setLogs.workoutId))
    .where(
      and(
        eq(setLogs.dayExerciseId, input.dayExerciseId),
        eq(setLogs.completed, false),
        ne(workouts.status, "done")
      )
    );
  const ids = toReset.map((r) => r.id);
  if (ids.length) {
    await db
      .update(setLogs)
      .set({ targetWeight: null, targetReps: ex?.repRangeLow ?? null })
      .where(inArray(setLogs.id, ids));
  }

  revalidatePath("/plan");
  revalidatePath("/workout");
  return { ok: true };
}

export async function reorderExercise(input: {
  dayExerciseId: number;
  newOrder: number;
}): Promise<Result> {
  await db
    .update(dayExercises)
    .set({ exerciseOrder: input.newOrder })
    .where(eq(dayExercises.id, input.dayExerciseId));
  revalidatePath("/plan");
  return { ok: true };
}
