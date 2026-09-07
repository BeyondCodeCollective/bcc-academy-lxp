// Canonical engagement + activity definitions — ONE source of truth.
//
// Before this module the admin analytics carried 4 different definitions of
// "engaged" and 3 of "active", so the same learner could read engaged on one
// screen and disengaged on another. Every surface now calls these predicates
// instead of re-deriving the rule inline. Fetching stays with each surface
// (they scope differently); the *definition* lives here.
//
// DECIDED (see docs/analytics-plan.md):
//  - Engagement = "did the work": attendance OR video OR submission OR reflection.
//  - Tutor chat and browsing are ACTIVITY, not engagement.
//  - "Active (window)" = any activity signal — including login/browsing — inside
//    the window.

/**
 * Who counts as a LEARNER in any denominator. Three flags, always together:
 * role student, not a test/QA login, not staff. Staff (instructors, admins,
 * partner staff on personal-email accounts) hold student_tracks rows so they
 * can see a course; counting them inflates every rate. This predicate was
 * hand-rolled in five places, each missing is_staff (analytics audit
 * 2026-08-18, F6). Select "id, role, is_test, is_staff" and call this.
 */
export const LEARNER_FIELDS = "id, role, is_test, is_staff" as const;
export function isLearner(row: {
  role?: string | null;
  is_test?: boolean | null;
  is_staff?: boolean | null;
}): boolean {
  return row.role === "student" && !row.is_test && !row.is_staff;
}

export type DidWorkSignal = "attendance" | "video" | "submission" | "reflection";

/** The signals that count as engagement. Order is display-priority. */
export const ENGAGEMENT_SIGNALS: readonly DidWorkSignal[] = [
  "attendance",
  "video",
  "submission",
  "reflection",
] as const;

export type EngagementSignals = {
  attended?: boolean;
  watched?: boolean;
  submitted?: boolean;
  reflected?: boolean;
};

/**
 * Is this learner ENGAGED — did they do the work at least once? Modality decides
 * which signal is *primary* (attendance for live, video for on-demand), but the
 * engaged predicate is the union: a live learner engages via attendance, an
 * on-demand learner via video, and submissions/reflections count for both. So
 * the union is correct at both program and course scope without special-casing.
 */
export function isEngaged(s: EngagementSignals): boolean {
  return Boolean(s.attended || s.watched || s.submitted || s.reflected);
}

export const DAY_MS = 86_400_000;

/**
 * Is this learner ACTIVE within `windowDays`? `lastSignalMs` is the most recent
 * of ANY activity signal (engagement signals + login + browsing), 0/undefined
 * when unknown. A 0 is "no signal on record", never treated as recent.
 */
export function isActiveWithin(
  lastSignalMs: number | undefined,
  windowDays: number,
  now: number,
): boolean {
  if (!lastSignalMs) return false;
  return now - lastSignalMs <= windowDays * DAY_MS;
}
