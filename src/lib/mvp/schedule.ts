import { expectedSessionsFor, unitHasArrived, type TrackLike } from "@/lib/attendance/compute";
import type { MvpSessionSlot } from "./milestones";

// Supply a resolved course configuration, including database overrides.
// Explicit start slots identify kickoff/first session; other labeled extras
// (such as exams) must not be inferred to be kickoff sessions.
export type MvpScheduleInput = {
  track: (TrackLike & { startDateTbd?: boolean; selfPaced?: boolean }) | null;
  asOf: Date;
  verifiedStartSessions: MvpSessionSlot[] | null;
  confirmedHeldSessions: MvpSessionSlot[] | null;
};

// Scheduled sessions are expectations, not evidence that teaching occurred.
// Null means unavailable; an empty list means no applicable sessions.
export type MvpSchedule = {
  startSessions: MvpSessionSlot[] | null;
  scheduledRequiredSessions: MvpSessionSlot[] | null;
  heldRequiredSessions: MvpSessionSlot[] | null;
  unavailableReason: string | null;
};

function key(slot: MvpSessionSlot): string {
  return `${slot.weekNumber}:${slot.sessionNumber}`;
}

function unique(slots: MvpSessionSlot[]): MvpSessionSlot[] {
  return [...new Map(slots.map((slot) => [key(slot), slot])).values()];
}

function validDate(value: string): boolean {
  const day = value.slice(0, 10);
  const parsed = new Date(`${day}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}

// Reuse the LXP's Eastern-time and session-per-unit rules. Callers must
// provide the same asOf snapshot for every course in a dashboard request.
export function buildMvpSchedule(input: MvpScheduleInput): MvpSchedule {
  const { track, asOf, verifiedStartSessions, confirmedHeldSessions } = input;
  const unavailable = (reason: string): MvpSchedule => ({
    startSessions: null,
    scheduledRequiredSessions: null,
    heldRequiredSessions: null,
    unavailableReason: reason,
  });

  if (!Number.isFinite(asOf.getTime())) throw new Error("Invalid schedule reference date.");
  if (!track) return unavailable("Course schedule is unavailable.");
  if (track.selfPaced) return unavailable("Live-session attendance does not apply to this self-paced course.");
  if (track.startDateTbd) return unavailable("Course start date is not confirmed.");
  if (!validDate(track.startDate)) return unavailable("Course start date is missing or invalid.");
  if (!Number.isInteger(track.totalWeeks) || track.totalWeeks <= 0 ||
      !Number.isInteger(track.sessionsPerWeek) || track.sessionsPerWeek <= 0) {
    return unavailable("Course session counts are missing or invalid.");
  }

  const summaries = track.weekSummaries ?? [];
  if (summaries.some((unit) => unit.date && !validDate(unit.date))) {
    return unavailable("A course session date is invalid.");
  }
  if (summaries.some((unit) => unit.date) && summaries.some((unit) => !unit.date)) {
    return unavailable("The dated course schedule is incomplete.");
  }

  const scheduledRequiredSessions = unique(expectedSessionsFor(track, asOf).map((slot) => ({
    weekNumber: slot.week,
    sessionNumber: slot.session,
    label: `${track.unitLabel ?? "Week"} ${slot.week}, session ${slot.session}`,
  })));
  const scheduledKeys = new Set(scheduledRequiredSessions.map(key));

  // Confirmed held records can narrow the expected schedule but never add
  // future sessions or optional extras to the attendance denominator.
  const heldRequiredSessions = confirmedHeldSessions === null ? null : unique(
    confirmedHeldSessions.filter((slot) => scheduledKeys.has(key(slot))),
  );
  const startSessions = verifiedStartSessions === null ? null : unique(
    verifiedStartSessions.filter((slot) => unitHasArrived(track, slot.weekNumber, asOf)),
  );

  return {
    startSessions,
    scheduledRequiredSessions,
    heldRequiredSessions,
    unavailableReason: confirmedHeldSessions === null
      ? "Session delivery has not been verified."
      : verifiedStartSessions === null ? "Kickoff/first-session mapping has not been verified." : null,
  };
}
