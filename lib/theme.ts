/**
 * Shared visual tokens for the "chalk on slate" look used across the app.
 * The in-gym workout screen defined these inline first; they live here now so
 * every screen stays consistent.
 *
 * Type: an athletic pairing — Oswald (condensed display) for headings, Barlow
 * for body. Fonts are wired up in app/layout.tsx via next/font and exposed as
 * CSS variables (--font-display, --font-body).
 */

export const CHALK = "#EDE8DB";
export const CHALK_DIM = "#9B978C";
export const ACCENT = "#E8C547";
export const SLATE = "#1F2421";
export const SLATE_RAISED = "#2A302C";
export const LINE = "#3A413B";
export const GREEN = "#7FB069";
export const RED = "#C75D5D";

/** Condensed display face for headings, numbers, and labels. */
export const DISPLAY = "var(--font-display), 'Oswald', 'Arial Narrow', sans-serif";
/** Body face for paragraphs, inputs, and UI text. */
export const SANS = "var(--font-body), 'Barlow', system-ui, sans-serif";

/**
 * Back-compat alias. Earlier screens referenced a "SERIF" heading token; the
 * heading face is now the condensed display font, so SERIF points at it.
 */
export const SERIF = DISPLAY;

export const theme = {
  CHALK,
  CHALK_DIM,
  ACCENT,
  SLATE,
  SLATE_RAISED,
  LINE,
  GREEN,
  RED,
  DISPLAY,
  SANS,
  SERIF,
} as const;
