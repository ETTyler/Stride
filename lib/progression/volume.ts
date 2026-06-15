import type { MuscleFeedback, VolumeLandmarks } from "./types";
import { clampToLandmarks } from "./rir";

export type VolumeDecision = {
  /** signed change in working sets for the muscle next week */
  setChange: number;
  /** human-readable reason, shown in the UI so the user trusts the call */
  reason: string;
};

/**
 * The autoregulation core, mirroring RP-style logic.
 *
 * It reads recovery + stimulus signals and decides whether the muscle should
 * get MORE volume (under-stimulated and recovering fine), the SAME (working
 * well), or LESS (recovery is failing). Joint pain and a "too_much" workload
 * always win and force a backoff regardless of pump.
 *
 * Signals:
 *   pump      high = good acute stimulus
 *   soreness  0 = recovered early (room for more); 3 = still sore (too much)
 *   jointPain any meaningful pain = back off, this isn't about muscle recovery
 *   workload  the user's gestalt of how hard the session was to recover from
 */
export function decideVolume(fb: MuscleFeedback): VolumeDecision {
  // 1. Safety / overreaching overrides — these short-circuit everything.
  if (fb.jointPain >= 2) {
    return { setChange: -1, reason: "Joint pain reported — pulling a set to protect the joint." };
  }
  if (fb.workload === "too_much") {
    return { setChange: -1, reason: "You flagged the workload as too much — backing off a set." };
  }
  if (fb.soreness >= 3) {
    return { setChange: -1, reason: "Still very sore from last time — recovery is lagging, dropping a set." };
  }

  // 2. Under-stimulated and recovering well → add volume.
  //    Low pump + healed early + it felt easy = clear signal to do more.
  if (fb.pump <= 1 && fb.soreness <= 1 && (fb.workload === "easy" || fb.workload === "moderate")) {
    return { setChange: +1, reason: "Low pump and recovered early — adding a set to push volume." };
  }

  // 3. Recovered early but stimulus was okay → nudge volume up gently.
  if (fb.soreness === 0 && fb.workload !== "hard") {
    return { setChange: +1, reason: "Fully recovered before today — room for one more set." };
  }

  // 4. Good pump, normal soreness, hard but manageable → hold sets, progress load instead.
  return { setChange: 0, reason: "Recovery and stimulus look on track — holding volume, progressing load." };
}

/**
 * Apply the decision to last week's set count, clamped to the muscle's landmarks.
 * Returns both the new count and whether we've hit the MRV ceiling (a signal to
 * the caller that a deload should be scheduled soon).
 */
export function nextWeekSets(
  lastWeekSets: number,
  fb: MuscleFeedback,
  lm: VolumeLandmarks
): { sets: number; decision: VolumeDecision; atCeiling: boolean } {
  const decision = decideVolume(fb);
  const raw = lastWeekSets + decision.setChange;
  const sets = clampToLandmarks(raw, lm);
  return { sets, decision, atCeiling: sets >= lm.mrv };
}

/** Deload volume: roughly half the last working week's sets, never below MEV/2. */
export function deloadSets(lastWorkingWeekSets: number): number {
  return Math.max(2, Math.round(lastWorkingWeekSets / 2));
}
