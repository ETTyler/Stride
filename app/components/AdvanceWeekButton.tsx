"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceWeek } from "@/lib/actions/mesocycle";
import { ACCENT, RED, SLATE } from "@/lib/theme";

/**
 * Generates the next week for a meso (autoregulated from last week's logs +
 * recovery feedback) and refreshes the screen. Shown once the current week is
 * fully logged.
 */
export default function AdvanceWeekButton({
  mesocycleId,
  nextWeek,
  label,
}: {
  mesocycleId: number;
  nextWeek: number;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    setError(null);
    startTransition(async () => {
      const res = await advanceWeek(mesocycleId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <button
        onClick={go}
        disabled={pending}
        style={{
          width: "100%",
          padding: "15px 0",
          background: ACCENT,
          color: SLATE,
          border: "none",
          borderRadius: 4,
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? "Building…" : label ?? `Generate week ${nextWeek}`}
      </button>
      {error && (
        <p style={{ color: RED, fontSize: 13, marginTop: 8, textAlign: "center" }}>{error}</p>
      )}
    </div>
  );
}
