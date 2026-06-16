"use client";

import React, { useState } from "react";
import type { WorkoutHistoryDetailed } from "@/lib/db/queries";
import { ACCENT, CHALK, CHALK_DIM, LINE, SLATE, SLATE_RAISED } from "@/lib/theme";

export default function HistoryClient({ history }: { history: WorkoutHistoryDetailed[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
      {history.map((w) => {
        const isOpen = open.has(w.workoutId);
        return (
          <div key={w.workoutId} style={card}>
            <button onClick={() => toggle(w.workoutId)} style={headerBtn} aria-expanded={isOpen}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{w.dayLabel}</div>
                <div style={{ fontSize: 12, color: CHALK_DIM, marginTop: 2 }}>
                  {w.mesoName} · Week {w.weekNumber}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, color: ACCENT, fontWeight: 700 }}>
                    {w.setsDone} {w.setsDone === 1 ? "set" : "sets"}
                  </div>
                  <div style={{ fontSize: 11, color: CHALK_DIM, marginTop: 2 }}>
                    {w.date ? new Date(w.date).toLocaleDateString() : "—"}
                  </div>
                </div>
                <span
                  style={{
                    color: CHALK_DIM,
                    fontSize: 14,
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "transform 160ms ease",
                  }}
                >
                  ▾
                </span>
              </div>
            </button>

            {isOpen && (
              <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 12, paddingTop: 12 }}>
                {w.exercises.length === 0 ? (
                  <p style={{ fontSize: 13, color: CHALK_DIM, margin: 0 }}>No sets logged.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {w.exercises.map((ex) => {
                      const done = ex.sets.filter((s) => s.completed);
                      return (
                        <div key={ex.dayExerciseId}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{ex.name}</span>
                            {ex.primaryMuscle && (
                              <span style={{ fontSize: 11, color: ACCENT }}>{ex.primaryMuscle}</span>
                            )}
                          </div>
                          {done.length === 0 ? (
                            <div style={{ fontSize: 12, color: CHALK_DIM, marginTop: 4 }}>
                              Skipped / not logged
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                marginTop: 6,
                              }}
                            >
                              {done.map((s) => (
                                <span key={s.setNumber} style={chip}>
                                  {s.weight ?? "—"} kg × {s.reps ?? "—"}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const card: React.CSSProperties = {
  background: SLATE_RAISED,
  border: `1px solid ${LINE}`,
  borderRadius: 6,
  padding: "12px 14px",
};
const headerBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  width: "100%",
  background: "transparent",
  border: "none",
  color: CHALK,
  cursor: "pointer",
  textAlign: "left",
  padding: 0,
};
const chip: React.CSSProperties = {
  fontFamily: "var(--font-display), 'Oswald', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  color: CHALK,
  background: SLATE,
  border: `1px solid ${LINE}`,
  borderRadius: 4,
  padding: "4px 8px",
  fontVariantNumeric: "tabular-nums",
};
