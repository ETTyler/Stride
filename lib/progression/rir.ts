import type { VolumeLandmarks } from "./types";

/**
 * Target RIR (reps in reserve) ramps down across the mesocycle, so effort
 * climbs as accumulated volume climbs, peaking the week before the deload.
 *
 * A 5-week meso (4 working weeks + deload) looks like:
 *   week 1 -> 3 RIR
 *   week 2 -> 2 RIR
 *   week 3 -> 1 RIR
 *   week 4 -> 0 RIR
 *   week 5 -> deload (handled separately)
 */
export function targetRirForWeek(weekNumber: number, totalWeeks: number): number {
  const lastWorkingWeek = totalWeeks - 1; // last week is the deload
  if (weekNumber >= totalWeeks) return 4; // deload: leave plenty in the tank
  // Start at 3 RIR, lose ~1 per working week, floor at 0.
  const startRir = 3;
  const span = Math.max(lastWorkingWeek - 1, 1);
  const rir = Math.round(startRir - ((weekNumber - 1) / span) * startRir);
  return Math.max(0, Math.min(3, rir));
}

export function isDeloadWeek(weekNumber: number, totalWeeks: number): boolean {
  return weekNumber >= totalWeeks;
}

/** Clamp a set count to the muscle's recoverable range. */
export function clampToLandmarks(sets: number, lm: VolumeLandmarks): number {
  return Math.max(lm.mev, Math.min(lm.mrv, sets));
}
