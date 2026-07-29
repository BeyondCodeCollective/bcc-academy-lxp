// Categorical color set for the stats language. One hue — cobalt — distinguished
// by lightness, never a rainbow. Use for program/phase/track segments in donuts
// and stacked bars so every analytics surface reads the same. For SEMANTIC
// status (on-track/at-risk/disengaged, pass/fail) keep the conventional
// green/amber/grey — those carry meaning a monochrome ramp would lose.

export const COBALT_FAMILY = [
  "#1D59FF", // cobalt — primary
  "#7CA0FF", // cobalt light
  "#1A2B6B", // deep navy
  "#4B5FA8", // muted indigo
  "#A7B6D9", // slate
  "#C9D4F0", // pale cobalt
];

/** Color for the i-th categorical segment, wrapping if there are more than six. */
export function cobaltAt(i: number): string {
  return COBALT_FAMILY[i % COBALT_FAMILY.length];
}

/** Sequential cobalt ramp, weakest → full strength. THE scale for every
 *  non-judgmental distribution (heatmap intensity, ranked bars, completion
 *  buckets) so "more" always reads as "more cobalt" across the app. */
export const COBALT_RAMP = [
  "color-mix(in srgb, var(--primary) 16%, white)",
  "color-mix(in srgb, var(--primary) 36%, white)",
  "color-mix(in srgb, var(--primary) 56%, white)",
  "color-mix(in srgb, var(--primary) 78%, white)",
  "var(--primary)",
] as const;

/** Semantic status fills for chart segments/dots — the JS mirror of the
 *  --success/--warning/--danger/--inactive tokens in globals.css. Charts that
 *  take literal color props read from here so the hexes can't fork. */
export const STATUS_COLORS = {
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  inactive: "#9CA3AF",
} as const;

/** Diverging scale for ORDERED-SCALE SHARE — Likert agreement, sentiment.
 *
 *  A 1–5 agreement question is polarity data, not magnitude: it has a neutral
 *  middle and two opposing directions. A single-hue ramp can show "more" but
 *  can't show "which way", which is why 35 identical cobalt bars told a reader
 *  nothing. Two hues either side of a gray midpoint, centred on neutral, make
 *  a weak area visible at a glance.
 *
 *  Agree keeps the brand cobalt. The warm pole is a deep terracotta —
 *  deliberately NOT #E54D2E (that is the fonz.sh coral DESIGN.md bans) and a
 *  step away from the amber `warning` token so a disagreement never reads as a
 *  system alert.
 *
 *  Validated with the dataviz six-checks (light surface):
 *    · lightness band .............. PASS
 *    · CVD separation .............. PASS (worst adjacent ΔE 13.0 protan)
 *    · normal-vision floor ......... PASS (worst adjacent ΔE 16.6)
 *    · chroma floor ................ expected fail on the gray midpoint, which
 *      the diverging form requires
 *    · contrast vs surface ......... WARN on two steps, discharged by the
 *      visible per-segment labels and the counts table this chart ships with
 */
export const LIKERT_DIVERGING = {
  stronglyDisagree: "#8A3A12",
  disagree: "#E08A1E",
  neutral: "#71717A",
  agree: "#6B93FF",
  stronglyAgree: "#1D59FF",
} as const;

/** Ordered low→high, the order a 1–5 scale is answered in. */
export const LIKERT_SCALE_COLORS = [
  LIKERT_DIVERGING.stronglyDisagree,
  LIKERT_DIVERGING.disagree,
  LIKERT_DIVERGING.neutral,
  LIKERT_DIVERGING.agree,
  LIKERT_DIVERGING.stronglyAgree,
] as const;
