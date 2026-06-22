import type {
  ExerciseConfig,
  MuscleFeedback,
  PerformedSet,
  SetPrescription,
  VolumeLandmarks,
} from "./types";
import { targetRirForWeek, isDeloadWeek } from "./rir";
import { nextWeekSets, deloadSets } from "./volume";
import { progressLoad } from "./load";

export interface PrescribeInput {
  weekNumber: number;
  totalWeeks: number;
  /** sets performed on this exercise last session */
  lastWeekSets: PerformedSet[];
  /** the set COUNT the muscle was trained with last week */
  lastWeekSetCount: number;
  /** feedback for the PRIMARY muscle of this exercise */
  feedback: MuscleFeedback;
  landmarks: VolumeLandmarks;
  exercise: ExerciseConfig;
}

export interface PrescribeResult extends SetPrescription {
  reasons: string[];
  /** true when the muscle has reached MRV — caller should plan a deload */
  recommendDeloadSoon: boolean;
  /**
   * Signed change in working sets the autoregulation called for this muscle
   * (+1 add a set, 0 hold, -1 drop a set). `sets` is the muscle's *weekly*
   * target; this is the per-session nudge the generator applies to each
   * exercise's own set count. 0 on a deload week.
   */
  volumeSetChange: number;
}

/**
 * The single entry point the app calls per exercise to build next session's plan.
 * Pure: same inputs always yield the same prescription.
 */
export function prescribe(input: PrescribeInput): PrescribeResult {
  const {
    weekNumber,
    totalWeeks,
    lastWeekSets,
    lastWeekSetCount,
    feedback,
    landmarks,
    exercise,
  } = input;

  const targetRir = targetRirForWeek(weekNumber, totalWeeks);
  const load = progressLoad(lastWeekSets, exercise);

  // Deload week: cut volume, keep load moderate, leave RIR high.
  if (isDeloadWeek(weekNumber, totalWeeks)) {
    return {
      sets: deloadSets(lastWeekSetCount),
      targetWeight: load.targetWeight,
      targetRepsLow: exercise.repRangeLow,
      targetRepsHigh: exercise.repRangeHigh,
      targetRir,
      reasons: ["Deload week — volume halved and effort dialled back to recover."],
      recommendDeloadSoon: false,
      volumeSetChange: 0,
    };
  }

  const vol = nextWeekSets(lastWeekSetCount, feedback, landmarks);

  return {
    sets: vol.sets,
    targetWeight: load.targetWeight,
    targetRepsLow: load.targetRepsLow,
    targetRepsHigh: load.targetRepsHigh,
    targetRir,
    reasons: [vol.decision.reason, load.reason],
    recommendDeloadSoon: vol.atCeiling,
    volumeSetChange: vol.decision.setChange,
  };
}
