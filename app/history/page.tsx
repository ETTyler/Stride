import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getWorkoutHistoryDetailed } from "@/lib/db/queries";
import { ACCENT, CHALK, CHALK_DIM, SERIF, SLATE } from "@/lib/theme";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";

/** Previous (completed) workouts, newest first — each expandable to its sets. */
export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const history = await getWorkoutHistoryDetailed(session.user.id);

  return (
    <main style={page}>
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={eyebrow}>Log</div>
        <h1 style={title}>Workout history</h1>

        {history.length === 0 ? (
          <p style={{ color: CHALK_DIM, fontSize: 14, marginTop: 16 }}>
            No completed workouts yet. Finish a session and it&apos;ll show up here.{" "}
            <Link href="/workout" style={{ color: ACCENT, fontWeight: 700 }}>
              Today&apos;s workout →
            </Link>
          </p>
        ) : (
          <HistoryClient history={history} />
        )}

        <div style={{ marginTop: 24 }}>
          <Link href="/plan" style={{ color: ACCENT, fontSize: 13, fontWeight: 700 }}>
            View plan overview →
          </Link>
        </div>
      </div>
    </main>
  );
}

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
