"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import type { WorkoutView } from "@/lib/db/queries";
import {
  logSet,
  addSet,
  skipSet,
  saveFeedback,
  finishWorkout,
} from "@/lib/actions/workout";
import { addExerciseToDay, changeExercise } from "@/lib/actions/plan";

/**
 * Today's Workout — the in-gym screen, wired to real data + server actions.
 *
 * Props come from the server component (app/workout/page.tsx). Every mutation
 * goes through a server action and is wrapped in a transition so the UI stays
 * responsive and shows pending state.
 *
 * Design: RP-style "chalk on slate". Dark board, chalky off-white type, one
 * warm chalk-yellow accent for the live/active state.
 */

const CHALK = "#EDE8DB";
const CHALK_DIM = "#9B978C";
const ACCENT = "#E8C547";
const SLATE = "#1F2421";
const SLATE_RAISED = "#2A302C";
const LINE = "#3A413B";
const GREEN = "#7FB069";
const RED = "#C75D5D";

type Muscle = { id: number; name: string };
type LibExercise = { id: number; name: string; primary: string | null };

export default function TodaysWorkout({
  view,
  musclesToday,
  library,
}: {
  view: WorkoutView;
  musclesToday: Muscle[];
  library: LibExercise[];
}) {
  const [swapFor, setSwapFor] = useState<number | null>(null); // dayExerciseId being swapped
  const [addingExercise, setAddingExercise] = useState(false);
  const [draft, setDraft] = useState<Record<number, { weight: string; reps: string }>>(() => {
    const d: Record<number, { weight: string; reps: string }> = {};
    for (const ex of view.exercises)
      for (const s of ex.sets)
        d[s.setLogId] = {
          weight: s.weight != null ? String(s.weight) : "",
          reps: s.reps != null ? String(s.reps) : "",
        };
    return d;
  });
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [pending, startTransition] = useTransition();

  const allSets = view.exercises.flatMap((e) => e.sets);
  const doneCount = allSets.filter((s) => s.completed).length;
  const totalCount = allSets.length;
  const allDone = doneCount === totalCount && totalCount > 0;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
    });
  }

  return (
    <div
      style={{
        background: SLATE,
        minHeight: "100vh",
        color: CHALK,
        fontFamily: "var(--font-body), 'Barlow', system-ui, sans-serif",
        padding: "0 0 96px",
      }}
    >
      <header
        style={{
          padding: "20px 20px 16px",
          borderBottom: `1px solid ${LINE}`,
          position: "sticky",
          top: 0,
          background: SLATE,
          zIndex: 5,
        }}
      >
        <div style={eyebrow}>
          Week {view.weekNumber} of {view.totalWeeks}
          {view.exercises[0]?.targetRir != null && ` · ${view.exercises[0].targetRir} RIR target`}
        </div>
        <h1 style={pageTitle}>{view.dayLabel}</h1>
        <div style={{ marginTop: 14, height: 4, background: LINE }}>
          <div
            style={{
              height: "100%",
              width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%`,
              background: ACCENT,
              transition: "width 240ms ease",
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: CHALK_DIM, marginTop: 6 }}>
          {doneCount} / {totalCount} sets logged
        </div>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            margin: "12px 16px 0",
            padding: "10px 12px",
            background: "rgba(199,93,93,0.12)",
            border: `1px solid ${RED}`,
            color: CHALK,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <main style={{ padding: "8px 16px 0" }}>
        {view.exercises.map((ex, exIdx) => (
          <section
            key={ex.dayExerciseId}
            style={{
              marginTop: 20,
              borderTop: exIdx === 0 ? "none" : `1px solid ${LINE}`,
              paddingTop: exIdx === 0 ? 0 : 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ ...eyebrow, color: ACCENT }}>{ex.primaryMuscle}</div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{ex.name}</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap" }}>
                {ex.targetRir != null && (
                  <span style={{ fontSize: 12, color: CHALK_DIM }}>{ex.targetRir} RIR</span>
                )}
                <button
                  onClick={() => setSwapFor(swapFor === ex.dayExerciseId ? null : ex.dayExerciseId)}
                  disabled={pending}
                  style={linkBtn}
                >
                  {swapFor === ex.dayExerciseId ? "Cancel" : "Swap"}
                </button>
              </div>
            </div>

            {swapFor === ex.dayExerciseId && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <select
                  defaultValue=""
                  disabled={pending}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (!id) return;
                    run(() => changeExercise({ dayExerciseId: ex.dayExerciseId, exerciseId: id }));
                    setSwapFor(null);
                  }}
                  style={{ ...selectInput, flex: 1 }}
                >
                  <option value="">Swap to…</option>
                  {library
                    .filter((l) => l.id !== ex.exerciseId)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                        {l.primary ? ` (${l.primary})` : ""}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {ex.note && (
              <p style={{ fontSize: 12.5, color: CHALK_DIM, margin: "8px 0 14px", fontStyle: "italic" }}>
                {ex.note}
              </p>
            )}

            <div style={colHeader}>
              <span>Set</span>
              <span>Weight (kg)</span>
              <span>Reps</span>
              <span style={{ textAlign: "center" }}>Done</span>
              <span />
            </div>

            {ex.sets.map((s) => {
              const d = draft[s.setLogId] ?? { weight: "", reps: "" };
              return (
                <div
                  key={s.setLogId}
                  style={{
                    ...setRow,
                    opacity: s.completed ? 0.55 : 1,
                  }}
                >
                  <span style={setNum}>{s.setNumber}</span>
                  <input
                    inputMode="decimal"
                    placeholder={s.targetWeight != null ? String(s.targetWeight) : "—"}
                    value={d.weight}
                    disabled={pending}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, [s.setLogId]: { ...d, weight: e.target.value } }))
                    }
                    style={cellInput}
                  />
                  <input
                    inputMode="numeric"
                    placeholder={s.targetReps != null ? String(s.targetReps) : "—"}
                    value={d.reps}
                    disabled={pending}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, [s.setLogId]: { ...d, reps: e.target.value } }))
                    }
                    style={cellInput}
                  />
                  <button
                    disabled={pending}
                    aria-label={s.completed ? "Mark set not done" : "Mark set done"}
                    onClick={() =>
                      run(() =>
                        logSet({
                          setLogId: s.setLogId,
                          weight: d.weight,
                          reps: d.reps,
                          completed: !s.completed,
                        })
                      )
                    }
                    style={{
                      ...checkBtn,
                      border: `1.5px solid ${s.completed ? GREEN : LINE}`,
                      background: s.completed ? GREEN : "transparent",
                      color: s.completed ? SLATE : CHALK_DIM,
                    }}
                  >
                    ✓
                  </button>
                  <button
                    disabled={pending || s.completed}
                    aria-label="Skip set"
                    title="Skip this set"
                    onClick={() => run(() => skipSet({ setLogId: s.setLogId }))}
                    style={{ ...skipBtn, opacity: s.completed ? 0.25 : 1 }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                disabled={pending}
                onClick={() => run(() => addSet({ workoutId: view.workoutId, dayExerciseId: ex.dayExerciseId }))}
                style={ghostBtn}
              >
                + Add set
              </button>
            </div>
          </section>
        ))}

        {/* add another exercise to today's session */}
        <div style={{ marginTop: 22, borderTop: `1px solid ${LINE}`, paddingTop: 18 }}>
          {addingExercise ? (
            <div style={{ display: "flex", gap: 8 }}>
              <select
                defaultValue=""
                disabled={pending}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (!id) return;
                  run(() => addExerciseToDay({ dayId: view.dayId, exerciseId: id }));
                  setAddingExercise(false);
                }}
                style={{ ...selectInput, flex: 1 }}
              >
                <option value="">Choose an exercise…</option>
                {library.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.primary ? ` (${l.primary})` : ""}
                  </option>
                ))}
              </select>
              <button onClick={() => setAddingExercise(false)} disabled={pending} style={ghostBtn}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setAddingExercise(true)} disabled={pending} style={ghostBtn}>
              + Add exercise
            </button>
          )}
        </div>

        {allDone && !showFeedback && (
          <button onClick={() => setShowFeedback(true)} style={finishBtn} disabled={pending}>
            Finish & log recovery
          </button>
        )}
      </main>

      {showFeedback && (
        <FeedbackSheet
          workoutId={view.workoutId}
          muscles={musclesToday}
          pending={pending}
          onClose={() => setShowFeedback(false)}
          onSaveOne={(payload) => run(() => saveFeedback(payload))}
          onFinish={() => run(() => finishWorkout({ workoutId: view.workoutId }))}
        />
      )}

      {!showFeedback && <RestTimer />}
    </div>
  );
}

/* ---------------- feedback sheet ---------------- */

function FeedbackSheet({
  workoutId,
  muscles,
  pending,
  onClose,
  onSaveOne,
  onFinish,
}: {
  workoutId: number;
  muscles: Muscle[];
  pending: boolean;
  onClose: () => void;
  onSaveOne: (p: {
    workoutId: number;
    muscleGroupId: number;
    pump: number;
    soreness: number;
    jointPain: number;
    workload: "easy" | "moderate" | "hard" | "too_much";
  }) => void;
  onFinish: () => void;
}) {
  const [state, setState] = useState<
    Record<number, { pump: number; soreness: number; jointPain: number; workload: string }>
  >(() => {
    const s: Record<number, any> = {};
    for (const m of muscles) s[m.id] = { pump: 2, soreness: 1, jointPain: 0, workload: "moderate" };
    return s;
  });

  function saveAll() {
    for (const m of muscles) {
      const v = state[m.id];
      onSaveOne({
        workoutId,
        muscleGroupId: m.id,
        pump: v.pump,
        soreness: v.soreness,
        jointPain: v.jointPain,
        workload: v.workload as any,
      });
    }
    onFinish();
  }

  return (
    <div style={sheetBackdrop} role="dialog" aria-label="Recovery feedback">
      <div style={sheet}>
        <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>How did it feel?</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: CHALK_DIM }}>
          Your answers set next week's volume. Be honest — this is the autoregulation.
        </p>

        {muscles.map((m) => {
          const v = state[m.id];
          const set = (patch: Partial<typeof v>) =>
            setState((p) => ({ ...p, [m.id]: { ...p[m.id], ...patch } }));
          return (
            <div key={m.id} style={{ marginBottom: 20, borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
              <div style={{ ...eyebrow, color: ACCENT, marginBottom: 10 }}>{m.name}</div>
              <Scale label="Pump" value={v.pump} onChange={(n) => set({ pump: n })} />
              <Scale label="Soreness" value={v.soreness} onChange={(n) => set({ soreness: n })} />
              <Scale label="Joint pain" value={v.jointPain} onChange={(n) => set({ jointPain: n })} />
              <Choice
                label="Workload"
                value={v.workload}
                options={["easy", "moderate", "hard", "too_much"]}
                onChange={(w) => set({ workload: w })}
              />
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} disabled={pending} style={ghostBtn}>
            Back
          </button>
          <button onClick={saveAll} disabled={pending} style={{ ...finishBtn, marginTop: 0, flex: 1 }}>
            {pending ? "Saving…" : "Save & finish workout"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const labels = ["None", "Low", "Med", "High"];
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: CHALK_DIM, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
        {[0, 1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              padding: "9px 0",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              border: `1.5px solid ${value === n ? ACCENT : LINE}`,
              background: value === n ? ACCENT : "transparent",
              color: value === n ? SLATE : CHALK_DIM,
            }}
          >
            {labels[n]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (s: string) => void;
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 12, color: CHALK_DIM, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              padding: "9px 2px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "capitalize",
              border: `1.5px solid ${value === o ? ACCENT : LINE}`,
              background: value === o ? ACCENT : "transparent",
              color: value === o ? SLATE : CHALK_DIM,
            }}
          >
            {o.replace("_", " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- rest timer ---------------- */

function RestTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div style={timerBar}>
      <div
        style={{
          fontFamily: "var(--font-display), 'Oswald', sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: running ? ACCENT : CHALK,
          fontVariantNumeric: "tabular-nums",
          minWidth: 86,
        }}
      >
        {mm}:{ss}
      </div>
      <button onClick={() => setRunning((r) => !r)} style={{ ...timerBtn, background: running ? "transparent" : ACCENT, color: running ? CHALK : SLATE, border: running ? `1.5px solid ${LINE}` : "none" }}>
        {running ? "Pause rest" : "Start rest"}
      </button>
      <button
        onClick={() => {
          setRunning(false);
          setSeconds(0);
        }}
        style={{ ...timerBtn, flex: "none", padding: "13px 16px", background: "transparent", color: CHALK_DIM, border: `1.5px solid ${LINE}` }}
      >
        Reset
      </button>
    </div>
  );
}

/* ---------------- styles ---------------- */

const eyebrow: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: CHALK_DIM,
  marginBottom: 6,
};
const pageTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 30,
  fontWeight: 800,
  letterSpacing: "-0.01em",
  fontFamily: "var(--font-display), 'Oswald', sans-serif",
  textTransform: "uppercase",
};
const colHeader: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "22px 1fr 1fr 40px 28px",
  gap: 6,
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: CHALK_DIM,
  padding: "0 2px 6px",
};
const setRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "22px 1fr 1fr 40px 28px",
  gap: 6,
  alignItems: "center",
  padding: "8px 2px",
  borderBottom: `1px solid ${LINE}`,
  transition: "opacity 160ms ease",
};
const setNum: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: CHALK_DIM,
  fontFamily: "var(--font-display), 'Oswald', sans-serif",
};
const cellInput: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: SLATE_RAISED,
  border: `1px solid ${LINE}`,
  color: CHALK,
  fontSize: 16, // 16px avoids iOS zoom-on-focus
  padding: "9px 10px",
  outline: "none",
  fontFamily: "var(--font-display), 'Oswald', sans-serif",
};
const checkBtn: React.CSSProperties = {
  justifySelf: "center",
  width: 38,
  height: 38,
  fontSize: 18,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  transition: "all 140ms ease",
};
const skipBtn: React.CSSProperties = {
  justifySelf: "center",
  width: 28,
  height: 38,
  fontSize: 14,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  background: "transparent",
  border: "none",
  color: CHALK_DIM,
  transition: "opacity 140ms ease",
};
const linkBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: ACCENT,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  cursor: "pointer",
  padding: 0,
};
const selectInput: React.CSSProperties = {
  boxSizing: "border-box",
  background: SLATE_RAISED,
  border: `1px solid ${LINE}`,
  color: CHALK,
  fontSize: 16,
  padding: "10px 10px",
  outline: "none",
};
const ghostBtn: React.CSSProperties = {
  flex: 1,
  padding: "10px 0",
  background: "transparent",
  color: CHALK_DIM,
  border: `1px solid ${LINE}`,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.05em",
  cursor: "pointer",
};
const finishBtn: React.CSSProperties = {
  marginTop: 28,
  width: "100%",
  padding: "15px 0",
  background: ACCENT,
  color: SLATE,
  border: "none",
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
};
const sheetBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  zIndex: 20,
  display: "flex",
  alignItems: "flex-end",
};
const sheet: React.CSSProperties = {
  background: SLATE,
  borderTop: `2px solid ${ACCENT}`,
  width: "100%",
  maxHeight: "88vh",
  overflowY: "auto",
  padding: "22px 18px 32px",
  boxSizing: "border-box",
};
const timerBar: React.CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  background: SLATE_RAISED,
  borderTop: `1px solid ${LINE}`,
  padding: "12px 16px",
  display: "flex",
  alignItems: "center",
  gap: 12,
  zIndex: 10,
};
const timerBtn: React.CSSProperties = {
  flex: 1,
  padding: "13px 0",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
};
