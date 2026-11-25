import type { MvpScheduleInput } from "./schedule";
import { resolveMvpHeldSessions } from "./held-sessions";
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
  const held = resolveMvpHeldSessions(track, delivery, asOf);
  if (!track || held.heldRequiredSessions === null) {
    return unavailable(held.unavailableReason ?? "Schedule unavailable.");
  }
  if (held.remaining !== 0) {
    return unavailable("Not all required sessions have occurred and been marked completed.");
  }
  const required = new Set(held.heldRequiredSessions.map(slot =>
    `${slot.weekNumber}:${slot.sessionNumber}`,
  ));

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
