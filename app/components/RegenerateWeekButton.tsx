"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateWeek } from "@/lib/actions/mesocycle";
import { CHALK_DIM, LINE, RED } from "@/lib/theme";

/**
 * Rebuilds an already-generated (but not-yet-logged) week so the latest
 * progression is applied to it. Shown for the current week when it hasn't been
 * started — handy after a plan or algorithm change. Confirms first, since it
 * replaces the week's prescription.
 */
export default function RegenerateWeekButton({
  mesocycleId,
  week,
}: {
  mesocycleId: number;
  week: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    if (!window.confirm(`Rebuild week ${week}? This re-runs the progression and replaces the current prescription. Nothing is logged yet, so no training data is lost.`))
      return;
    setError(null);
    startTransition(async () => {
      const res = await regenerateWeek(mesocycleId, week);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={go}
        disabled={pending}
        style={{
          width: "100%",
          padding: "11px 0",
          background: "transparent",
          color: CHALK_DIM,
          border: `1px solid ${LINE}`,
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? "Rebuilding…" : `Regenerate week ${week} with latest progression`}
      </button>
      {error && (
        <p style={{ color: RED, fontSize: 13, marginTop: 8, textAlign: "center" }}>{error}</p>
      )}
    </div>
  );
}
