/**
 * Tests for the progression engine.
 * Written against node:test so they run with `node --test` (via tsx) or vitest.
 * Each test is a hand-worked scenario you can reason about on paper.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  targetRirForWeek,
  isDeloadWeek,
  decideVolume,
  nextWeekSets,
  deloadSets,
  progressLoad,
  prescribe,
} from "../lib/progression/index.ts";
import type {
  VolumeLandmarks,
  ExerciseConfig,
  MuscleFeedback,
} from "../lib/progression/types.ts";

const LM: VolumeLandmarks = { mev: 8, mav: 16, mrv: 22 };
const EX: ExerciseConfig = { repRangeLow: 8, repRangeHigh: 12, loadStep: 2.5 };

const fb = (over: Partial<MuscleFeedback> = {}): MuscleFeedback => ({
  pump: 2,
  soreness: 1,
  jointPain: 0,
  workload: "moderate",
  ...over,
});

/* ---------- RIR ramp ---------- */

test("RIR ramps from 3 down to 0 across a 5-week meso", () => {
  assert.equal(targetRirForWeek(1, 5), 3);
  assert.equal(targetRirForWeek(4, 5), 0);
});

test("deload week is the final week and uses a high RIR", () => {
  assert.equal(isDeloadWeek(5, 5), true);
  assert.equal(isDeloadWeek(4, 5), false);
  assert.equal(targetRirForWeek(5, 5), 4);
});

/* ---------- volume autoregulation ---------- */

test("joint pain forces a backoff regardless of pump", () => {
  const d = decideVolume(fb({ pump: 3, jointPain: 2 }));
  assert.equal(d.setChange, -1);
});

test("too_much workload backs off a set", () => {
  assert.equal(decideVolume(fb({ workload: "too_much" })).setChange, -1);
});

test("lingering high soreness drops a set", () => {
  assert.equal(decideVolume(fb({ soreness: 3 })).setChange, -1);
});

test("low pump + recovered early + easy adds a set", () => {
  const d = decideVolume(fb({ pump: 0, soreness: 0, workload: "easy" }));
  assert.equal(d.setChange, +1);
});

test("good pump + normal soreness holds volume", () => {
  const d = decideVolume(fb({ pump: 3, soreness: 2, workload: "hard" }));
  assert.equal(d.setChange, 0);
});

test("set count is clamped at MRV and flags the ceiling", () => {
  const r = nextWeekSets(LM.mrv, fb({ pump: 0, soreness: 0, workload: "easy" }), LM);
  assert.equal(r.sets, LM.mrv); // can't exceed MRV
  assert.equal(r.atCeiling, true);
});

test("set count never drops below MEV", () => {
  const r = nextWeekSets(LM.mev, fb({ soreness: 3 }), LM);
  assert.equal(r.sets, LM.mev);
});

test("deload halves the working volume", () => {
  assert.equal(deloadSets(16), 8);
  assert.equal(deloadSets(3), 2); // floor
});

/* ---------- load / rep progression ---------- */

test("clearing the top of the range adds load and resets reps", () => {
  const d = progressLoad([{ weight: 100, reps: 12 }], EX);
  assert.equal(d.targetWeight, 102.5);
  assert.equal(d.targetRepsLow, 8);
});

test("inside the range keeps weight and adds a rep", () => {
  const d = progressLoad([{ weight: 100, reps: 9 }], EX);
  assert.equal(d.targetWeight, 100);
  assert.equal(d.targetRepsLow, 10);
});

test("below the range holds weight to earn the reps back", () => {
  const d = progressLoad([{ weight: 100, reps: 6 }], EX);
  assert.equal(d.targetWeight, 100);
  assert.equal(d.targetRepsLow, 8);
});

test("top set is chosen by weight then reps", () => {
  const d = progressLoad(
    [
      { weight: 100, reps: 8 },
      { weight: 105, reps: 12 }, // this is the anchor
      { weight: 90, reps: 15 },
    ],
    EX
  );
  assert.equal(d.targetWeight, 107.5);
});

/* ---------- full prescription ---------- */

test("prescribe combines volume, load and RIR for a working week", () => {
  const r = prescribe({
    weekNumber: 2,
    totalWeeks: 5,
    lastWeekSets: [{ weight: 100, reps: 12 }],
    lastWeekSetCount: 10,
    feedback: fb({ pump: 0, soreness: 0, workload: "easy" }),
    landmarks: LM,
    exercise: EX,
  });
  assert.equal(r.sets, 11); // +1 set from autoregulation
  assert.equal(r.targetWeight, 102.5); // load added
  assert.equal(r.targetRir, 2); // week 2 of 5
  assert.equal(r.reasons.length, 2);
});

test("prescribe on the deload week cuts volume and raises RIR", () => {
  const r = prescribe({
    weekNumber: 5,
    totalWeeks: 5,
    lastWeekSets: [{ weight: 100, reps: 10 }],
    lastWeekSetCount: 16,
    feedback: fb(),
    landmarks: LM,
    exercise: EX,
  });
  assert.equal(r.sets, 8); // halved
  assert.equal(r.targetRir, 4);
});

test("prescribe flags a deload recommendation at MRV", () => {
  const r = prescribe({
    weekNumber: 3,
    totalWeeks: 5,
    lastWeekSets: [{ weight: 100, reps: 9 }],
    lastWeekSetCount: LM.mrv,
    feedback: fb({ pump: 0, soreness: 0, workload: "easy" }),
    landmarks: LM,
    exercise: EX,
  });
  assert.equal(r.recommendDeloadSoon, true);
});
