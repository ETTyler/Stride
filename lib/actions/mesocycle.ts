"use server";

import { db } from "@/db/client";
import {
  mesocycles,
  days,
  dayExercises,
  workouts,
  setLogs,
  exercises,
  exerciseMuscles,
  muscleGroups,
} from "@/db/schema";
import { and, eq, ne, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prescribe, isDeloadWeek, type MuscleFeedback } from "@/lib/progression";
import {
  getLastWeekSets,
  getLatestFeedbackByMuscle,
  getMuscleSetCounts,
  getMesoWeekStatus,
  getLastWeightByExercise,
} from "@/lib/db/queries";

/**
 * The generation layer. This is where the progression engine meets the database.
 *
 * - generateFirstWeek: lays out week 1 at each muscle's MEV-ish starting volume.
 * - generateNextWeek:  reads last week's completed sets + recovery feedback,
 *                      runs prescribe() per exercise, and writes the prescribed
 *                      set_logs for the new week.
 *
 * Both are idempotent-ish: they refuse to regenerate a week that already has
 * workouts, so calling twice won't duplicate.
 */

type GenResult = { ok: true; workoutsCreated: number } | { ok: false; error: string };

const DEFAULT_STARTING_SETS = 3; // per exercise in week 1

/** Build week 1 of a meso: one workout per day, prescribed sets at a sane start. */
export async function generateFirstWeek(mesocycleId: number): Promise<GenResult> {
  const [meso] = await db.select().from(mesocycles).where(eq(mesocycles.id, mesocycleId)).limit(1);
  if (!meso) return { ok: false, error: "Mesocycle not found." };

  const existing = await db.select().from(workouts).where(eq(workouts.mesocycleId, mesocycleId));
  if (existing.length) return { ok: false, error: "This mesocycle already has workouts." };

  // Only one meso runs at a time — but we never silently complete another one.
  // Ask the user to finish/mark their current meso complete first.
  if (meso.userId) {
    const [otherActive] = await db
      .select({ id: mesocycles.id, name: mesocycles.name })
      .from(mesocycles)
      .where(
        and(
          eq(mesocycles.userId, meso.userId),
          eq(mesocycles.status, "active"),
          ne(mesocycles.id, mesocycleId)
        )
      )
      .limit(1);
    if (otherActive) {
      return {
        ok: false,
        error: `“${otherActive.name}” is still active. Mark it complete before starting a new mesocycle.`,
      };
    }
  }

  const dayRows = await db
    .select()
    .from(days)
    .where(eq(days.mesocycleId, mesocycleId))
    .orderBy(asc(days.dayOrder));
  if (!dayRows.length) return { ok: false, error: "Add training days before generating." };

  // Carry over the user's known working weights so week 1 isn't blank.
  const allExerciseIds = await db
    .select({ exerciseId: dayExercises.exerciseId })
    .from(dayExercises)
    .innerJoin(days, eq(days.id, dayExercises.dayId))
    .where(eq(days.mesocycleId, mesocycleId));
  const lastWeights = meso.userId
    ? await getLastWeightByExercise(
        meso.userId,
        allExerciseIds.map((r) => r.exerciseId)
      )
    : new Map<number, number>();

  let created = 0;

  for (const day of dayRows) {
    const dxRows = await db
      .select({
        id: dayExercises.id,
        exerciseId: dayExercises.exerciseId,
        order: dayExercises.exerciseOrder,
        goalSets: dayExercises.goalSets,
        repLow: exercises.repRangeLow,
        repHigh: exercises.repRangeHigh,
      })
      .from(dayExercises)
      .innerJoin(exercises, eq(exercises.id, dayExercises.exerciseId))
      .where(eq(dayExercises.dayId, day.id))
      .orderBy(asc(dayExercises.exerciseOrder));

    const [workout] = await db
      .insert(workouts)
      .values({ mesocycleId, dayId: day.id, weekNumber: 1, status: "upcoming" })
      .returning();

    const rows = dxRows.flatMap((dx) => {
      // user goal overrides the default starting volume when set
      const setCount =
        dx.goalSets != null ? Math.max(1, Math.min(dx.goalSets, 10)) : DEFAULT_STARTING_SETS;
      return Array.from({ length: setCount }, (_, i) => ({
        workoutId: workout.id,
        dayExerciseId: dx.id,
        setNumber: i + 1,
        targetReps: dx.repLow, // start at the bottom of the range
        targetRir: 3, // week 1 RIR
        targetWeight: lastWeights.get(dx.exerciseId) ?? null, // carried over, or user picks
        completed: false,
      }));
    });
    if (rows.length) await db.insert(setLogs).values(rows);
    created++;
  }

  await db.update(mesocycles).set({ status: "active" }).where(eq(mesocycles.id, mesocycleId));
  revalidatePath("/workout");
  revalidatePath("/plan");
  revalidatePath("/");
  return { ok: true, workoutsCreated: created };
}

/**
 * Generate whatever the next ready week is for a meso (computed from its current
 * state). The dashboard and workout screen call this once the current week is
 * fully logged.
 */
export async function advanceWeek(mesocycleId: number): Promise<GenResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not authenticated" };
  }

  const status = await getMesoWeekStatus(mesocycleId, session.user.id);
  if (status.nextWeekToGenerate == null) {
    if (status.mesoComplete) return { ok: false, error: "This mesocycle is already complete." };
    return { ok: false, error: "Finish every set in the current week first." };
  }
  const res = await generateNextWeek(mesocycleId, status.nextWeekToGenerate);
  revalidatePath("/");
  revalidatePath("/plan");
  return res;
}

/**
 * Set a meso's status explicitly. The user marks a meso complete here (or
 * reactivates one). Activating is blocked if another meso is already active.
 */
export async function setMesocycleStatus(
  mesocycleId: number,
  status: "planned" | "active" | "complete"
): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  const [meso] = await db
    .select()
    .from(mesocycles)
    .where(and(eq(mesocycles.id, mesocycleId), eq(mesocycles.userId, session.user.id)))
    .limit(1);
  if (!meso) return { ok: false, error: "Mesocycle not found." };

  if (status === "active") {
    const [otherActive] = await db
      .select({ id: mesocycles.id, name: mesocycles.name })
      .from(mesocycles)
      .where(
        and(
          eq(mesocycles.userId, session.user.id),
          eq(mesocycles.status, "active"),
          ne(mesocycles.id, mesocycleId)
        )
      )
      .limit(1);
    if (otherActive)
      return {
        ok: false,
        error: `“${otherActive.name}” is already active. Mark it complete first.`,
      };
  }

  await db.update(mesocycles).set({ status }).where(eq(mesocycles.id, mesocycleId));
  revalidatePath("/plan");
  revalidatePath("/");
  revalidatePath("/workout");
  return { ok: true };
}

/**
 * Copy a meso's plan (days + exercises) into a new "planned" meso, so the user
 * can start their next block from the previous one. Last-used weights carry over
 * automatically when the new meso's first week is generated.
 */
export async function duplicateMesocycle(
  mesocycleId: number,
  name?: string
): Promise<Result<{ mesocycleId: number }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  const [source] = await db
    .select()
    .from(mesocycles)
    .where(and(eq(mesocycles.id, mesocycleId), eq(mesocycles.userId, session.user.id)))
    .limit(1);
  if (!source) return { ok: false, error: "Mesocycle not found." };

  const [copy] = await db
    .insert(mesocycles)
    .values({
      userId: session.user.id,
      name: name?.trim() || `${source.name} (cont.)`,
      weeks: source.weeks,
      status: "planned",
    })
    .returning();

  const srcDays = await db
    .select()
    .from(days)
    .where(eq(days.mesocycleId, mesocycleId))
    .orderBy(asc(days.dayOrder));

  for (const d of srcDays) {
    const [newDay] = await db
      .insert(days)
      .values({ mesocycleId: copy.id, label: d.label, dayOrder: d.dayOrder })
      .returning();

    const srcDx = await db
      .select()
      .from(dayExercises)
      .where(eq(dayExercises.dayId, d.id))
      .orderBy(asc(dayExercises.exerciseOrder));

    if (srcDx.length) {
      await db.insert(dayExercises).values(
        srcDx.map((dx) => ({
          dayId: newDay.id,
          exerciseId: dx.exerciseId,
          exerciseOrder: dx.exerciseOrder,
        }))
      );
    }
  }

  revalidatePath("/plan");
  return { ok: true, mesocycleId: copy.id };
}

/** Delete a mesocycle (and, via cascade, its days/workouts/sets/feedback). */
export async function deleteMesocycle(mesocycleId: number): Promise<Result> {
  await db.delete(mesocycles).where(eq(mesocycles.id, mesocycleId));
  revalidatePath("/plan");
  revalidatePath("/");
  revalidatePath("/workout");
  return { ok: true };
}

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * Generate week N (N >= 2) from week N-1. For each exercise on each day, it
 * calls the progression engine with last week's top-set performance and the
 * primary muscle's latest feedback, then writes the prescribed sets.
 */
export async function generateNextWeek(
  mesocycleId: number,
  targetWeek: number
): Promise<GenResult> {
  if (targetWeek < 2) return { ok: false, error: "Use generateFirstWeek for week 1." };

  const [meso] = await db.select().from(mesocycles).where(eq(mesocycles.id, mesocycleId)).limit(1);
  if (!meso) return { ok: false, error: "Mesocycle not found." };
  if (targetWeek > meso.weeks)
    return { ok: false, error: `This meso is only ${meso.weeks} weeks long.` };

  const already = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.mesocycleId, mesocycleId), eq(workouts.weekNumber, targetWeek)));
  if (already.length) return { ok: false, error: `Week ${targetWeek} already exists.` };

  const prevWeek = targetWeek - 1;

  // muscle landmarks + last week's volume per muscle + latest feedback per muscle
  const muscleRows = await db.select().from(muscleGroups);
  const landmarksByMuscle = new Map(
    muscleRows.map((m) => [m.id, { mev: m.mev, mav: m.mav, mrv: m.mrv }])
  );
  const prevSetCounts = await getMuscleSetCounts(mesocycleId, prevWeek);
  const feedbackByMuscle = await getLatestFeedbackByMuscle(mesocycleId, prevWeek);

  const dayRows = await db
    .select()
    .from(days)
    .where(eq(days.mesocycleId, mesocycleId))
    .orderBy(asc(days.dayOrder));

  let created = 0;
  let deloadFlagged = false;

  for (const day of dayRows) {
    const lastWeekSets = await getLastWeekSets(mesocycleId, day.id, prevWeek);

    const dxRows = await db
      .select({
        id: dayExercises.id,
        exerciseId: dayExercises.exerciseId,
        goalSets: dayExercises.goalSets,
        repLow: exercises.repRangeLow,
        repHigh: exercises.repRangeHigh,
        loadStep: exercises.loadStep,
      })
      .from(dayExercises)
      .innerJoin(exercises, eq(exercises.id, dayExercises.exerciseId))
      .where(eq(dayExercises.dayId, day.id))
      .orderBy(asc(dayExercises.exerciseOrder));

    // primary muscle per exercise on this day
    const exIds = dxRows.map((d) => d.exerciseId);
    const prim = exIds.length
      ? await db
          .select({ exerciseId: exerciseMuscles.exerciseId, muscleId: exerciseMuscles.muscleGroupId })
          .from(exerciseMuscles)
          .where(
            and(inArray(exerciseMuscles.exerciseId, exIds), eq(exerciseMuscles.role, "PRIMARY"))
          )
      : [];
    const primaryMuscleByExercise = new Map(prim.map((p) => [p.exerciseId, p.muscleId]));

    const [workout] = await db
      .insert(workouts)
      .values({ mesocycleId, dayId: day.id, weekNumber: targetWeek, status: "upcoming" })
      .returning();

    const setRows: (typeof setLogs.$inferInsert)[] = [];

    for (const dx of dxRows) {
      const muscleId = primaryMuscleByExercise.get(dx.exerciseId);
      const landmarks = (muscleId ? landmarksByMuscle.get(muscleId) : undefined) ?? {
        mev: 8,
        mav: 16,
        mrv: 22,
      };

      const fbRow = muscleId ? feedbackByMuscle.get(muscleId) : undefined;
      const feedback: MuscleFeedback = fbRow
        ? {
            pump: fbRow.pump,
            soreness: fbRow.soreness,
            jointPain: fbRow.jointPain,
            workload: fbRow.workload,
          }
        : { pump: 2, soreness: 1, jointPain: 0, workload: "moderate" }; // neutral default

      const lastSets = lastWeekSets.get(dx.id) ?? [];
      const lastCount = muscleId ? Math.round(prevSetCounts.get(muscleId) ?? DEFAULT_STARTING_SETS) : DEFAULT_STARTING_SETS;

      const result = prescribe({
        weekNumber: targetWeek,
        totalWeeks: meso.weeks,
        lastWeekSets: lastSets,
        lastWeekSetCount: lastCount,
        feedback,
        landmarks,
        exercise: { repRangeLow: dx.repLow, repRangeHigh: dx.repHigh, loadStep: dx.loadStep },
      });

      if (result.recommendDeloadSoon) deloadFlagged = true;

      // If the user set a goal number of working sets for this exercise, honor
      // it (halved on the deload week). Otherwise fall back to the algorithm.
      let setsForExercise: number;
      if (dx.goalSets != null) {
        const goal = Math.max(1, Math.min(dx.goalSets, 10));
        setsForExercise = isDeloadWeek(targetWeek, meso.weeks)
          ? Math.max(1, Math.round(goal / 2))
          : goal;
      } else {
        // engine returns weekly sets for the MUSCLE; this exercise gets its share.
        setsForExercise = Math.max(1, result.sets > 0 ? Math.min(result.sets, 5) : 3);
      }

      for (let i = 0; i < setsForExercise; i++) {
        setRows.push({
          workoutId: workout.id,
          dayExerciseId: dx.id,
          setNumber: i + 1,
          targetReps: result.targetRepsLow,
          targetRir: result.targetRir,
          targetWeight: result.targetWeight || null,
          completed: false,
        });
      }
    }

    if (setRows.length) await db.insert(setLogs).values(setRows);
    created++;
  }

  revalidatePath("/workout");
  return { ok: true, workoutsCreated: created };
}
