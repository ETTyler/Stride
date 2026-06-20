import { LINE, SLATE } from "@/lib/theme";

/**
 * Loading-skeleton primitives. `Skeleton` is a single shimmering block; the
 * `.skeleton` class (shimmer + reduced-motion fallback) lives in globals.css.
 * Compose these in each route's loading.tsx to mirror the real layout so the
 * screen never sits blank or frozen while server data loads.
 */
export function Skeleton({
  width = "100%",
  height = 14,
  radius = 4,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** A short stack of text-line skeletons of decreasing width. */
export function SkeletonText({
  lines = 3,
  style,
}: {
  lines?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 ? "65%" : "100%"}
        />
      ))}
    </div>
  );
}

/** A raised card container matching the app's card styling. */
export function SkeletonCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "#2A302C",
        border: `1px solid ${LINE}`,
        borderRadius: 8,
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** The centered page shell shared by every loading screen. */
export function SkeletonPage({
  children,
  maxWidth = 640,
}: {
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <main
      aria-busy="true"
      aria-label="Loading"
      style={{
        flex: 1,
        background: SLATE,
        padding: "32px 20px 80px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth }}>{children}</div>
    </main>
  );
}
