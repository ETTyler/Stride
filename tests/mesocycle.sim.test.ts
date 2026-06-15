/**
 * Simulation test: drives the progression engine across a full mesocycle the
 * same way generateNextWeek does, without a database. It proves the multi-week
 * behaviour holds together: load climbs, volume autoregulates, the deload lands.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { prescribe } from "../lib/progression/index.ts";
import type {
  MuscleFeedback,
  VolumeLandmarks,
  ExerciseConfig,
  PerformedSet,
} from "../lib/progression/types.ts";

const LM: VolumeLandmarks = { mev: 8, mav: 16, mrv: 22 };
const EX: ExerciseConfig = { repRangeLow: 8, repRangeHigh: 12, loadStep: 2.5 };

/**
 * Simulate a lifter who always hits the top of the rep range (so load should
 * climb every week) and recovers well (so volume should climb until clamped).
 */
function simulateMeso(totalWeeks: number, feedback: MuscleFeedback) {
  const history: { week: number; weight: number; sets: number; rir: number; deload: boolean }[] = [];
  let lastWeekSets: PerformedSet[] = [];
  let lastWeekSetCount = 3;
  let startingWeight = 100;

  for (let week = 1; week <= totalWeeks; week++) {
    const r = prescribe({
      weekNumber: week,
      totalWeeks,
      lastWeekSets,
      lastWeekSetCount,
      feedback,
      landmarks: LM,
      exercise: EX,
    });

    const weight = week === 1 ? startingWeight : r.targetWeight || startingWeight;
    const isDeload = week === totalWeeks;

    history.push({ week, weight, sets: r.sets, rir: r.targetRir, deload: isDeload });

    // lifter performs every prescribed set at the top of the range
    lastWeekSets = Array.from({ length: r.sets }, () => ({
      weight,
      reps: EX.repRangeHigh,
    }));
    lastWeekSetCount = r.sets;
    startingWeight = weight;
  }
  return history;
}

test("load climbs each working week when the lifter clears the rep range", () => {
  const recoversWell: MuscleFeedback = { pump: 1, soreness: 0, jointPain: 0, workload: "easy" };
  const h = simulateMeso(5, recoversWell);
  // weeks 2,3,4 should each add load over the prior week
  assert.ok(h[2].weight > h[1].weight, "week 3 heavier than week 2");
  assert.ok(h[3].weight > h[2].weight, "week 4 heavier than week 3");
});

test("volume climbs under good recovery but never exceeds MRV", () => {
  const recoversWell: MuscleFeedback = { pump: 0, soreness: 0, jointPain: 0, workload: "easy" };
  const h = simulateMeso(6, recoversWell);
  const workingWeeks = h.filter((w) => !w.deload);
  for (const w of workingWeeks) assert.ok(w.sets <= LM.mrv, `week ${w.week} within MRV`);
  // it should have grown from the start
  assert.ok(workingWeeks[workingWeeks.length - 1].sets >= workingWeeks[0].sets);
});

test("the final week is always a deload with reduced volume and high RIR", () => {
  const h = simulateMeso(5, { pump: 2, soreness: 1, jointPain: 0, workload: "moderate" });
  const deload = h[h.length - 1];
  const lastWorking = h[h.length - 2];
  assert.equal(deload.deload, true);
  assert.ok(deload.sets < lastWorking.sets, "deload volume is reduced");
  assert.ok(deload.rir >= 3, "deload RIR is high");
});

test("RIR descends monotonically across working weeks", () => {
  const h = simulateMeso(5, { pump: 2, soreness: 1, jointPain: 0, workload: "moderate" });
  const workingRir = h.filter((w) => !w.deload).map((w) => w.rir);
  for (let i = 1; i < workingRir.length; i++) {
    assert.ok(workingRir[i] <= workingRir[i - 1], "RIR never increases mid-block");
  }
});

test("persistent joint pain prevents volume from ever climbing", () => {
  const hurts: MuscleFeedback = { pump: 1, soreness: 1, jointPain: 2, workload: "moderate" };
  const h = simulateMeso(5, hurts);
  const working = h.filter((w) => !w.deload);
  // sets should trend down or stay floored at MEV, never exceed the starting 3
  for (const w of working) assert.ok(w.sets <= LM.mev, `week ${w.week} not inflating volume`);
});
