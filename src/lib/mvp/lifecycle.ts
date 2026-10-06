import { easternDayKey } from "@/lib/utils";
import type { MvpScheduleInput } from "./schedule";
import type { MvpProgramStatus } from "./types";

// Lifecycle describes the offering, not any individual learner's completion.
// A course past its scheduled end remains unknown until delivery is verified.
export function resolveMvpLifecycle(
  track: MvpScheduleInput["track"],
  asOf: Date,
  deliveryComplete: boolean,
): { status: MvpProgramStatus; startDate: string | null; endDate: string | null } {
  const unknown = { status: "unknown" as const, startDate: null, endDate: null };
  if (!Number.isFinite(asOf.getTime())) throw new Error("Invalid lifecycle reference date.");
  if (!track || track.startDateTbd || track.selfPaced) return unknown;
  function day(value: string | undefined): string | null {
    if (!value) return null;
    const result = value.slice(0, 10);
    const date = new Date(`${result}T12:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(result) && Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === result ? result : null;
  }
  const configuredStart = day(track.startDate);
  if (!configuredStart) return unknown;
  const units = track.weekSummaries ?? [];
  const dates = units.map((unit) => day(unit.date));
  const dated = dates.filter((value): value is string => value !== null).sort();
  const startDate = dated.length ? [configuredStart, dated[0]].sort()[0] : configuredStart;
  const fullSchedule = units.length > 0 && dates.every(Boolean) &&
    units.filter((unit) => !unit.label).length === track.totalWeeks &&
    new Set(units.map((unit) => unit.week)).size === units.length;
  const endDate = fullSchedule ? dated[dated.length - 1] : null;
  const today = easternDayKey(asOf);
  if (startDate > today) return { status: "starting_soon", startDate, endDate };
  if (!endDate) return { status: "unknown", startDate, endDate };
  if (today <= endDate) return { status: "active", startDate, endDate };
  return { status: deliveryComplete ? "completed" : "unknown", startDate, endDate };
}

// Counts current course enrollments before scheduled start. This is an
// enrollment total, not unique people and not progress against a grant target.
export function countMvpUpcomingEnrollments(
  rows: Array<{ status: MvpProgramStatus; enrolledBeforeStart: number | null }>,
): number | null {
  if (rows.some((row) => row.status === "unknown" ||
    (row.status === "starting_soon" && row.enrolledBeforeStart === null))) return null;
  return rows.reduce((sum, row) => sum + (row.status === "starting_soon" ? row.enrolledBeforeStart ?? 0 : 0), 0);
}
