import type { MvpScheduleInput } from "./schedule";
import { buildMvpSchedule } from "./schedule";
import type { MvpAttendanceRecord } from "./milestones";
import type { MvpSessionDelivery } from "./course-performance";
import { calculateMvpPercentage } from "./metrics";

// This implements the framework's attendance-based course completion rule.
// It does not issue certificates or establish completion of a multi-course program.
export type MvpCompletionResult = {
  completed: number | null;
  completionRate: number | null;
  completedLearnerIds: string[] | null;
  unavailableReason: string | null;
};

// Only a complete dated schedule with explicit delivery confirmation can
// establish eligibility. Missing schedules and ongoing courses remain unknown.
export function calculateMvpCompletion(
  track: MvpScheduleInput["track"],
  learnerIds: string[],
  records: MvpAttendanceRecord[],
  delivery: MvpSessionDelivery[],
  asOf: Date,
): MvpCompletionResult {
  const unavailable = (reason: string): MvpCompletionResult => ({
    completed: null, completionRate: null, completedLearnerIds: null,
    unavailableReason: reason,
  });
  const validation = buildMvpSchedule({
    track, asOf, verifiedStartSessions: null, confirmedHeldSessions: null,
  });
  if (!track || validation.scheduledRequiredSessions === null) {
    return unavailable(validation.unavailableReason ?? "Schedule unavailable.");
  }
  const units = track.weekSummaries ?? [];
  const teaching = units.filter((unit) => !unit.label);
  if (!units.length || units.some((unit) => !unit.date) ||
      teaching.length !== track.totalWeeks ||
      new Set(units.map((unit) => unit.week)).size !== units.length) {
    return unavailable("The full required course schedule has not been verified.");
  }
  const perUnit = track.unitLabel === "Session" ? 1 : track.sessionsPerWeek;
  if (perUnit > 3) return unavailable("Delivery records support at most three sessions per unit.");
  const required = new Set(teaching.flatMap((unit) =>
    Array.from({ length: perUnit }, (_, index) => `${unit.week}:${index + 1}`),
  ));
  const arrived = new Set(validation.scheduledRequiredSessions.map((slot) =>
    `${slot.weekNumber}:${slot.sessionNumber}`,
  ));
  const delivered = new Set(delivery.flatMap((unit) =>
    [unit.status, unit.status_2, unit.status_3].flatMap((status, index) =>
      status === "completed" ? [`${unit.week_number}:${index + 1}`] : [],
    ),
  ));
  if ([...required].some((slot) => !arrived.has(slot) || !delivered.has(slot))) {
    return unavailable("Not all required sessions have occurred and been marked completed.");
  }

  // Compare integer counts against 80% without rounding a learner up to
  // eligibility. Optional sessions and duplicate check-ins cannot add credit.
  const roster = [...new Set(learnerIds)];
  const attended = new Map(roster.map((id) => [id, new Set<string>()]));
  for (const record of records) {
    const slot = `${record.week_number}:${record.session_number}`;
    if (record.track === track.slug && required.has(slot)) {
      attended.get(record.student_id)?.add(slot);
    }
  }
  const completedLearnerIds = roster.filter((id) =>
    attended.get(id)!.size * 100 >= required.size * 80,
  );
  return {
    completed: completedLearnerIds.length,
    completionRate: calculateMvpPercentage(completedLearnerIds.length, roster.length),
    completedLearnerIds,
    unavailableReason: null,
  };
}
