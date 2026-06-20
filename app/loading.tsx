import { Skeleton, SkeletonCard, SkeletonPage } from "./components/Skeleton";

/** Dashboard / home loading state — mirrors the active mesocycle layout. */
export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton width={120} height={11} style={{ marginBottom: 10 }} />
      <Skeleton width="70%" height={34} />

      {/* week progress bars */}
      <div style={{ display: "flex", gap: 6, margin: "22px 0 8px" }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{ flex: 1 }}>
            <Skeleton height={6} radius={3} />
            <Skeleton width={20} height={8} style={{ margin: "6px auto 0" }} />
          </div>
        ))}
      </div>

      {/* primary "start workout" card */}
      <Skeleton height={86} radius={8} style={{ marginTop: 16 }} />

      {/* volume overview card */}
      <SkeletonCard style={{ marginTop: 24 }}>
        <Skeleton width={160} height={11} style={{ marginBottom: 16 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <Skeleton width={90} height={12} />
                <Skeleton width={70} height={12} />
              </div>
              <Skeleton height={6} radius={3} />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <Skeleton height={40} radius={4} />
        <Skeleton height={40} radius={4} />
      </div>
    </SkeletonPage>
  );
}
