import { buildMvpSchedule, type MvpScheduleInput } from "./schedule";
import type { MvpSessionSlot } from "./milestones";

export type MvpSessionDelivery = {
  week_number: number;
  status: string;
  status_2: string;
  status_3: string;
};

// Shared validation for every MVP held-session consumer. Only elapsed required
// sessions with a consistent completed status establish delivery. Identical rows
// are deduplicated; conflicting or missing elapsed statuses invalidate the result.
export function resolveMvpHeldSessions(track: MvpScheduleInput["track"], delivery: MvpSessionDelivery[], asOf: Date) {
  const unavailable = (reason: string) => ({ heldRequiredSessions: null as MvpSessionSlot[] | null, remaining: null, total: null, delivered: null, unavailableReason: reason });
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
  const heldRequiredSessions: MvpSessionSlot[] = [];
  for (const unit of teaching) {
    for (let index = 0; index < perUnit; index++) {
      if (!arrived.has(`${unit.week}:${index + 1}`)) continue;
      const states = new Set(delivery.filter((row) => row.week_number === unit.week)
        .map((row) => [row.status, row.status_2, row.status_3][index]));
      if (states.size !== 1 || !["completed", "upcoming", "in_progress"].includes([...states][0])) {
        return unavailable("Past required sessions have missing or conflicting delivery status.");
      }
      if (states.has("completed")) heldRequiredSessions.push({
        weekNumber: unit.week, sessionNumber: index + 1, label: `Session ${unit.week}.${index + 1}`,
      });
    }
  }
  const total = teaching.length * perUnit;
  const delivered = heldRequiredSessions.length;
  return { heldRequiredSessions, remaining: total - delivered, total, delivered, unavailableReason: null };
}
