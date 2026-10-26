import { buildMvpSchedule, type MvpScheduleInput } from "./schedule";
import type { MvpSessionDelivery } from "./course-performance";

// Remaining means required sessions not yet verified delivered, including
// overdue sessions. It is not simply the number of future calendar dates.
export function calculateMvpSessionsRemaining(track: MvpScheduleInput["track"], delivery: MvpSessionDelivery[], asOf: Date) {
  const unavailable = (reason: string) => ({ remaining: null, total: null, delivered: null, unavailableReason: reason });
  const schedule = buildMvpSchedule({ track, asOf, verifiedStartSessions: null, confirmedHeldSessions: null });
  if (!track || schedule.scheduledRequiredSessions === null) return unavailable(schedule.unavailableReason ?? "Schedule unavailable.");
  const units = track.weekSummaries ?? [];
  const teaching = units.filter((unit) => !unit.label);
  const perUnit = track.unitLabel === "Session" ? 1 : track.sessionsPerWeek;
  if (!units.length || units.some((unit) => !unit.date) || teaching.length !== track.totalWeeks ||
      new Set(units.map((unit) => unit.week)).size !== units.length || perUnit > 3) {
    return unavailable("A complete dated required-session schedule is needed.");
  }
  const arrived = new Set(schedule.scheduledRequiredSessions.map((slot) => `${slot.weekNumber}:${slot.sessionNumber}`));
  let delivered = 0;
  for (const unit of teaching) {
    for (let index = 0; index < perUnit; index++) {
      if (!arrived.has(`${unit.week}:${index + 1}`)) continue;
      const states = new Set(delivery.filter((row) => row.week_number === unit.week)
        .map((row) => [row.status, row.status_2, row.status_3][index]));
      if (states.size !== 1 || !["completed", "upcoming", "in_progress"].includes([...states][0])) {
        return unavailable("Past required sessions have missing or conflicting delivery status.");
      }
      if (states.has("completed")) delivered++;
    }
  }
  const total = teaching.length * perUnit;
  return { remaining: total - delivered, total, delivered, unavailableReason: null };
}
