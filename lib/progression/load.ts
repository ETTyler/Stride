import type { ExerciseConfig, PerformedSet } from "./types";

export type LoadDecision = {
  targetWeight: number;
  targetRepsLow: number;
  targetRepsHigh: number;
  reason: string;
};

/**
 * Load & rep progression for a single exercise, week to week.
 *
 * Double progression: stay at a weight, add reps toward the top of the range;
 * once you clear the top of the range, add load and reset toward the bottom.
 *
 * We judge off the user's best working set last time (the top set), since that
 * sets the ceiling the rest are anchored to.
 */
export function progressLoad(
  lastWeekSets: PerformedSet[],
  cfg: ExerciseConfig
): LoadDecision {
  // No history yet → prescribe the last/known weight at the bottom of the range.
  if (lastWeekSets.length === 0) {
    return {
      targetWeight: 0,
      targetRepsLow: cfg.repRangeLow,
      targetRepsHigh: cfg.repRangeHigh,
      reason: "First time on this lift — pick a weight you can hit for the low end of the range.",
    };
  }

  // Use the top set (highest weight; ties broken by reps) as the anchor.
  const top = [...lastWeekSets].sort(
    (a, b) => b.weight - a.weight || b.reps - a.reps
  )[0];

  // Cleared the top of the rep range → add load, reset reps toward the bottom.
  if (top.reps >= cfg.repRangeHigh) {
    return {
      targetWeight: round(top.weight + cfg.loadStep, cfg.loadStep),
      targetRepsLow: cfg.repRangeLow,
      targetRepsHigh: cfg.repRangeHigh,
      reason: `Hit ${top.reps} reps — adding ${cfg.loadStep}kg and working back up the range.`,
    };
  }

  // Below the bottom of the range → weight was too heavy, hold and aim to earn the reps.
  if (top.reps < cfg.repRangeLow) {
    return {
      targetWeight: top.weight,
      targetRepsLow: cfg.repRangeLow,
      targetRepsHigh: cfg.repRangeHigh,
      reason: `Only ${top.reps} reps last time — same weight, build back to ${cfg.repRangeLow}.`,
    };
  }

  // Inside the range → same weight, add a rep toward the top.
  return {
    targetWeight: top.weight,
    targetRepsLow: Math.min(top.reps + 1, cfg.repRangeHigh),
    targetRepsHigh: cfg.repRangeHigh,
    reason: `Same weight — add a rep, aiming for ${cfg.repRangeHigh}.`,
  };
}

function round(value: number, step: number): number {
  return Math.round(value / step) * step;
}
