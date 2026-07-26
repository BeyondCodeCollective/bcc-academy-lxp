import type { TrackConfig } from "@/lib/programs/types";

/**
 * The cohort-local calendar day for `at`, as `YYYY-MM-DD`.
 *
 * Every BCC cohort runs on US Eastern. A bare `YYYY-MM-DD` in a syllabus
 * parses as midnight *UTC* — 8pm ET the evening before — so comparing it to a
 * Date directly makes a session "happen" the night before it does. Compare
 * Eastern day keys instead; ISO dates sort lexicographically, and Intl handles
 * the EST/EDT switch.
 *
 * (`WeekConfig.comingSoonUntil` deliberately keeps its documented midnight-UTC
 * semantics — it's an unlock moment, not a session date.)
 */
export const COHORT_TIME_ZONE = "America/New_York";

/** "18:30" → "6:30 PM ET". Wall-clock only; the zone label is a constant. */
export function formatCohortTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix} ET`;
}

export function easternDayKey(at: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: COHORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** True once `date` (a bare YYYY-MM-DD, or an ISO timestamp) has arrived in ET. */
export function unitDateHasArrived(date: string, at: Date): boolean {
  return date.slice(0, 10) <= easternDayKey(at);
}

/**
 * Has this cohort's first day arrived? The single answer to "has the course
 * started", so the holding page, the curriculum lock, the nav, the tutor and
 * the admin filters can never disagree.
 *
 * `startDate` is a bare YYYY-MM-DD, so `now >= new Date(startDate)` flipped
 * true at midnight UTC — 8pm ET the evening before the cohort actually began.
 * A track with `startDateTbd` has no real date and has never started.
 */
export function trackHasStarted(
  track: { startDate: string; startDateTbd?: boolean },
  at: Date = new Date(),
): boolean {
  if (track.startDateTbd) return false;
  return unitDateHasArrived(track.startDate, at);
}

/** Format a bare YYYY-MM-DD for humans without slipping to the prior day. */
export function formatCohortDate(
  date: string,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
  locale?: string,
): string {
  // Anchor at local noon so no timezone can push it across a date boundary —
  // the same trick holding-view.tsx already uses.
  return new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString(locale, opts);
}

/**
 * Short date for table cells — "Jul 23", with the year only when it isn't the
 * current one. THE formatter for dates in tables; raw ISO never reaches the UI.
 */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Bare YYYY-MM-DD anchors at local noon (same trick as formatCohortDate) so
  // a timezone can't push it to the prior day.
  const d = new Date(iso.length <= 10 ? `${iso.slice(0, 10)}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("en-US", opts);
}

/**
 * Relative time for recent activity — "3h ago" / "3d ago" under a week, then
 * the short date. One clock for every feed and "last response" line.
 */
export function formatRelativeDate(
  iso: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const hrs = Math.round((nowMs - t) / 3_600_000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return formatShortDate(iso);
}

// Casing for slug words that title-case gets wrong. Last-resort only — real
// names come from track config / track_overrides.
const SLUG_WORDS: Record<string, string> = {
  comptia: "CompTIA",
  ai: "AI",
  mass: "MASS",
  bcc: "BCC",
  bgc: "BGC",
  it: "IT",
};

/**
 * Human fallback for a track/course slug — "comptia-security" → "CompTIA
 * Security". Raw slugs must never render in the UI; use this when no display
 * name is on record.
 */
export function humanizeSlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => SLUG_WORDS[w] ?? w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Compute the current week number (1-based) from a cohort start date.
 * Returns a value clamped between 1 and totalWeeks.
 *
 * @param lastSessionDayOffset — number of days after the week's start day when
 *   the last session of that week occurs. Once that day has passed, we advance
 *   to the next week. For example, Tech+ starts Wednesday and the last session
 *   is Friday → offset = 2. MASS starts Tuesday with one session on the start
 *   day → offset = 6 (default, preserves original 7-day-cycle behavior).
 * @param asOf — the moment to evaluate. Defaults to now. Callers that already
 *   take an `asOf` (attendance) must pass it through, or their answer silently
 *   ignores it and reads the wall clock instead.
 */
export function computeCurrentWeek(
  startDate: string,
  totalWeeks: number = 8,
  lastSessionDayOffset: number = 6,
  asOf: Date = new Date()
): number {
  const start = new Date(startDate);
  const now = asOf;
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= lastSessionDayOffset) return Math.max(1, Math.min(1, totalWeeks));
  const week = Math.floor((diffDays - lastSessionDayOffset - 1) / 7) + 2;
  return Math.max(1, Math.min(week, totalWeeks));
}

/**
 * The "current" unit (Week or Day) for a track, 0 before it starts.
 *
 * `computeCurrentWeek` advances on a 7-day cycle, so on a DAY-gated cohort
 * (weeks-are-days, e.g. the Roblox bootcamp with `unitLabel: "Day"`) it stays
 * pinned at 1 for the whole camp — Day 2 and Day 3 would never become
 * "current". The real signal there is per-unit `comingSoonUntil` unlock dates:
 * the latest unit whose date has passed is the current one. This single helper
 * is the source of truth for the redirect landing page, the classroom page,
 * AND the track overview so they can never disagree about which day it is.
 */
export function resolveCurrentUnit(track: TrackConfig, now: Date = new Date()): number {
  const started = !track.startDateTbd && now >= new Date(track.startDate);
  // A syllabus that dates its units (Security+ meets Tue/Thu and skips a week)
  // is authoritative: the current unit is the last one whose date has arrived
  // in the cohort's timezone. The 7-day cycle can't express that cadence, so
  // don't let it vote — including before the first unit, where falling back
  // would report unit 1 from the evening before (startDate is midnight UTC).
  const hasUnitDates = !track.startDateTbd && track.weekSummaries.some((ws) => ws.date);
  const dateScheduledThrough = hasUnitDates
    ? Math.max(
        0,
        ...track.weekSummaries
          .filter((ws) => ws.date && unitDateHasArrived(ws.date, now))
          .map((ws) => ws.week),
      )
    : 0;
  const computed = track.selfPaced
    ? started
      ? 1
      : 0
    : hasUnitDates
      ? dateScheduledThrough
      : started
        ? computeCurrentWeek(track.startDate, track.totalWeeks, track.lastSessionDayOffset)
        : 0;
  const dateUnlockedThrough = track.selfPaced
    ? 0
    : Math.max(
        0,
        ...track.weeks
          .filter((w) => w.comingSoonUntil && now >= new Date(w.comingSoonUntil))
          .map((w) => w.week),
      );
  return Math.max(computed, dateUnlockedThrough);
}

/**
 * The ET calendar day (YYYY-MM-DD) of a track's LAST session, or null when it
 * can't be known. A day key, not a Date: every other date in a cohort's life is
 * compared as an Eastern calendar day, and a Date would drag a timezone back in.
 *
 * Three sources, most authoritative first:
 *  1. A dated syllabus (`weekSummaries[].date`) — Security+ meets Tue/Thu and
 *     skips a week; only the syllabus knows when it really ends.
 *  2. Per-unit unlock dates (`weeks[].comingSoonUntil`) — how day-gated camps
 *     like the Roblox bootcamp express their schedule. These are real ISO
 *     timestamps, so resolve them to the ET day they land on.
 *  3. Derived from the start date. Units are DAYS when unitLabel is "Day"
 *     (a 3-day camp ends 2 days after it starts), otherwise weeks.
 */
export function resolveTrackEndDayKey(track: TrackConfig): string | null {
  if (track.startDateTbd || track.selfPaced) return null;

  // Bare YYYY-MM-DD sorts lexicographically, so no Date parsing needed.
  const dated = track.weekSummaries
    .filter((ws) => ws.date)
    .map((ws) => (ws.date as string).slice(0, 10));
  if (dated.length) return dated.reduce((a, b) => (a > b ? a : b));

  const unlocks = track.weeks
    .filter((w) => w.comingSoonUntil)
    .map((w) => easternDayKey(new Date(w.comingSoonUntil as string)));
  if (unlocks.length) return unlocks.reduce((a, b) => (a > b ? a : b));

  const [y, m, d] = track.startDate.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const spanDays =
    track.unitLabel === "Day"
      ? Math.max(0, track.totalWeeks - 1)
      : Math.max(0, track.totalWeeks - 1) * 7 + (track.lastSessionDayOffset ?? 0);
  // Calendar arithmetic on a bare date: UTC keeps it free of DST shifts, and
  // the result is read back as a calendar day, never as an instant.
  return new Date(Date.UTC(y, m - 1, d) + spanDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export type TrackPhase = "upcoming" | "running" | "ended";

/**
 * Where a course sits in its life. Drives which headline number is honest:
 * enrolled before it starts, active while it runs, completion once it's over.
 * A rolling "active this week" decays to zero on a finished cohort, which
 * reads as failure rather than as "the course is done".
 *
 * Every boundary is an EASTERN calendar day, matching trackHasStarted. A bare
 * `now >= new Date(startDate)` flips true at midnight UTC — 8pm ET the evening
 * before — so a Monday cohort would read "running" from Sunday evening, and a
 * course would read "ended" at 8pm ET on its own final class day.
 *
 * A course is only `ended` once the ET day AFTER its last session has arrived;
 * on the last day itself it is still running.
 */
export function resolveTrackPhase(track: TrackConfig, now: Date = new Date()): TrackPhase {
  if (!trackHasStarted(track, now)) return "upcoming";
  const endDayKey = resolveTrackEndDayKey(track);
  if (!endDayKey) return "running";
  return easternDayKey(now) > endDayKey ? "ended" : "running";
}

/**
 * Category display names
 */
export const CATEGORY_LABELS: Record<string, string> = {
  course_materials: "Course Materials",
  recordings: "Recordings",
  career_prep: "Career Prep",
  program_info: "Program Info",
};
