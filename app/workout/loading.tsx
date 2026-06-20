import { Skeleton, SkeletonCard, SkeletonPage } from "../components/Skeleton";

/** Today's workout loading state — header + a couple of exercise cards of sets. */
export default function Loading() {
  return (
    <SkeletonPage maxWidth={560}>
      {/* progress header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Skeleton width={140} height={11} />
        <Skeleton width={60} height={11} />
      </div>
      <Skeleton height={6} radius={3} style={{ marginBottom: 24 }} />

      {Array.from({ length: 2 }, (_, c) => (
        <SkeletonCard key={c} style={{ marginBottom: 16 }}>
          <Skeleton width="55%" height={20} style={{ marginBottom: 6 }} />
          <Skeleton width={130} height={11} style={{ marginBottom: 16 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Skeleton width={16} height={16} radius={4} />
                <Skeleton width={70} height={34} radius={6} />
                <Skeleton width={70} height={34} radius={6} />
                <Skeleton width={60} height={12} style={{ marginLeft: "auto" }} />
              </div>
            ))}
          </div>

          <Skeleton height={36} radius={4} style={{ marginTop: 14 }} />
        </SkeletonCard>
      ))}

      <Skeleton height={52} radius={6} style={{ marginTop: 8 }} />
    </SkeletonPage>
  );
}
