/**
 * Domain types for the progression engine.
 * These intentionally do NOT import from the DB layer — the engine is pure,
 * takes plain objects in, returns plain objects out, and knows nothing about
 * Drizzle, React, or where the data lives.
 */

export type Workload = "easy" | "moderate" | "hard" | "too_much";

/** One muscle's recoverable-volume landmarks, in working sets per week. */
export interface VolumeLandmarks {
  mev: number; // minimum effective volume — where a meso starts
  mav: number; // maximum adaptive volume — the productive ceiling we climb toward
  mrv: number; // maximum recoverable volume — hard cap; past this, recovery fails
}

/** Subjective feedback for one muscle, captured before its next session. */
export interface MuscleFeedback {
  pump: number; // 0-3, how good the pump was last session
  soreness: number; // 0-3 (0 = recovered well before today / never got sore)
  jointPain: number; // 0-3
  workload: Workload; // overall perceived demand
}

/** A single set as it was actually performed. */
export interface PerformedSet {
  weight: number;
  reps: number;
}

/** What the engine prescribes for one exercise next session. */
export interface SetPrescription {
  sets: number;
  targetWeight: number;
  targetRepsLow: number;
  targetRepsHigh: number;
  targetRir: number;
}

export interface ExerciseConfig {
  repRangeLow: number;
  repRangeHigh: number;
  loadStep: number; // smallest weight increment for this lift
}
