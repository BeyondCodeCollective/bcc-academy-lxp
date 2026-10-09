// Program-specific adapters supply verified evidence. Unknown is distinct
// from inactive; no login activity or course-completion rule is substituted.
export type MvpActiveRule =
  | { kind: "single_event" }
  | { kind: "cohort"; attendanceThreshold: number; submissionsRequired: boolean };

export type MvpActiveEvidence = {
  eventAttended: boolean | null;
  attendedRequiredSessions: number | null;
  heldRequiredSessions: number | null;
  attendanceFinalized: boolean;
  // True requires the adapter to verify all applicable required work against
  // its actual due dates and approved grace period. Pending/unknown is null.
  requiredWorkOnTime: boolean | null;
};

export type MvpActiveResult = {
  active: boolean | null;
  unavailableReason: string | null;
};

// Use raw counts so a rounded 79.96% never qualifies as 80%. Positive
// evidence can establish activity; incomplete records cannot prove inactivity.
export function evaluateMvpActiveLearner(
  rule: MvpActiveRule | null,
  evidence: MvpActiveEvidence,
): MvpActiveResult {
  const unknown = (reason: string): MvpActiveResult => ({ active: null, unavailableReason: reason });
  const known = (active: boolean): MvpActiveResult => ({ active, unavailableReason: null });
  if (!rule) return unknown("No active-learner rule is configured for this offering.");
  if (rule.kind === "single_event") {
    return evidence.eventAttended === null
      ? unknown("Event attendance has not been verified.") : known(evidence.eventAttended);
  }
  if (!Number.isFinite(rule.attendanceThreshold) || rule.attendanceThreshold <= 0 || rule.attendanceThreshold > 100) {
    throw new Error("Active attendance threshold must be greater than zero and at most 100.");
  }
  const attended = evidence.attendedRequiredSessions;
  const held = evidence.heldRequiredSessions;
  if (attended === null || held === null || !Number.isInteger(attended) || !Number.isInteger(held) ||
      attended < 0 || held <= 0 || attended > held) {
    return unknown("A verified held-session denominator and attendance counts are required.");
  }
  if (attended * 100 < held * rule.attendanceThreshold) {
    return evidence.attendanceFinalized ? known(false)
      : unknown("Attendance is below the threshold, but records are not finalized.");
  }
  if (rule.submissionsRequired) {
    return evidence.requiredWorkOnTime === null
      ? unknown("Required submission deadlines, grace periods, or submission evidence are not yet verified.")
      : known(evidence.requiredWorkOnTime);
  }
  return known(true);
}

// Never present a partial active count as the full roster total.
export function countMvpActiveLearners(results: MvpActiveResult[]): number | null {
  return results.some((result) => result.active === null)
    ? null : results.filter((result) => result.active).length;
}
