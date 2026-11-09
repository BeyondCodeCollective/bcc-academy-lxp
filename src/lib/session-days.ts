import type { OfficeHour } from "@/lib/programs/types";
import { formatCohortDate } from "@/lib/utils";

/**
 * The date (yyyy-mm-dd) of each session in a week, or null where the schedule
 * doesn't say. Session 1 is the week's own date. Later sessions take the
 * course's scheduled class events (office hours excluded) that fall after it
 * within the same 7 days, in order. Field Ready: Mon kickoff, Thu workshop.
 */
export function sessionDates(
  weekDate: string | undefined,
  sessionCount: number,
  schedule: OfficeHour[] = [],
): (string | null)[] {
  const dates: (string | null)[] = Array(sessionCount).fill(null);
  if (!weekDate || sessionCount === 0) return dates;
  const start = weekDate.slice(0, 10);
  const end = new Date(`${start}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  const endIso = end.toISOString().slice(0, 10);
  const later = schedule
    .filter((e) => e.type !== "office-hours" && e.date > start && e.date < endIso)
    .map((e) => e.date)
    .sort();
  dates[0] = start;
  for (let i = 1; i < sessionCount; i++) dates[i] = later[i - 1] ?? null;
  return dates;
}

/** "Session 2 · Thu, Nov 12", or "Session 2" when the date isn't known. */
export function sessionLabel(index: number, date: string | null): string {
  const base = `Session ${index + 1}`;
  return date
    ? `${base} · ${formatCohortDate(date, { weekday: "short", month: "short", day: "numeric" })}`
    : base;
}
