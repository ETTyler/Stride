"use server";

import { db } from "@/db/client";
import { setLogs, feedback, workouts, dayExercises, mesocycles } from "@/db/schema";
import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getMesoWeekStatus } from "@/lib/db/queries";

/**
 * Mutations the in-gym screen calls. All are server actions: they run on the
 * server, write to Neon, and revalidate the workout route so the UI refreshes.
 *
 * Validation is deliberately strict and defensive — these are the only paths
 * that write training data, so bad input should never reach the DB.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

function toNumber(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Log (or update) what was actually performed on a single set. */
export async function logSet(input: {
  setLogId: number;
  weight: unknown;
  reps: unknown;
  completed: boolean;
}): Promise<ActionResult> {
  const weight = toNumber(input.weight);
  const reps = toNumber(input.reps);

  if (input.completed) {
    // a completed set must have real numbers
    if (weight == null || weight < 0) return { ok: false, error: "Enter a valid weight before completing the set." };
    if (reps == null || reps < 0 || !Number.isInteger(reps))
      return { ok: false, error: "Enter a whole number of reps before completing the set." };
  }

  await db
    .update(setLogs)
    .set({ weight, reps, completed: input.completed })
    .where(eq(setLogs.id, input.setLogId));

  revalidatePath("/workout");
  return { ok: true };
}

/**
 * Add an extra set to an exercise mid-session (RP lets you do this on the fly).
 * It inherits the prescribed targets from the exercise's existing top set.
 */
export async function addSet(input: {
  workoutId: number;
  dayExerciseId: number;
}): Promise<ActionResult> {
  const existing = await db
    .select()
    .from(setLogs)
    .where(
      and(eq(setLogs.workoutId, input.workoutId), eq(setLogs.dayExerciseId, input.dayExerciseId))
    );

  if (existing.length === 0)
    return { ok: false, error: "Can't add a set to an exercise that has none prescribed." };

  const template = existing[existing.length - 1];
  const nextSetNumber = Math.max(...existing.map((s) => s.setNumber)) + 1;

  await db.insert(setLogs).values({
    workoutId: input.workoutId,
    dayExerciseId: input.dayExerciseId,
    setNumber: nextSetNumber,
    targetReps: template.targetReps,
    targetRir: template.targetRir,
    targetWeight: template.targetWeight,
    completed: false,
  });

  revalidatePath("/workout");
  return { ok: true };
}

/** Skip (remove) a single set you're not going to do. Completed sets are kept. */
export async function skipSet(input: { setLogId: number }): Promise<ActionResult> {
  const [s] = await db.select().from(setLogs).where(eq(setLogs.id, input.setLogId)).limit(1);
  if (!s) return { ok: false, error: "That set no longer exists." };
  if (s.completed)
    return { ok: false, error: "That set is already logged — untick it before skipping." };

  await db.delete(setLogs).where(eq(setLogs.id, input.setLogId));
  revalidatePath("/workout");
  return { ok: true };
}

/** Remove the last set of an exercise (only if it hasn't been completed). */
export async function removeLastSet(input: {
  workoutId: number;
  dayExerciseId: number;
}): Promise<ActionResult> {
  const existing = await db
    .select()
    .from(setLogs)
    .where(
      and(eq(setLogs.workoutId, input.workoutId), eq(setLogs.dayExerciseId, input.dayExerciseId))
    );

  if (existing.length <= 1) return { ok: false, error: "An exercise needs at least one set." };

  const last = existing.reduce((a, b) => (b.setNumber > a.setNumber ? b : a));
  if (last.completed) return { ok: false, error: "Can't remove a set you've already completed." };

  await db.delete(setLogs).where(eq(setLogs.id, last.id));
  revalidatePath("/workout");
  return { ok: true };
}

/**
 * Save per-muscle recovery feedback for a workout. Upserts: one feedback row
 * per (workout, muscle), so re-submitting overwrites.
 */
export async function saveFeedback(input: {
  workoutId: number;
  muscleGroupId: number;
  pump: number;
  soreness: number;
  jointPain: number;
  workload: "easy" | "moderate" | "hard" | "too_much";
}): Promise<ActionResult> {
  const clamp03 = (n: number) => Math.max(0, Math.min(3, Math.round(n)));

  const existing = await db
    .select()
    .from(feedback)
    .where(
      and(eq(feedback.workoutId, input.workoutId), eq(feedback.muscleGroupId, input.muscleGroupId))
    )
    .limit(1);

  const values = {
    workoutId: input.workoutId,
    muscleGroupId: input.muscleGroupId,
    pump: clamp03(input.pump),
    soreness: clamp03(input.soreness),
    jointPain: clamp03(input.jointPain),
    workload: input.workload,
  };

  if (existing.length) {
    await db.update(feedback).set(values).where(eq(feedback.id, existing[0].id));
  } else {
    await db.insert(feedback).values(values);
  }

  revalidatePath("/workout");
  return { ok: true };
}

/** Mark a workout complete; if it was the meso's final session, close the meso. */
export async function finishWorkout(input: { workoutId: number }): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not authenticated" };
  }

  const [w] = await db.update(workouts)
    .set({ status: "done" })
    .where(eq(workouts.id, input.workoutId))
    .returning();

  if (w) {
    const status = await getMesoWeekStatus(w.mesocycleId, session.user.id);
    if (status.mesoComplete) {
      await db
        .update(mesocycles)
        .set({ status: "complete" })
        .where(eq(mesocycles.id, w.mesocycleId));
    }
  }

  revalidatePath("/workout");
  revalidatePath("/");
  return { ok: true };
}

/**
 * End the current session early. Marks every set in the workout incomplete and
 * marks the workout done, so the queue advances to the next day. Nothing here
 * feeds progression (only completed sets do), so it's effectively a skip.
 */
export async function endWorkout(input: { workoutId: number }): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not authenticated" };
  }

  await db.update(setLogs).set({ completed: false }).where(eq(setLogs.workoutId, input.workoutId));

  const [w] = await db.update(workouts)
    .set({ status: "done" })
    .where(eq(workouts.id, input.workoutId))
    .returning();

  if (w) {
    const status = await getMesoWeekStatus(w.mesocycleId, session.user.id);
    if (status.mesoComplete) {
      await db
        .update(mesocycles)
        .set({ status: "complete" })
        .where(eq(mesocycles.id, w.mesocycleId));
    }
  }

  revalidatePath("/workout");
  revalidatePath("/");
  return { ok: true };
}
