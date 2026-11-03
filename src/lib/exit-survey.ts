// Per-session exit survey: shared prompts and validation. Kept free of server
// imports so the client form, the server actions and the tests agree on one
// definition.

export const UNDERSTANDING_PROMPT = "I could explain today's main idea to a colleague.";
export const UNCLEAR_PROMPT = "What was unclear or went too fast?";
export const HOURS_PROMPT =
  "About how many hours did you spend on the program since the last Monday session, not counting live sessions?";

export const MAX_UNCLEAR_LENGTH = 2000;
export const MAX_HOURS_LENGTH = 60;

/**
 * The hours question belongs to the Monday session. Courses enter their
 * sessions in order, and the first session of a week is the Monday one, so
 * session 1 stands for Monday. Week 1 has no earlier Monday to measure from.
 */
export function asksHours(weekNumber: number, sessionNumber: number): boolean {
  return sessionNumber === 1 && weekNumber > 1;
}

/** 1 to 5 as an integer, or null for anything else. */
export function parseUnderstanding(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** Trimmed text, null when blank, null when over the limit. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 && t.length <= max ? t : null;
}
