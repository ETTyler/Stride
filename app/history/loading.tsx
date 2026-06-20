import { Skeleton, SkeletonCard, SkeletonPage } from "../components/Skeleton";

/** History loading state — title + a list of collapsed workout rows. */
export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton width={60} height={11} style={{ marginBottom: 10 }} />
      <Skeleton width="60%" height={34} style={{ marginBottom: 22 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton width={150} height={15} />
                <Skeleton width={100} height={11} />
              </div>
              <Skeleton width={20} height={20} radius={4} />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonPage>
  );
}
