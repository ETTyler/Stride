"use server";

import { db } from "@/db/client";
import { exercises, exerciseMuscles, muscleGroups } from "@/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

/**
 * Exercise library actions: this is the "I enter the exercises I'm doing and
 * select the muscle groups they target" flow from the brief.
 */

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

export async function createExercise(input: {
  name: string;
  repRangeLow: number;
  repRangeHigh: number;
  loadStep: number;
  videoUrl?: string;
  primaryMuscleId: number;
  secondaryMuscleIds?: number[];
}): Promise<Result<{ exerciseId: number }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not authenticated" };
  }

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name the exercise." };
  if (input.repRangeLow < 1 || input.repRangeHigh < input.repRangeLow)
    return { ok: false, error: "Check the rep range — high must be ≥ low." };
  if (input.loadStep <= 0) return { ok: false, error: "Load step must be positive." };

  const [ex] = await db
    .insert(exercises)
    .values({
      userId: session.user.id,
      name,
      repRangeLow: input.repRangeLow,
      repRangeHigh: input.repRangeHigh,
      loadStep: input.loadStep,
      videoUrl: input.videoUrl?.trim() || null,
    })
    .returning();

  const links = [
    { exerciseId: ex.id, muscleGroupId: input.primaryMuscleId, role: "PRIMARY" as const },
    ...(input.secondaryMuscleIds ?? []).map((id) => ({
      exerciseId: ex.id,
      muscleGroupId: id,
      role: "SECONDARY" as const,
    })),
  ];
  await db.insert(exerciseMuscles).values(links);

  revalidatePath("/library");
  return { ok: true, exerciseId: ex.id };
}

export async function listExercises() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const rows = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      repRangeLow: exercises.repRangeLow,
      repRangeHigh: exercises.repRangeHigh,
      muscle: muscleGroups.name,
      category: muscleGroups.category,
      role: exerciseMuscles.role,
    })
    .from(exercises)
    .leftJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id))
    .leftJoin(muscleGroups, eq(muscleGroups.id, exerciseMuscles.muscleGroupId))
    .where(
      or(
        eq(exercises.userId, session.user.id), // User's custom exercises
        isNull(exercises.userId) // Shared catalog exercises
      )
    );

  // collapse muscle rows into one record per exercise
  const byId = new Map<number, any>();
  for (const r of rows) {
    if (!byId.has(r.id)) {
      byId.set(r.id, {
        id: r.id,
        name: r.name,
        repRange: `${r.repRangeLow}–${r.repRangeHigh}`,
        primary: null as string | null,
        primaryCategory: null as string | null,
        secondary: [] as string[],
      });
    }
    const rec = byId.get(r.id);
    if (r.role === "PRIMARY") {
      rec.primary = r.muscle;
      rec.primaryCategory = r.category;
    } else if (r.role === "SECONDARY" && r.muscle) rec.secondary.push(r.muscle);
  }

  // Sort by primary muscle category, then by primary muscle name, then by exercise name
  return [...byId.values()].sort((a, b) => {
    if (a.primaryCategory !== b.primaryCategory) {
      return (a.primaryCategory || "").localeCompare(b.primaryCategory || "");
    }
    if (a.primary !== b.primary) {
      return (a.primary || "").localeCompare(b.primary || "");
    }
    return a.name.localeCompare(b.name);
  });
}

export async function listMuscles() {
  const muscles = await db.select().from(muscleGroups);
  return muscles.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
