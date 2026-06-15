import {
  getActiveMeso,
  getNextWorkout,
  getWorkoutView,
  getMesoWeekStatus,
} from "@/lib/db/queries";
import { db } from "@/db/client";
import { exerciseMuscles, muscleGroups } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listExercises } from "@/lib/actions/library";
import TodaysWorkout from "./TodaysWorkout";
import AdvanceWeekButton from "@/app/components/AdvanceWeekButton";
import { ACCENT, CHALK_DIM, SERIF, SLATE } from "@/lib/theme";

export const dynamic = "force-dynamic";

/**
 * Server component: resolves the active meso -> next workout -> full view,
 * gathers the muscle list needed for the feedback prompt, and hands plain
 * serializable props to the client screen.
 */
export default async function WorkoutPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const meso = await getActiveMeso(session.user.id);
  if (!meso) {
    return (
      <EmptyState message="No active mesocycle yet.">
        <Link href="/plan" style={cta}>
          Plan a mesocycle →
        </Link>
      </EmptyState>
    );
  }

  const next = await getNextWorkout(meso.id);
  if (!next) {
    // No upcoming session: either the week is done (offer to advance) or the
    // whole meso is complete.
    const status = await getMesoWeekStatus(meso.id, session.user.id);
    if (status.nextWeekToGenerate != null) {
      return (
        <EmptyState message={`Week ${status.weeksGenerated} done. Ready for the next week — volume and load will autoregulate from your logs.`}>
          <div style={{ width: "100%", maxWidth: 320 }}>
            <AdvanceWeekButton mesocycleId={meso.id} nextWeek={status.nextWeekToGenerate} />
          </div>
        </EmptyState>
      );
    }
    return (
      <EmptyState message="This mesocycle is complete. Time to plan the next one.">
        <Link href="/plan" style={cta}>
          Plan the next block →
        </Link>
      </EmptyState>
    );
  }

  const view = await getWorkoutView(next.id);
  if (!view) return <EmptyState message="Couldn't load this workout." />;

  // muscles trained today (for the end-of-session feedback prompt)
  const exIds = view.exercises.map((e) => e.exerciseId);
  const muscleRows = exIds.length
    ? await db
        .selectDistinct({ id: muscleGroups.id, name: muscleGroups.name })
        .from(exerciseMuscles)
        .innerJoin(muscleGroups, eq(muscleGroups.id, exerciseMuscles.muscleGroupId))
        .where(and(inArray(exerciseMuscles.exerciseId, exIds), eq(exerciseMuscles.role, "PRIMARY")))
    : [];

  // full library, for the swap / add-exercise pickers
  const library = await listExercises();

  return <TodaysWorkout view={view} musclesToday={muscleRows} library={library} />;
}

function EmptyState({
  message,
  children,
}: {
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        background: SLATE,
        color: CHALK_DIM,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 360, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: 15 }}>{message}</p>
        {children}
      </div>
    </div>
  );
}

const cta: React.CSSProperties = {
  display: "inline-block",
  padding: "13px 22px",
  background: ACCENT,
  color: SLATE,
  borderRadius: 4,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  textDecoration: "none",
  fontFamily: SERIF,
};
