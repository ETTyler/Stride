import { db } from "@/db/client";
import {
  workouts,
  days,
  dayExercises,
  exercises,
  exerciseMuscles,
  muscleGroups,
  setLogs,
  feedback,
  mesocycles,
} from "@/db/schema";
import { and, eq, desc, asc, inArray } from "drizzle-orm";

/**
 * Read-side queries. These shape DB rows into the structures the UI and the
 * progression engine consume. No mutations live here.
 */

export type WorkoutExerciseView = {
  dayExerciseId: number;
  exerciseId: number;
  name: string;
  note: string | null;
  primaryMuscle: string;
  targetRir: number | null;
  sets: {
    setLogId: number;
    setNumber: number;
    targetWeight: number | null;
    targetReps: number | null;
    targetRir: number | null;
    weight: number | null;
    reps: number | null;
    completed: boolean;
  }[];
};

export type WorkoutView = {
  workoutId: number;
  mesocycleId: number;
  dayId: number;
  dayLabel: string;
  weekNumber: number;
  totalWeeks: number;
  status: "upcoming" | "in_progress" | "done";
  exercises: WorkoutExerciseView[];
};

/** The active meso, or null if none is running. */
export async function getActiveMeso(user_id: string) {
  const [meso] = await db
    .select()
    .from(mesocycles)
    .where(and(eq(mesocycles.status, "active"), eq(mesocycles.userId, user_id)))
    .limit(1);
  return meso ?? null;
}

/** Full view of a single workout: exercises, prescribed targets, logged sets. */
export async function getWorkoutView(workoutId: number): Promise<WorkoutView | null> {
  const [workout] = await db.select().from(workouts).where(eq(workouts.id, workoutId)).limit(1);
  if (!workout) return null;

  const [meso] = await db
    .select()
    .from(mesocycles)
    .where(eq(mesocycles.id, workout.mesocycleId))
    .limit(1);

  const [day] = await db.select().from(days).where(eq(days.id, workout.dayId)).limit(1);

  // exercises on this day, ordered
  const dxRows = await db
    .select({
      dayExerciseId: dayExercises.id,
      exerciseId: exercises.id,
      name: exercises.name,
      note: exercises.notes,
      order: dayExercises.exerciseOrder,
    })
    .from(dayExercises)
    .innerJoin(exercises, eq(exercises.id, dayExercises.exerciseId))
    .where(eq(dayExercises.dayId, workout.dayId))
    .orderBy(asc(dayExercises.exerciseOrder));

  const dxIds = dxRows.map((r) => r.dayExerciseId);
  const exIds = dxRows.map((r) => r.exerciseId);

  // primary muscle per exercise
  const primaryMuscles = exIds.length
    ? await db
        .select({
          exerciseId: exerciseMuscles.exerciseId,
          muscle: muscleGroups.name,
        })
        .from(exerciseMuscles)
        .innerJoin(muscleGroups, eq(muscleGroups.id, exerciseMuscles.muscleGroupId))
        .where(and(inArray(exerciseMuscles.exerciseId, exIds), eq(exerciseMuscles.role, "PRIMARY")))
    : [];
  const primaryByExercise = new Map(primaryMuscles.map((p) => [p.exerciseId, p.muscle]));

  // logged/prescribed sets for this workout
  const sets = dxIds.length
    ? await db
        .select()
        .from(setLogs)
        .where(and(eq(setLogs.workoutId, workoutId), inArray(setLogs.dayExerciseId, dxIds)))
        .orderBy(asc(setLogs.setNumber))
    : [];

  const setsByDx = new Map<number, typeof sets>();
  for (const s of sets) {
    const arr = setsByDx.get(s.dayExerciseId) ?? [];
    arr.push(s);
    setsByDx.set(s.dayExerciseId, arr);
  }

  const exerciseViews: WorkoutExerciseView[] = dxRows.map((dx) => {
    const dxSets = setsByDx.get(dx.dayExerciseId) ?? [];
    return {
      dayExerciseId: dx.dayExerciseId,
      exerciseId: dx.exerciseId,
      name: dx.name,
      note: dx.note,
      primaryMuscle: primaryByExercise.get(dx.exerciseId) ?? "—",
      targetRir: dxSets[0]?.targetRir ?? null,
      sets: dxSets.map((s) => ({
        setLogId: s.id,
        setNumber: s.setNumber,
        targetWeight: s.targetWeight,
        targetReps: s.targetReps,
        targetRir: s.targetRir,
        weight: s.weight,
        reps: s.reps,
        completed: s.completed,
      })),
    };
  });

  return {
    workoutId: workout.id,
    mesocycleId: workout.mesocycleId,
    dayId: workout.dayId,
    dayLabel: day?.label ?? "Workout",
    weekNumber: workout.weekNumber,
    totalWeeks: meso?.weeks ?? 5,
    status: workout.status,
    exercises: exerciseViews,
  };
}

/** The next workout that isn't finished — what "Today" should open. */
export async function getNextWorkout(mesocycleId: number) {
  const [next] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.mesocycleId, mesocycleId), inArray(workouts.status, ["upcoming", "in_progress"])))
    .orderBy(asc(workouts.weekNumber), asc(workouts.date))
    .limit(1);
  return next ?? null;
}

/**
 * For a given day + week, fetch the performed sets from the PREVIOUS week's
 * matching workout, keyed by dayExerciseId. Used to feed progression.
 */
export async function getLastWeekSets(
  mesocycleId: number,
  dayId: number,
  previousWeek: number
): Promise<Map<number, { weight: number; reps: number }[]>> {
  const result = new Map<number, { weight: number; reps: number }[]>();
  if (previousWeek < 1) return result;

  const [prevWorkout] = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.mesocycleId, mesocycleId),
        eq(workouts.dayId, dayId),
        eq(workouts.weekNumber, previousWeek)
      )
    )
    .limit(1);
  if (!prevWorkout) return result;

  const sets = await db
    .select()
    .from(setLogs)
    .where(and(eq(setLogs.workoutId, prevWorkout.id), eq(setLogs.completed, true)));

  for (const s of sets) {
    if (s.weight == null || s.reps == null) continue;
    const arr = result.get(s.dayExerciseId) ?? [];
    arr.push({ weight: s.weight, reps: s.reps });
    result.set(s.dayExerciseId, arr);
  }
  return result;
}

/**
 * Most recent feedback per muscle group within a meso, up to and including a
 * given week. Returns a map muscleGroupId -> feedback row.
 */
export async function getLatestFeedbackByMuscle(mesocycleId: number, upToWeek: number) {
  const rows = await db
    .select({
      muscleGroupId: feedback.muscleGroupId,
      pump: feedback.pump,
      soreness: feedback.soreness,
      jointPain: feedback.jointPain,
      workload: feedback.workload,
      week: workouts.weekNumber,
    })
    .from(feedback)
    .innerJoin(workouts, eq(workouts.id, feedback.workoutId))
    .where(eq(workouts.mesocycleId, mesocycleId))
    .orderBy(desc(workouts.weekNumber));

  const latest = new Map<number, (typeof rows)[number]>();
  for (const r of rows) {
    if (r.week > upToWeek) continue;
    if (!latest.has(r.muscleGroupId)) latest.set(r.muscleGroupId, r);
  }
  return latest;
}

/** All mesocycles for a user, newest first, for the planner + dashboard pickers. */
export async function listMesocycles(user_id: string) {
  return db
    .select()
    .from(mesocycles)
    .where(eq(mesocycles.userId, user_id))
    .orderBy(desc(mesocycles.id));
}

export type MesoPlanDay = {
  id: number;
  label: string;
  dayOrder: number;
  exercises: {
    dayExerciseId: number;
    exerciseId: number;
    name: string;
    primaryMuscle: string;
    order: number;
  }[];
};

export type MesoPlan = {
  meso: typeof mesocycles.$inferSelect;
  days: MesoPlanDay[];
};

/** The full plan for one meso: its days, each day's exercises in order. */
export async function getMesocyclePlan(mesocycleId: number, user_id: string): Promise<MesoPlan | null> {
  const [meso] = await db
    .select()
    .from(mesocycles)
    .where(and(eq(mesocycles.id, mesocycleId), eq(mesocycles.userId, user_id)))
    .limit(1);
  if (!meso) return null;

  const dayRows = await db
    .select()
    .from(days)
    .where(eq(days.mesocycleId, mesocycleId))
    .orderBy(asc(days.dayOrder));

  const dayIds = dayRows.map((d) => d.id);

  const dxRows = dayIds.length
    ? await db
        .select({
          dayExerciseId: dayExercises.id,
          dayId: dayExercises.dayId,
          exerciseId: exercises.id,
          name: exercises.name,
          order: dayExercises.exerciseOrder,
        })
        .from(dayExercises)
        .innerJoin(exercises, eq(exercises.id, dayExercises.exerciseId))
        .where(inArray(dayExercises.dayId, dayIds))
        .orderBy(asc(dayExercises.exerciseOrder))
    : [];

  const exIds = dxRows.map((r) => r.exerciseId);
  const prim = exIds.length
    ? await db
        .select({ exerciseId: exerciseMuscles.exerciseId, muscle: muscleGroups.name })
        .from(exerciseMuscles)
        .innerJoin(muscleGroups, eq(muscleGroups.id, exerciseMuscles.muscleGroupId))
        .where(and(inArray(exerciseMuscles.exerciseId, exIds), eq(exerciseMuscles.role, "PRIMARY")))
    : [];
  const primaryByExercise = new Map(prim.map((p) => [p.exerciseId, p.muscle]));

  const byDay = new Map<number, MesoPlanDay["exercises"]>();
  for (const r of dxRows) {
    const arr = byDay.get(r.dayId) ?? [];
    arr.push({
      dayExerciseId: r.dayExerciseId,
      exerciseId: r.exerciseId,
      name: r.name,
      primaryMuscle: primaryByExercise.get(r.exerciseId) ?? "—",
      order: r.order,
    });
    byDay.set(r.dayId, arr);
  }

  return {
    meso,
    days: dayRows.map((d) => ({
      id: d.id,
      label: d.label,
      dayOrder: d.dayOrder,
      exercises: byDay.get(d.id) ?? [],
    })),
  };
}

export type MesoWeekStatus = {
  totalWeeks: number;
  weeksGenerated: number; // highest week number that has workouts (0 = none yet)
  currentWeekComplete: boolean; // all workouts in the highest generated week are done
  nextWeekToGenerate: number | null; // the week the user can generate now, or null
  mesoComplete: boolean; // final week generated and fully done
  perWeek: { week: number; done: number; total: number }[];
};

/**
 * Where a meso stands: which weeks exist, whether the latest is finished, and
 * whether the next week is ready to generate. Drives the "advance week" controls.
 */
export async function getMesoWeekStatus(mesocycleId: number, user_id: string): Promise<MesoWeekStatus> {
  const [meso] = await db
    .select()
    .from(mesocycles)
    .where(and(eq(mesocycles.id, mesocycleId), eq(mesocycles.userId, user_id)))
    .limit(1);
  const totalWeeks = meso?.weeks ?? 5;

  const rows = await db
    .select({ week: workouts.weekNumber, status: workouts.status })
    .from(workouts)
    .where(eq(workouts.mesocycleId, mesocycleId));

  const byWeek = new Map<number, { done: number; total: number }>();
  for (const r of rows) {
    const w = byWeek.get(r.week) ?? { done: 0, total: 0 };
    w.total++;
    if (r.status === "done") w.done++;
    byWeek.set(r.week, w);
  }

  const weeksGenerated = byWeek.size ? Math.max(...byWeek.keys()) : 0;
  const latest = weeksGenerated ? byWeek.get(weeksGenerated)! : null;
  const currentWeekComplete = !!latest && latest.total > 0 && latest.done === latest.total;

  const nextWeekToGenerate =
    currentWeekComplete && weeksGenerated >= 1 && weeksGenerated < totalWeeks
      ? weeksGenerated + 1
      : null;

  const mesoComplete = weeksGenerated === totalWeeks && currentWeekComplete;

  const perWeek = [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, v]) => ({ week, done: v.done, total: v.total }));

  return {
    totalWeeks,
    weeksGenerated,
    currentWeekComplete,
    nextWeekToGenerate,
    mesoComplete,
    perWeek,
  };
}

/** Count of completed working sets per muscle group for a given week. */
export async function getMuscleSetCounts(mesocycleId: number, weekNumber: number) {
  // pull completed sets in the week, join to the exercise's PRIMARY muscle
  const rows = await db
    .select({
      muscleGroupId: exerciseMuscles.muscleGroupId,
      role: exerciseMuscles.role,
      setLogId: setLogs.id,
    })
    .from(setLogs)
    .innerJoin(workouts, eq(workouts.id, setLogs.workoutId))
    .innerJoin(dayExercises, eq(dayExercises.id, setLogs.dayExerciseId))
    .innerJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, dayExercises.exerciseId))
    .where(
      and(
        eq(workouts.mesocycleId, mesocycleId),
        eq(workouts.weekNumber, weekNumber),
        eq(setLogs.completed, true)
      )
    );

  // primary = 1 set, secondary = 0.5 set toward that muscle's weekly volume
  const counts = new Map<number, number>();
  for (const r of rows) {
    const weight = r.role === "PRIMARY" ? 1 : 0.5;
    counts.set(r.muscleGroupId, (counts.get(r.muscleGroupId) ?? 0) + weight);
  }
  return counts;
}
