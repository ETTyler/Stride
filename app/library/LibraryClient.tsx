"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExercise } from "@/lib/actions/library";
import {
  ACCENT,
  CHALK,
  CHALK_DIM,
  LINE,
  RED,
  SERIF,
  SLATE,
  SLATE_RAISED,
} from "@/lib/theme";

type Muscle = { id: number; name: string; category: string; mev: number; mav: number; mrv: number };
type ExerciseRow = {
  id: number;
  name: string;
  repRange: string;
  primary: string | null;
  secondary: string[];
};

export default function LibraryClient({
  exercises,
  muscles,
}: {
  exercises: ExerciseRow[];
  muscles: Muscle[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [primaryId, setPrimaryId] = useState<number | "">(muscles[0]?.id ?? "");
  const [secondary, setSecondary] = useState<number[]>([]);
  const [repLow, setRepLow] = useState("8");
  const [repHigh, setRepHigh] = useState("12");
  const [loadStep, setLoadStep] = useState("2.5");
  const [videoUrl, setVideoUrl] = useState("");

  function toggleSecondary(id: number) {
    setSecondary((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function reset() {
    setName("");
    setSecondary([]);
    setRepLow("8");
    setRepHigh("12");
    setLoadStep("2.5");
    setVideoUrl("");
  }

  function submit() {
    setError(null);
    if (primaryId === "") {
      setError("Pick a primary muscle.");
      return;
    }
    startTransition(async () => {
      const res = await createExercise({
        name,
        repRangeLow: Number(repLow),
        repRangeHigh: Number(repHigh),
        loadStep: Number(loadStep),
        videoUrl: videoUrl || undefined,
        primaryMuscleId: Number(primaryId),
        secondaryMuscleIds: secondary,
      });
      if (!res.ok) setError(res.error);
      else {
        reset();
        router.refresh();
      }
    });
  }

  const noMuscles = muscles.length === 0;

  return (
    <main style={page}>
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={eyebrow}>Catalog</div>
        <h1 style={title}>Exercise library</h1>
        <p style={{ color: CHALK_DIM, fontSize: 14, lineHeight: 1.6, margin: "10px 0 24px" }}>
          Add the lifts you train and tag the muscles each one works. Primary muscles drive
          volume; secondary muscles count half toward weekly sets.
        </p>

        {noMuscles && (
          <div style={warn}>
            No muscle groups found. Run <code style={code}>npm run db:seed</code> to load the
            default muscles and starter exercises.
          </div>
        )}

        {/* create form */}
        <section style={card}>
          <h2 style={cardTitle}>New exercise</h2>

          <label style={lbl}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Incline Dumbbell Press"
            style={input}
            disabled={pending}
          />

          <label style={lbl}>Primary muscle</label>
          <select
            value={primaryId}
            onChange={(e) => setPrimaryId(e.target.value === "" ? "" : Number(e.target.value))}
            style={input}
            disabled={pending || noMuscles}
          >
            {muscles.reduce((groups, m) => {
              if (!groups.length || groups[groups.length - 1].category !== m.category) {
                groups.push({ category: m.category, muscles: [] });
              }
              groups[groups.length - 1].muscles.push(m);
              return groups;
            }, [] as { category: string; muscles: Muscle[] }[]).map((group) => (
              <optgroup key={group.category} label={group.category}>
                {group.muscles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <label style={lbl}>Secondary muscles (optional)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {muscles
              .filter((m) => m.id !== primaryId)
              .map((m) => {
                const on = secondary.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleSecondary(m.id)}
                    disabled={pending}
                    style={{
                      ...chip,
                      border: `1.5px solid ${on ? ACCENT : LINE}`,
                      background: on ? ACCENT : "transparent",
                      color: on ? SLATE : CHALK_DIM,
                    }}
                  >
                    {m.name}
                  </button>
                );
              })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
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
              <label style={lbl}>Load step (kg)</label>
              <input
                inputMode="decimal"
                value={loadStep}
                onChange={(e) => setLoadStep(e.target.value)}
                style={input}
                disabled={pending}
              />
            </div>
          </div>

          <label style={lbl}>Video URL (optional)</label>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://…"
            style={input}
            disabled={pending}
          />

          {error && <p style={{ color: RED, fontSize: 13, margin: "4px 0 0" }}>{error}</p>}

          <button onClick={submit} disabled={pending || noMuscles} style={primaryBtn}>
            {pending ? "Saving…" : "Add exercise"}
          </button>
        </section>

        {/* list */}
        <h2 style={{ ...cardTitle, marginTop: 28 }}>
          {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
        </h2>
        {exercises.length === 0 ? (
          <p style={{ color: CHALK_DIM, fontSize: 14 }}>None yet — add your first above.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {exercises.map((ex) => (
              <div key={ex.id} style={listRow}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{ex.name}</div>
                  <div style={{ fontSize: 12, color: CHALK_DIM, marginTop: 2 }}>
                    <span style={{ color: ACCENT }}>{ex.primary ?? "—"}</span>
                    {ex.secondary.length > 0 && <> · {ex.secondary.join(", ")}</>}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: CHALK_DIM, whiteSpace: "nowrap" }}>
                  {ex.repRange} reps
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
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
  padding: 18,
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
  margin: "12px 0 6px",
};
const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: SLATE,
  border: `1px solid ${LINE}`,
  borderRadius: 4,
  color: CHALK,
  fontSize: 16,
  padding: "10px 12px",
  outline: "none",
};
const chip: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};
const primaryBtn: React.CSSProperties = {
  marginTop: 18,
  width: "100%",
  padding: "14px 0",
  background: ACCENT,
  color: SLATE,
  border: "none",
  borderRadius: 4,
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
};
const listRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  background: SLATE_RAISED,
  border: `1px solid ${LINE}`,
  borderRadius: 6,
  padding: "12px 14px",
};
const warn: React.CSSProperties = {
  background: "rgba(232,197,71,0.12)",
  border: `1px solid ${ACCENT}`,
  borderRadius: 6,
  padding: "10px 12px",
  fontSize: 13,
  color: CHALK,
  marginBottom: 16,
};
const code: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), monospace",
  background: SLATE,
  padding: "1px 5px",
  borderRadius: 3,
};
