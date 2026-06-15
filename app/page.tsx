import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActiveMeso, getMesoWeekStatus, getNextWorkout } from "@/lib/db/queries";
import AdvanceWeekButton from "./components/AdvanceWeekButton";
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

export const dynamic = "force-dynamic";

/**
 * Home / dashboard. If a meso is running it shows where you are and routes you
 * into today's session (or to generating the next week). Otherwise it onboards.
 */
export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const meso = await getActiveMeso(session.user.id);

  return (
    <main
      style={{
        flex: 1,
        background: SLATE,
        color: CHALK,
        padding: "32px 20px 80px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        {meso ? <ActiveDashboard mesoId={meso.id} mesoName={meso.name} userId={session.user.id} /> : <Onboarding />}
      </div>
    </main>
  );
}

async function ActiveDashboard({ mesoId, mesoName, userId }: { mesoId: number; mesoName: string; userId: string }) {
  const status = await getMesoWeekStatus(mesoId, userId);
  const next = await getNextWorkout(mesoId);

  return (
    <>
      <div style={eyebrow}>Active mesocycle</div>
      <h1 style={title}>{mesoName}</h1>

      <div style={{ display: "flex", gap: 6, margin: "20px 0 8px" }}>
        {Array.from({ length: status.totalWeeks }, (_, i) => {
          const wk = status.perWeek.find((w) => w.week === i + 1);
          const pct = wk && wk.total ? wk.done / wk.total : 0;
          const isDeload = i + 1 === status.totalWeeks;
          return (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ height: 6, background: LINE, borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pct * 100}%`,
                    background: pct === 1 ? GREEN : ACCENT,
                  }}
                />
              </div>
              <div style={{ fontSize: 9, color: CHALK_DIM, marginTop: 4, textAlign: "center" }}>
                {isDeload ? "DL" : `W${i + 1}`}
              </div>
            </div>
          );
        })}
      </div>

      {next ? (
        <Link href="/workout" style={primaryCard}>
          <span style={{ ...eyebrow, color: SLATE, opacity: 0.7 }}>
            Week {next.weekNumber} · next session
          </span>
          <span style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 800 }}>
            Start today&apos;s workout →
          </span>
        </Link>
      ) : status.nextWeekToGenerate != null ? (
        <div style={card}>
          <p style={{ margin: "0 0 14px", color: CHALK_DIM, fontSize: 14, lineHeight: 1.5 }}>
            Week {status.weeksGenerated} is complete. Generate week{" "}
            {status.nextWeekToGenerate} — volume and load are autoregulated from your logs
            and recovery feedback.
          </p>
          <AdvanceWeekButton
            mesocycleId={mesoId}
            nextWeek={status.nextWeekToGenerate}
          />
        </div>
      ) : (
        <div style={card}>
          <p style={{ margin: 0, color: CHALK_DIM, fontSize: 14, lineHeight: 1.5 }}>
            🎉 Mesocycle complete. Head to{" "}
            <Link href="/plan" style={{ color: ACCENT, fontWeight: 700 }}>
              Plan
            </Link>{" "}
            to set up your next block.
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <Link href="/plan" style={secondaryLink}>
          Edit plan
        </Link>
        <Link href="/library" style={secondaryLink}>
          Exercise library
        </Link>
      </div>
    </>
  );
}

function Onboarding() {
  const steps = [
    {
      n: 1,
      title: "Your exercise library",
      body: "Start from a curated set of popular lifts, or add your own — each tagged to the muscle it works.",
      href: "/library",
      cta: "Open library",
    },
    {
      n: 2,
      title: "Plan a mesocycle",
      body: "Lay out your training days and add exercises to each — pick from your library or create a new one right there.",
      href: "/plan",
      cta: "Plan a meso",
    },
    {
      n: 3,
      title: "Train & autoregulate",
      body: "Log every set, rate recovery, and let next week's volume tune itself.",
      href: "/workout",
      cta: "Today's workout",
    },
  ];

  return (
    <>
      <div style={eyebrow}>Welcome</div>
      <h1 style={title}>Train by feel, backed by the numbers.</h1>
      <p style={{ color: CHALK_DIM, fontSize: 15, lineHeight: 1.6, margin: "12px 0 28px" }}>
        An autoregulated hypertrophy tracker. Set up your plan, then let weekly recovery
        feedback drive your volume from MEV toward MRV — with a deload to finish.
      </p>

      {steps.map((s) => (
        <Link key={s.n} href={s.href} style={card}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={stepNum}>{s.n}</div>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 800 }}>{s.title}</div>
              <p style={{ margin: "4px 0 8px", color: CHALK_DIM, fontSize: 13.5, lineHeight: 1.5 }}>
                {s.body}
              </p>
              <span style={{ color: ACCENT, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em" }}>
                {s.cta} →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}

/* ---------------- styles ---------------- */

const eyebrow: React.CSSProperties = {
  display: "block",
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
  letterSpacing: "0.01em",
  textTransform: "uppercase",
  fontFamily: SERIF,
  lineHeight: 1.1,
};
const card: React.CSSProperties = {
  display: "block",
  background: SLATE_RAISED,
  border: `1px solid ${LINE}`,
  borderRadius: 8,
  padding: 18,
  marginTop: 14,
  textDecoration: "none",
  color: CHALK,
};
const primaryCard: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  background: ACCENT,
  color: SLATE,
  borderRadius: 8,
  padding: "22px 20px",
  marginTop: 16,
  textDecoration: "none",
};
const secondaryLink: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  padding: "12px 0",
  border: `1px solid ${LINE}`,
  borderRadius: 4,
  color: CHALK_DIM,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  textDecoration: "none",
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
