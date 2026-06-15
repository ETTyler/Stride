"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ACCENT, CHALK, CHALK_DIM, LINE, SERIF, SLATE } from "@/lib/theme";

/**
 * Global top navigation. Sticky, dark, with the active route highlighted in the
 * chalk-yellow accent. Rendered once in the root layout.
 */

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/library", label: "Library" },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname === "/workout" : pathname.startsWith(href);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: SLATE,
        borderBottom: `1px solid ${LINE}`,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "10px 16px",
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: SERIF,
          fontSize: 18,
          fontWeight: 800,
          color: CHALK,
          textDecoration: "none",
          marginRight: "auto",
          letterSpacing: "-0.01em",
        }}
      >
        Stride<span style={{ color: ACCENT }}>.</span>
      </Link>

      {LINKS.map((l) => {
        const active = isActive(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textDecoration: "none",
              padding: "8px 12px",
              color: active ? SLATE : CHALK_DIM,
              background: active ? ACCENT : "transparent",
              borderRadius: 4,
            }}
          >
            {l.label}
          </Link>
        );
      })}

      {session?.user && (
        <>
          <div style={{ fontSize: 12, color: CHALK_DIM, marginLeft: 12 }}>
            {session.user.name || session.user.email}
          </div>
          <button
            onClick={() => signOut({ redirectTo: "/auth/signin" })}
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              border: "none",
              background: "transparent",
              color: CHALK_DIM,
              cursor: "pointer",
              padding: "8px 12px",
            }}
          >
            Sign out
          </button>
        </>
      )}
    </nav>
  );
}
