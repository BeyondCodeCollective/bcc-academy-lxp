import { addDays } from "@/lib/ical";
import { formatCohortDate } from "@/lib/utils";

type DatedUnit = { date?: string };

/**
 * "Tue & Thu" — the weekdays a cohort actually meets, read off its dated units.
 *
 * More useful than the abstract "2×/week", and it's the same information the
 * learner needs to block out their calendar. Falls back to the cadence when a
 * track has no dated units, or meets on too many days to list.
 */
export function meetingDaysLabel(
  units: DatedUnit[],
  unitLower: string,
  sessionsPerWeek: number,
): string {
  if (unitLower === "day") return "Daily";
  const days = [
    ...new Set(
      units
        .filter((u) => u.date)
        .map((u) => formatCohortDate(u.date!, { weekday: "short" }, "en-US")),
    ),
  ];
  if (days.length > 0 && days.length <= 3) return days.join(" & ");
  return sessionsPerWeek > 1 ? `${sessionsPerWeek}×/week` : "1×/week";
}

/**
 * "Aug 3–7" for the first full Mon–Fri that has no session in it.
 *
 * A cohort's break week is invisible in a list of dates — you only notice it
 * as a gap. Returns null when the schedule runs straight through.
 */
export function breakWeekLabel(units: DatedUnit[]): string | null {
  const dates = units
    .filter((u) => u.date)
    .map((u) => u.date!.slice(0, 10))
    .sort();

  for (let i = 0; i < dates.length - 1; i++) {
    // The Monday strictly after this session. getUTCDay: Sun=0 … Sat=6.
    const dow = new Date(`${dates[i]}T12:00:00Z`).getUTCDay();
    const daysToNextMonday = ((8 - dow) % 7) || 7;
    const monday = addDays(dates[i], daysToNextMonday);
    const friday = addDays(monday, 4);
    // A full working week clears before the next session meets.
    if (friday < dates[i + 1]) {
      const from = formatCohortDate(monday, { month: "short", day: "numeric" }, "en-US");
      const to = formatCohortDate(friday, { day: "numeric" }, "en-US");
      return `${from}–${to}`;
    }
  }
  return null;
}
