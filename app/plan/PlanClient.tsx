"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createMesocycle,
  addDay,
  addExerciseToDay,
  removeExerciseFromDay,
  changeExercise,
} from "@/lib/actions/plan";
import { createExercise } from "@/lib/actions/library";
import {
  generateFirstWeek,
  deleteMesocycle,
  setMesocycleStatus,
  duplicateMesocycle,
} from "@/lib/actions/mesocycle";
import AdvanceWeekButton from "@/app/components/AdvanceWeekButton";
import type { MesoPlan, MesoWeekStatus } from "@/lib/db/queries";
import {
  ACCENT,
  CHALK,
  CHALK_DIM,
  GREEN,
  LINE,
  RED,
  SERIF,
  SLATE,
  SLATE_RAISED,
} from "@/lib/theme";

type Meso = {
  id: number;
  name: string;
  weeks: number;
  status: "planned" | "active" | "complete";
};
type ExerciseRow = { id: number; name: string; repRange: string; primary: string | null };
type Muscle = { id: number; name: string };

export default function PlanClient({
  mesos,
  selectedId,
  plan,
  status,
  exercises,
  muscles,
}: {
  mesos: Meso[];
  selectedId: number | null;
  plan: MesoPlan | null;
  status: MesoWeekStatus | null;
  exercises: ExerciseRow[];
  muscles: Muscle[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else {
        after?.();
        router.refresh();
      }
    });
  }

  return (
    <main style={page}>
      <div style={{ width: "100%", maxWidth: 700 }}>
        <div style={eyebrow}>Planner</div>
        <h1 style={title}>Mesocycles</h1>

        <NewMesoForm
          pending={pending}
          onCreated={(id) => router.push(`/plan?meso=${id}`)}
        />

        {/* meso selector */}
        {mesos.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "20px 0 4px" }}>
            {mesos.map((m) => {
              const active = m.id === selectedId;
              return (
                <Link
                  key={m.id}
                  href={`/plan?meso=${m.id}`}
                  style={{
                    ...tab,
                    border: `1.5px solid ${active ? ACCENT : LINE}`,
                    color: active ? SLATE : CHALK_DIM,
                    background: active ? ACCENT : "transparent",
                  }}
                >
                  {m.name}
                  <span style={{ opacity: 0.7, marginLeft: 6, fontSize: 10 }}>
                    {m.status === "active" ? "● live" : m.status}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {error && <p style={{ color: RED, fontSize: 13, marginTop: 12 }}>{error}</p>}

        {plan && status && (
          <MesoBuilder
            plan={plan}
            status={status}
            exercises={exercises}
            muscles={muscles}
            pending={pending}
            run={run}
            onDeleted={() => router.push("/plan")}
          />
        )}
      </div>
    </main>
  );
}

/* ---------------- new meso ---------------- */

function NewMesoForm({
  pending,
  onCreated,
}: {
  pending: boolean;
  onCreated: (id: number) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState("5");
  const [busy, startBusy] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function create() {
    setErr(null);
    startBusy(async () => {
      const res = await createMesocycle({ name, weeks: Number(weeks) });
      if (!res.ok) setErr(res.error);
      else {
        setName("");
        setWeeks("5");
        onCreated(res.mesocycleId);
        router.refresh();
      }
    });
  }

  const disabled = pending || busy;

  return (
    <section style={{ ...card, marginTop: 16 }}>
      <h2 style={cardTitle}>New mesocycle</h2>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={lbl}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Summer Push/Pull/Legs"
            style={input}
            disabled={disabled}
          />
        </div>
        <div style={{ width: 110 }}>
          <label style={lbl}>Weeks</label>
          <input
            inputMode="numeric"
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            style={input}
            disabled={disabled}
          />
        </div>
        <button onClick={create} disabled={disabled} style={{ ...primaryBtn, width: "auto", padding: "12px 20px", marginTop: 0 }}>
          {busy ? "Creating…" : "Create"}
        </button>
      </div>
      <p style={{ fontSize: 12, color: CHALK_DIM, margin: "10px 0 0" }}>
        Length includes the deload (the final week). 5 weeks = 4 working + 1 deload.
      </p>
      {err && <p style={{ color: RED, fontSize: 13, margin: "8px 0 0" }}>{err}</p>}
    </section>
  );
}

/* ---------------- builder ---------------- */

function MesoBuilder({
  plan,
  status,
  exercises,
  muscles,
  pending,
  run,
  onDeleted,
}: {
  plan: MesoPlan;
  status: MesoWeekStatus;
  exercises: ExerciseRow[];
  muscles: Muscle[];
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [newDay, setNewDay] = useState("");
  const [swapFor, setSwapFor] = useState<number | null>(null);
  const started = status.weeksGenerated > 0;
  const totalExercises = plan.days.reduce((n, d) => n + d.exercises.length, 0);
  const canStart = !started && plan.days.length > 0 && totalExercises > 0;

  return (
    <section style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{ ...cardTitle, marginBottom: 0 }}>
          {plan.meso.name}{" "}
          <span style={{ color: CHALK_DIM, fontWeight: 400, fontSize: 13 }}>
            · {plan.meso.weeks} weeks
          </span>
        </h2>
      </div>

      {/* progress / lifecycle */}
      {started && (
        <div style={{ ...card, marginTop: 12 }}>
          <div style={{ fontSize: 13, color: CHALK_DIM, marginBottom: 10 }}>
            Week {status.weeksGenerated} of {status.totalWeeks} generated
            {plan.meso.status === "complete"
              ? " · marked complete"
              : status.currentWeekComplete
              ? " · current week complete"
              : " · in progress"}
          </div>

          {plan.meso.status === "complete" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ margin: 0, color: GREEN, fontSize: 14, fontWeight: 700 }}>
                Mesocycle complete 🎉
              </p>
              <button
                onClick={() =>
                  run(() => duplicateMesocycle(plan.meso.id), () => router.push("/plan"))
                }
                disabled={pending}
                style={{ ...primaryBtn, marginTop: 0 }}
              >
                {pending ? "Working…" : "Start next mesocycle (carry over plan) →"}
              </button>
              <button
                onClick={() => run(() => setMesocycleStatus(plan.meso.id, "active"))}
                disabled={pending}
                style={ghostBtn}
              >
                Reactivate
              </button>
            </div>
          ) : (
            <>
              {status.nextWeekToGenerate != null ? (
                <AdvanceWeekButton mesocycleId={plan.meso.id} nextWeek={status.nextWeekToGenerate} />
              ) : status.mesoComplete ? (
                <p style={{ margin: 0, color: CHALK_DIM, fontSize: 13 }}>
                  All weeks logged — mark it complete below to wrap up and start your next block.
                </p>
              ) : (
                <Link href="/workout" style={{ ...primaryBtnLink }}>
                  Go to today&apos;s workout →
                </Link>
              )}
              <button
                onClick={() => {
                  if (
                    confirm(
                      status.mesoComplete
                        ? "Mark this mesocycle complete?"
                        : "Mark this mesocycle complete now, before all weeks are done?"
                    )
                  )
                    run(() => setMesocycleStatus(plan.meso.id, "complete"));
                }}
                disabled={pending}
                style={{ ...ghostBtn, marginTop: 10 }}
              >
                Mark mesocycle complete
              </button>
            </>
          )}
        </div>
      )}

      {/* days */}
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {plan.days.map((day) => (
          <div key={day.id} style={card}>
            <h3 style={{ margin: "0 0 10px", fontFamily: SERIF, fontSize: 18, fontWeight: 800 }}>
              {day.label}
            </h3>

            {day.exercises.length === 0 ? (
              <p style={{ color: CHALK_DIM, fontSize: 13, margin: "0 0 10px" }}>
                No exercises yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {day.exercises.map((ex) => (
                  <div key={ex.dayExerciseId}>
                    <div style={exRow}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{ex.name}</span>
                        <span style={{ color: ACCENT, fontSize: 12, marginLeft: 8 }}>
                          {ex.primaryMuscle}
                        </span>
                        <span style={{ color: CHALK_DIM, fontSize: 11, marginLeft: 8 }}>
                          {ex.goalSets != null ? `${ex.goalSets} sets` : "auto sets"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button
                          onClick={() =>
                            setSwapFor(swapFor === ex.dayExerciseId ? null : ex.dayExerciseId)
                          }
                          disabled={pending}
                          style={swapLink}
                        >
                          {swapFor === ex.dayExerciseId ? "Cancel" : "Swap"}
                        </button>
                        <button
                          onClick={() => {
                            if (
                              !started ||
                              confirm(
                                `Remove ${ex.name}? Any logged sets for it in this mesocycle will be deleted.`
                              )
                            )
                              run(() => removeExerciseFromDay({ dayExerciseId: ex.dayExerciseId }));
                          }}
                          disabled={pending}
                          aria-label={`Remove ${ex.name}`}
                          style={removeBtn}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {swapFor === ex.dayExerciseId && exercises.length > 0 && (
                      <select
                        defaultValue=""
                        disabled={pending}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          if (!id) return;
                          run(() =>
                            changeExercise({ dayExerciseId: ex.dayExerciseId, exerciseId: id })
                          );
                          setSwapFor(null);
                        }}
                        style={{ ...input, marginTop: 6 }}
                      >
                        <option value="">Swap to…</option>
                        {exercises
                          .filter((e) => e.id !== ex.exerciseId)
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name} {e.primary ? `(${e.primary})` : ""}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}

            <AddExercisePicker
              dayId={day.id}
              exercises={exercises}
              muscles={muscles}
              pending={pending}
              run={run}
            />
          </div>
        ))}
      </div>

      {/* add day */}
      <div style={{ ...card, marginTop: 12 }}>
        <label style={lbl}>Add a training day</label>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={newDay}
            onChange={(e) => setNewDay(e.target.value)}
            placeholder="e.g. Push A"
            style={{ ...input, flex: 1 }}
            disabled={pending}
          />
          <button
            onClick={() =>
              run(() => addDay({ mesocycleId: plan.meso.id, label: newDay }), () => setNewDay(""))
            }
            disabled={pending || !newDay.trim()}
            style={{ ...primaryBtn, width: "auto", padding: "12px 18px", marginTop: 0 }}
          >
            Add day
          </button>
        </div>
        {started && (
          <p style={{ fontSize: 12, color: CHALK_DIM, margin: "10px 0 0" }}>
            Edits to a running meso apply to your current and upcoming sessions. New exercises
            are added to the week in progress; future weeks pick up every change automatically.
          </p>
        )}
      </div>

      {/* lifecycle controls */}
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        {canStart && (
          <button
            onClick={() =>
              run(() => generateFirstWeek(plan.meso.id), () => router.push("/workout"))
            }
            disabled={pending}
            style={{ ...primaryBtn, marginTop: 0, flex: 1 }}
          >
            {pending ? "Starting…" : "Start mesocycle →"}
          </button>
        )}
        {!started && !canStart && plan.days.length > 0 && (
          <p style={{ color: CHALK_DIM, fontSize: 13, flex: 1, alignSelf: "center" }}>
            Add at least one exercise to a day, then you can start.
          </p>
        )}
        <button
          onClick={() => {
            if (confirm(`Delete “${plan.meso.name}” and all its data?`))
              run(() => deleteMesocycle(plan.meso.id), onDeleted);
          }}
          disabled={pending}
          style={dangerBtn}
        >
          Delete
        </button>
      </div>
    </section>
  );
}

/**
 * Adds an exercise to a day. Two modes: pick one already in your library, or
 * enter a brand-new exercise (name + muscle + rep range), which is created and
 * assigned in one step. New exercises join your library for reuse.
 */
function AddExercisePicker({
  dayId,
  exercises,
  muscles,
  pending,
  run,
}: {
  dayId: number;
  exercises: ExerciseRow[];
  muscles: Muscle[];
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => void;
}) {
  const noMuscles = muscles.length === 0;
  const [mode, setMode] = useState<"existing" | "new">(
    exercises.length ? "existing" : "new"
  );
  const [sel, setSel] = useState<number | "">("");

  // optional goal working sets (blank = let the algorithm decide)
  const [goal, setGoal] = useState("");
  const goalSets = goal.trim() === "" ? null : Number(goal);

  // new-exercise fields
  const [name, setName] = useState("");
  const [primaryId, setPrimaryId] = useState<number | "">(muscles[0]?.id ?? "");
  const [repLow, setRepLow] = useState("8");
  const [repHigh, setRepHigh] = useState("12");
  const [loadStep, setLoadStep] = useState("2.5");

  function addExisting() {
    if (sel === "") return;
    const exerciseId = Number(sel);
    run(() => addExerciseToDay({ dayId, exerciseId, goalSets }), () => {
      setSel("");
      setGoal("");
    });
  }

  function addNew() {
    if (primaryId === "" || !name.trim()) return;
    run(
      async () => {
        const created = await createExercise({
          name,
          repRangeLow: Number(repLow),
          repRangeHigh: Number(repHigh),
          loadStep: Number(loadStep),
          primaryMuscleId: Number(primaryId),
        });
        if (!created.ok) return created;
        return addExerciseToDay({ dayId, exerciseId: created.exerciseId, goalSets });
      },
      () => {
        setName("");
        setGoal("");
        setMode("existing");
      }
    );
  }

  return (
    <div>
      {/* mode toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setMode("existing")}
          disabled={pending || exercises.length === 0}
          style={{ ...segBtn, ...(mode === "existing" ? segOn : segOff) }}
        >
          From library
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          disabled={pending}
          style={{ ...segBtn, ...(mode === "new" ? segOn : segOff) }}
        >
          + New exercise
        </button>
      </div>

      {mode === "existing" ? (
        exercises.length === 0 ? (
          <p style={{ fontSize: 12, color: CHALK_DIM, margin: 0 }}>
            Nothing in your library yet — add a new exercise.
          </p>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={sel}
              onChange={(e) => setSel(e.target.value === "" ? "" : Number(e.target.value))}
              style={{ ...input, flex: 1 }}
              disabled={pending}
            >
              <option value="">Choose an exercise…</option>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} {ex.primary ? `(${ex.primary})` : ""}
                </option>
              ))}
            </select>
            <input
              inputMode="numeric"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Sets"
              aria-label="Goal working sets (optional)"
              title="Goal working sets — leave blank to auto-set"
              style={{ ...input, width: 64, flex: "none", textAlign: "center" }}
              disabled={pending}
            />
            <button
              onClick={addExisting}
              disabled={pending || sel === ""}
              style={{ ...ghostBtn, width: "auto", padding: "10px 16px" }}
            >
              Add
            </button>
          </div>
        )
      ) : noMuscles ? (
        <p style={{ fontSize: 12, color: CHALK_DIM, margin: 0 }}>
          No muscle groups found — run <code style={code}>npm run db:seed</code> first.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <label style={lbl}>Exercise name</label>
            <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Incline DB Press"
            style={input}
            disabled={pending}
            />
          </div>
          <div>
          <label style={lbl}>Primary muscle</label>
          <select
            value={primaryId}
            onChange={(e) => setPrimaryId(e.target.value === "" ? "" : Number(e.target.value))}
            style={input}
            disabled={pending}
          >
            {muscles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Rep low</label>
              <input
                inputMode="numeric"
                value={repLow}
                onChange={(e) => setRepLow(e.target.value)}
                style={input}
                disabled={pending}
              />
            </div>
            <div>
              <label style={lbl}>Rep high</label>
              <input
                inputMode="numeric"
                value={repHigh}
                onChange={(e) => setRepHigh(e.target.value)}
                style={input}
                disabled={pending}
              />
            </div>
            <div>
              <label style={lbl}>Load step</label>
              <input
                inputMode="decimal"
                value={loadStep}
                onChange={(e) => setLoadStep(e.target.value)}
                style={input}
                disabled={pending}
              />
            </div>
            <div>
              <label style={lbl}>Goal sets</label>
              <input
                inputMode="numeric"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="auto"
                title="Goal working sets — leave blank to auto-set"
                style={input}
                disabled={pending}
              />
            </div>
          </div>
          <button
            onClick={addNew}
            disabled={pending || !name.trim() || primaryId === ""}
            style={{ ...primaryBtn, marginTop: 2, padding: "11px 0" }}
          >
            {pending ? "Adding…" : "Create & add to day"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- styles ---------------- */

const page: React.CSSProperties = {
  flex: 1,
  background: SLATE,
  color: CHALK,
  padding: "32px 20px 80px",
  display: "flex",
  justifyContent: "center",
  fontFamily: "var(--font-body), 'Barlow', system-ui, sans-serif",
};
const eyebrow: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: CHALK_DIM,
  marginBottom: 6,
};
const title: React.CSSProperties = {
  margin: 0,
  fontSize: 34,
  fontWeight: 700,
  fontFamily: SERIF,
  textTransform: "uppercase",
  letterSpacing: "0.01em",
};
const card: React.CSSProperties = {
  background: SLATE_RAISED,
  border: `1px solid ${LINE}`,
  borderRadius: 8,
  padding: 16,
};
const cardTitle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 16,
  fontWeight: 800,
  fontFamily: SERIF,
};
const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: CHALK_DIM,
  margin: "0 0 6px",
};
const input: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  background: SLATE,
  border: `1px solid ${LINE}`,
  borderRadius: 4,
  color: CHALK,
  fontSize: 16,
  padding: "10px 12px",
  outline: "none",
};
const tab: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
};
const exRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: SLATE,
  border: `1px solid ${LINE}`,
  borderRadius: 6,
  padding: "9px 12px",
  fontSize: 14,
};
const primaryBtn: React.CSSProperties = {
  marginTop: 16,
  width: "100%",
  padding: "13px 0",
  background: ACCENT,
  color: SLATE,
  border: "none",
  borderRadius: 4,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
};
const primaryBtnLink: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  padding: "13px 0",
  background: ACCENT,
  color: SLATE,
  borderRadius: 4,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  textDecoration: "none",
};
const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: CHALK_DIM,
  border: `1px solid ${LINE}`,
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.05em",
  cursor: "pointer",
};
const segBtn: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  cursor: "pointer",
};
const segOn: React.CSSProperties = {
  background: ACCENT,
  color: SLATE,
  border: `1.5px solid ${ACCENT}`,
};
const segOff: React.CSSProperties = {
  background: "transparent",
  color: CHALK_DIM,
  border: `1.5px solid ${LINE}`,
};
const code: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), monospace",
  background: SLATE,
  padding: "1px 5px",
  borderRadius: 3,
};
const removeBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: CHALK_DIM,
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  padding: "0 4px",
};
const swapLink: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: ACCENT,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  cursor: "pointer",
  padding: 0,
};
const dangerBtn: React.CSSProperties = {
  padding: "13px 18px",
  background: "transparent",
  color: RED,
  border: `1px solid ${RED}`,
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
};
