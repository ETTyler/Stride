import { signIn } from "@/auth";
import {
  ACCENT,
  CHALK,
  CHALK_DIM,
  GREEN,
  LINE,
  SERIF,
  SLATE,
  SLATE_RAISED,
} from "@/lib/theme";

/**
 * Logged-out landing page. Explains what Stride is and shows a preview of a
 * plan and a workout day so new visitors know what they're signing into,
 * rather than landing on a bare sign-in prompt.
 */
export default function Landing() {
  return (
    <main style={page}>
      <div style={{ width: "100%", maxWidth: 680 }}>
        {/* Hero */}
        <div style={eyebrow}>Autoregulated hypertrophy training</div>
        <h1 style={hero}>
          Train by feel,<br />backed by the numbers<span style={{ color: ACCENT }}>.</span>
        </h1>
        <p style={lede}>
          Stride is a training tracker for building muscle. You set up your exercises,
          plan a block of training, and log every set in the gym. After each session you
          rate how recovered you feel, and Stride works out next week&apos;s sets and weights
          for you — more volume when you&apos;re recovering well, a backoff when you&apos;re not,
          and a lighter deload week to finish.
        </p>

        <SignInButton />

        {/* What you get */}
        <div style={{ ...sectionLabel, marginTop: 44 }}>How it works</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={stepCard}>
              <div style={stepNum}>{s.n}</div>
              <div>
                <div style={stepTitle}>{s.title}</div>
                <p style={stepBody}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div style={{ ...sectionLabel, marginTop: 44 }}>A look inside</div>
        <p style={{ ...lede, fontSize: 14, margin: "8px 0 18px" }}>
          Here&apos;s roughly what your week and a single session look like.
        </p>

        <div style={previewGrid}>
          <PlanPreview />
          <WorkoutPreview />
        </div>

        {/* Closing CTA */}
        <div style={{ ...closingCard }}>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 800, textTransform: "uppercase" }}>
              Ready to start your block?
            </div>
            <p style={{ margin: "4px 0 0", color: CHALK_DIM, fontSize: 13.5 }}>
              Sign in and your library comes pre-loaded with popular lifts.
            </p>
          </div>
          <SignInButton compact />
        </div>
      </div>
    </main>
  );
}

function SignInButton({ compact = false }: { compact?: boolean }) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/" });
      }}
      style={{ marginTop: compact ? 0 : 24, flexShrink: 0 }}
    >
      <button type="submit" style={{ ...signInBtn, width: compact ? "auto" : "100%" }}>
        Sign in with Google
      </button>
    </form>
  );
}

/* ---------------- preview cards ---------------- */

const PLAN_DAYS = [
  { day: "Push", lifts: ["Barbell Bench Press", "Incline DB Press", "Overhead Press", "Cable Fly", "Triceps Pushdown"] },
  { day: "Pull", lifts: ["Pull-Up", "Barbell Row", "Lat Pulldown", "Face Pull", "Incline DB Curl"] },
  { day: "Legs", lifts: ["Back Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Standing Calf Raise"] },
];

function PlanPreview() {
  return (
    <div style={card}>
      <div style={cardEyebrow}>Your plan · Week 3 of 5</div>
      <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 800, marginBottom: 14 }}>
        Push / Pull / Legs
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {PLAN_DAYS.map((d) => (
          <div key={d.day}>
            <div style={dayLabel}>{d.day}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
              {d.lifts.map((l) => (
                <span key={l} style={chip}>
                  {l}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const WORKOUT_SETS = [
  { w: "90", r: "8", target: "8–10 @ 2 RIR", done: true },
  { w: "90", r: "8", target: "8–10 @ 2 RIR", done: true },
  { w: "90", r: "7", target: "8–10 @ 2 RIR", done: true },
  { w: "", r: "", target: "8–10 @ 2 RIR", done: false },
];

function WorkoutPreview() {
  return (
    <div style={card}>
      <div style={cardEyebrow}>Today · Push</div>
      <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 800 }}>Barbell Bench Press</div>
      <div style={{ fontSize: 12, color: CHALK_DIM, marginBottom: 14 }}>Target 8–10 reps · 2 RIR</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {WORKOUT_SETS.map((s, i) => (
          <div key={i} style={{ ...setRow, borderColor: s.done ? GREEN : LINE }}>
            <span style={{ ...setIdx, color: s.done ? GREEN : CHALK_DIM }}>
              {s.done ? "✓" : i + 1}
            </span>
            <div style={setCell}>
              <span style={setVal}>{s.w || "—"}</span>
              <span style={setUnit}>kg</span>
            </div>
            <span style={{ color: CHALK_DIM }}>×</span>
            <div style={setCell}>
              <span style={setVal}>{s.r || "—"}</span>
              <span style={setUnit}>reps</span>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 11, color: CHALK_DIM }}>{s.target}</span>
          </div>
        ))}
      </div>

      <div style={recoveryNote}>
        Finish &amp; rate recovery — pump, soreness, joint pain, workload — and next week tunes itself.
      </div>
    </div>
  );
}

/* ---------------- content ---------------- */

const STEPS = [
  {
    n: 1,
    title: "Build your library",
    body: "Start from a set of popular lifts or add your own, each tagged to the muscle it trains.",
  },
  {
    n: 2,
    title: "Plan a block",
    body: "Lay out your training days, drop exercises onto each, and set how many weeks you want to run.",
  },
  {
    n: 3,
    title: "Train and adjust",
    body: "Log your sets, rate recovery, and let next week's volume and load follow how you're responding.",
  },
];

/* ---------------- styles ---------------- */

const page: React.CSSProperties = {
  flex: 1,
  background: SLATE,
  color: CHALK,
  padding: "40px 20px 80px",
  display: "flex",
  justifyContent: "center",
  fontFamily: "var(--font-body), 'Barlow', system-ui, sans-serif",
};
const eyebrow: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: ACCENT,
  marginBottom: 12,
};
const hero: React.CSSProperties = {
  margin: 0,
  fontSize: 44,
  lineHeight: 1.05,
  fontWeight: 700,
  letterSpacing: "0.01em",
  textTransform: "uppercase",
  fontFamily: SERIF,
};
const lede: React.CSSProperties = {
  color: CHALK_DIM,
  fontSize: 16,
  lineHeight: 1.6,
  margin: "16px 0 0",
};
const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: CHALK_DIM,
};
const signInBtn: React.CSSProperties = {
  padding: "14px 28px",
  background: ACCENT,
  color: SLATE,
  border: "none",
  borderRadius: 4,
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "var(--font-body), 'Barlow', system-ui, sans-serif",
};
const stepCard: React.CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
  background: SLATE_RAISED,
  border: `1px solid ${LINE}`,
  borderRadius: 8,
  padding: 16,
};
const stepNum: React.CSSProperties = {
  flexShrink: 0,
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: ACCENT,
  color: SLATE,
  display: "grid",
  placeItems: "center",
  fontWeight: 800,
  fontFamily: SERIF,
};
const stepTitle: React.CSSProperties = {
  fontFamily: SERIF,
  fontSize: 18,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.01em",
};
const stepBody: React.CSSProperties = {
  margin: "3px 0 0",
  color: CHALK_DIM,
  fontSize: 13.5,
  lineHeight: 1.5,
};
const previewGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};
const card: React.CSSProperties = {
  background: SLATE_RAISED,
  border: `1px solid ${LINE}`,
  borderRadius: 8,
  padding: 18,
};
const cardEyebrow: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: ACCENT,
  marginBottom: 8,
};
const dayLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: CHALK,
};
const chip: React.CSSProperties = {
  fontSize: 11.5,
  color: CHALK_DIM,
  background: SLATE,
  border: `1px solid ${LINE}`,
  borderRadius: 4,
  padding: "3px 7px",
};
const setRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: SLATE,
  border: `1px solid ${LINE}`,
  borderRadius: 6,
  padding: "8px 10px",
};
const setIdx: React.CSSProperties = {
  width: 16,
  fontSize: 13,
  fontWeight: 700,
  textAlign: "center",
};
const setCell: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 3,
};
const setVal: React.CSSProperties = {
  fontFamily: SERIF,
  fontSize: 17,
  fontWeight: 700,
  minWidth: 22,
  textAlign: "right",
};
const setUnit: React.CSSProperties = { fontSize: 10, color: CHALK_DIM };
const recoveryNote: React.CSSProperties = {
  marginTop: 12,
  fontSize: 11.5,
  color: CHALK_DIM,
  lineHeight: 1.5,
};
const closingCard: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  background: SLATE_RAISED,
  border: `1px solid ${LINE}`,
  borderRadius: 8,
  padding: 20,
  marginTop: 44,
};
