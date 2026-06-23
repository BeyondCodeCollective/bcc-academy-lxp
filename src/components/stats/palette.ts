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
