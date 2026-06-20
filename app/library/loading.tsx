import { Skeleton, SkeletonCard, SkeletonPage } from "../components/Skeleton";

/** Library loading state — the "add exercise" form block + a list of exercises. */
export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton width={90} height={11} style={{ marginBottom: 10 }} />
      <Skeleton width="55%" height={34} style={{ marginBottom: 20 }} />

      {/* add-exercise form */}
      <SkeletonCard style={{ marginBottom: 24 }}>
        <Skeleton width={140} height={14} style={{ marginBottom: 14 }} />
        <Skeleton height={40} radius={4} style={{ marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <Skeleton height={40} radius={4} />
          <Skeleton height={40} radius={4} />
        </div>
        <Skeleton height={42} radius={4} />
      </SkeletonCard>

      {/* exercise list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <SkeletonCard key={i} style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Skeleton width="45%" height={15} />
              <Skeleton width={80} height={12} />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonPage>
  );
}
