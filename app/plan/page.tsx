import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listMesocycles, getMesocyclePlan, getMesoWeekStatus } from "@/lib/db/queries";
import { listExercises, listMuscles } from "@/lib/actions/library";
import PlanClient from "./PlanClient";

export const dynamic = "force-dynamic";

/**
 * Mesocycle planner. Lists mesos, lets you build one (days + exercises), and
 * start it (which generates week 1 and makes it active). The selected meso is
 * carried in the ?meso= query param.
 */
export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ meso?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  const sp = await searchParams;
  const mesos = await listMesocycles(session.user.id);

  const requested = sp.meso ? Number(sp.meso) : NaN;
  const selectedId = mesos.some((m) => m.id === requested)
    ? requested
    : mesos[0]?.id ?? null;

  const [plan, status, exercises, muscles] = await Promise.all([
    selectedId ? getMesocyclePlan(selectedId, session.user.id) : Promise.resolve(null),
    selectedId ? getMesoWeekStatus(selectedId, session.user.id) : Promise.resolve(null),
    listExercises(),
    listMuscles(),
  ]);

  return (
    <PlanClient
      mesos={mesos}
      selectedId={selectedId}
      plan={plan}
      status={status}
      exercises={exercises}
      muscles={muscles}
    />
  );
}
