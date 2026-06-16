"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ACCENT, CHALK, CHALK_DIM, LINE, SLATE } from "@/lib/theme";

/**
 * Global top navigation. Sticky, dark, with the active route highlighted in the
 * chalk-yellow accent. All styling is inline so it never depends on global CSS;
 * a media-query check switches to a two-row layout on phones.
 */

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/library", label: "Library" },
  { href: "/history", label: "History" },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 560px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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
        flexWrap: "wrap",
        gap: 8,
        padding: isMobile ? "10px 12px" : "10px 16px",
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-display), 'Oswald', sans-serif",
          fontSize: 20,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          color: CHALK,
          textDecoration: "none",
          marginRight: "auto",
        }}
      >
        Stride<span style={{ color: ACCENT }}>.</span>
      </Link>

      <div
        style={{
          display: "flex",
          gap: isMobile ? 6 : 4,
          order: isMobile ? 3 : 0,
          flexBasis: isMobile ? "100%" : "auto",
          marginTop: isMobile ? 4 : 0,
        }}
      >
        {LINKS.map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                flex: isMobile ? 1 : "none",
                textAlign: "center",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
                padding: isMobile ? "10px 4px" : "8px 12px",
                borderRadius: 4,
                color: active ? SLATE : CHALK_DIM,
                background: active ? ACCENT : "transparent",
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </div>

      {session?.user && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isMobile && (
            <span
              style={{
                fontSize: 12,
                color: CHALK_DIM,
                maxWidth: 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {session.user.name || session.user.email}
            </span>
          )}
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
              padding: isMobile ? "8px 6px" : "8px 12px",
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
