import { Skeleton, SkeletonCard, SkeletonPage } from "../components/Skeleton";

/** Plan page loading state — meso selector chips + a few training-day cards. */
export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton width={90} height={11} style={{ marginBottom: 10 }} />
      <Skeleton width="60%" height={34} style={{ marginBottom: 20 }} />

      {/* meso selector row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} width={120} height={36} radius={4} />
        ))}
      </div>

      {/* training day cards */}
      {Array.from({ length: 3 }, (_, c) => (
        <SkeletonCard key={c} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <Skeleton width={120} height={18} />
            <Skeleton width={50} height={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Skeleton width="50%" height={14} />
                <Skeleton width={70} height={14} />
              </div>
            ))}
          </div>
          <Skeleton height={38} radius={4} style={{ marginTop: 14 }} />
        </SkeletonCard>
      ))}
    </SkeletonPage>
  );
}
