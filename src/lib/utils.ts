import type { TrackConfig } from "@/lib/programs/types";

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
  // is authoritative: the current unit is the last one whose date has passed.
  // The 7-day cycle can't express that cadence, so don't let it vote.
  const dateScheduledThrough = track.startDateTbd
    ? 0
    : Math.max(
        0,
        ...track.weekSummaries
          .filter((ws) => ws.date && now >= new Date(ws.date))
          .map((ws) => ws.week),
      );
  const computed = track.selfPaced
    ? started
      ? 1
      : 0
    : dateScheduledThrough > 0
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
 * The date of a track's LAST session, or null when it can't be known.
 *
 * Three sources, most authoritative first:
 *  1. A dated syllabus (`weekSummaries[].date`) — Security+ meets Tue/Thu and
 *     skips a week; only the syllabus knows when it really ends.
 *  2. Per-unit unlock dates (`weeks[].comingSoonUntil`) — how day-gated camps
 *     like the Roblox bootcamp express their schedule.
 *  3. Derived from the start date. Units are DAYS when unitLabel is "Day"
 *     (a 3-day camp ends 2 days after it starts), otherwise weeks.
 */
export function resolveTrackEndDate(track: TrackConfig): Date | null {
  if (track.startDateTbd || track.selfPaced) return null;

  const dated = track.weekSummaries
    .filter((ws) => ws.date)
    .map((ws) => new Date(ws.date as string).getTime());
  if (dated.length) return new Date(Math.max(...dated));

  const unlocks = track.weeks
    .filter((w) => w.comingSoonUntil)
    .map((w) => new Date(w.comingSoonUntil as string).getTime());
  if (unlocks.length) return new Date(Math.max(...unlocks));

  const start = new Date(track.startDate);
  if (Number.isNaN(start.getTime())) return null;
  const spanDays =
    track.unitLabel === "Day"
      ? Math.max(0, track.totalWeeks - 1)
      : Math.max(0, track.totalWeeks - 1) * 7 + (track.lastSessionDayOffset ?? 0);
  return new Date(start.getTime() + spanDays * 86_400_000);
}

export type TrackPhase = "upcoming" | "running" | "ended";

/**
 * Where a course sits in its life. Drives which headline number is honest:
 * enrolled before it starts, active while it runs, completion once it's over.
 * A rolling "active this week" decays to zero on a finished cohort, which
 * reads as failure rather than as "the course is done".
 *
 * A course is only `ended` the day AFTER its last session — on the last day
 * itself it is still running.
 */
export function resolveTrackPhase(track: TrackConfig, now: Date = new Date()): TrackPhase {
  if (track.startDateTbd) return "upcoming";
  if (now < new Date(track.startDate)) return "upcoming";
  const end = resolveTrackEndDate(track);
  if (!end) return "running";
  const dayAfterLastSession = new Date(end.getTime() + 86_400_000);
  dayAfterLastSession.setUTCHours(0, 0, 0, 0);
  return now >= dayAfterLastSession ? "ended" : "running";
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
