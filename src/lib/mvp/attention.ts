import type { MvpAttentionFlag, MvpAttentionReason, MvpLearnerRow } from "./types";

// Program configuration supplies thresholds. Assessment/progress cutoffs
// have no default because the framework did not approve numeric values.
export type MvpAttentionRule = {
  id: string;
  reason: MvpAttentionReason;
  threshold: number;
};
export type MvpAttentionObservation = {
  value: number | null;
  evidence: MvpAttentionFlag["evidence"];
};
export type MvpAttentionResult = Pick<MvpLearnerRow, "checkInStatus" | "attentionFlags"> & {
  unevaluatedRuleIds: string[];
};

// Values are confirmed missed-session counts, overdue mandatory-work counts,
// assessment percentages, or progress percentages. Missing check-ins alone
// are not confirmed absences; the data adapter must establish eligibility.
export function evaluateMvpAttention(
  learnerId: string,
  programRowId: string,
  rules: MvpAttentionRule[],
  observations: Partial<Record<MvpAttentionReason, MvpAttentionObservation>>,
  asOf: Date,
): MvpAttentionResult {
  if (!Number.isFinite(asOf.getTime())) throw new Error("Invalid check-in evaluation date.");
  if (new Set(rules.map((rule) => rule.id)).size !== rules.length) {
    throw new Error("Check-in rule IDs must be unique.");
  }
  const attentionFlags: MvpAttentionFlag[] = [];
  const unevaluatedRuleIds: string[] = [];
  const labels: Record<MvpAttentionReason, string> = {
    missed_sessions: "Confirmed missed sessions",
    missing_required_submission: "Overdue mandatory submissions",
    low_assessment: "Assessment score",
    behind_expected_progress: "Self-guided progress",
  };

  for (const rule of rules) {
    const isCount = rule.reason === "missed_sessions" || rule.reason === "missing_required_submission";
    if (!Number.isFinite(rule.threshold) || rule.threshold < 0 ||
        (isCount && (!Number.isInteger(rule.threshold) || rule.threshold < 1)) ||
        (!isCount && rule.threshold > 100)) {
      throw new Error("Invalid check-in rule threshold.");
    }
    const observation = observations[rule.reason];
    const value = observation?.value;
    if (value == null || !Number.isFinite(value) || value < 0 ||
        (isCount && !Number.isInteger(value)) || (!isCount && value > 100)) {
      unevaluatedRuleIds.push(rule.id);
      continue;
    }
    const triggered = isCount ? value >= rule.threshold : value < rule.threshold;
    if (!triggered) continue;
    const evidence = observation!.evidence.filter((item) => item.sourceRecordId.trim() && item.label.trim());
    if (!evidence.length) {
      unevaluatedRuleIds.push(rule.id);
      continue;
    }
    attentionFlags.push({
      id: JSON.stringify([programRowId, learnerId, rule.id]),
      reason: rule.reason, ruleId: rule.id, detectedAt: asOf.toISOString(),
      explanation: `${labels[rule.reason]}: ${value}${isCount ? "" : "%"}; configured threshold: ${rule.threshold}${isCount ? "" : "%"}.`,
      evidence,
    });
  }
  return {
    checkInStatus: attentionFlags.length ? "flagged"
      : !rules.length || unevaluatedRuleIds.length ? "not_evaluated" : "no_flags",
    attentionFlags,
    unevaluatedRuleIds,
  };
}
