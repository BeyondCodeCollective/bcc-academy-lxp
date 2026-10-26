import { describe, expect, it } from "vitest";
import { countMvpActiveLearners, evaluateMvpActiveLearner, type MvpActiveEvidence, type MvpActiveRule } from "./active-learners";

const cohort: MvpActiveRule = { kind: "cohort", attendanceThreshold: 80, submissionsRequired: false };
const evidence: MvpActiveEvidence = {
  eventAttended: null, attendedRequiredSessions: 4, heldRequiredSessions: 5,
  attendanceFinalized: true, requiredWorkOnTime: null,
};

describe("program-specific active learner evaluation", () => {
  it("qualifies at exactly 80% of sessions held so far", () => {
    expect(evaluateMvpActiveLearner(cohort, evidence).active).toBe(true);
  });
  it("does not round a learner up to the attendance threshold", () => {
    expect(evaluateMvpActiveLearner(cohort, { ...evidence, attendedRequiredSessions: 1999, heldRequiredSessions: 2500 }).active).toBe(false);
  });
  it("accepts a program-specific attendance threshold", () => {
    expect(evaluateMvpActiveLearner({ ...cohort, attendanceThreshold: 90 }, evidence).active).toBe(false);
  });
  it("does not infer inactivity from incomplete attendance", () => {
    expect(evaluateMvpActiveLearner(cohort, { ...evidence, attendedRequiredSessions: 1, attendanceFinalized: false }).active).toBeNull();
  });
  it.each([null, 0, -1, 2.5, NaN])("rejects an unavailable or invalid denominator %s", (held) => {
    expect(evaluateMvpActiveLearner(cohort, { ...evidence, heldRequiredSessions: held }).active).toBeNull();
  });
  it.each([true, false, null])("uses verified required-work status %s when applicable", (status) => {
    const result = evaluateMvpActiveLearner({ ...cohort, submissionsRequired: true }, { ...evidence, requiredWorkOnTime: status });
    expect(result.active).toBe(status);
    if (status === null) expect(result.unavailableReason).toContain("deadlines");
  });
  it.each([true, false, null])("single-event status follows verified attendance %s", (status) => {
    expect(evaluateMvpActiveLearner({ kind: "single_event" }, { ...evidence, eventAttended: status }).active).toBe(status);
  });
  it("does not guess a rule for an unconfigured program", () => {
    expect(evaluateMvpActiveLearner(null, evidence).active).toBeNull();
  });
  it.each([0, -1, 101, NaN])("rejects invalid configured threshold %s", (threshold) => {
    expect(() => evaluateMvpActiveLearner({ ...cohort, attendanceThreshold: threshold }, evidence)).toThrow();
  });
  it("does not report partial totals", () => {
    expect(countMvpActiveLearners([{ active: true, unavailableReason: null }, { active: null, unavailableReason: "Missing evidence" }])).toBeNull();
    expect(countMvpActiveLearners([{ active: true, unavailableReason: null }, { active: false, unavailableReason: null }])).toBe(1);
    expect(countMvpActiveLearners([])).toBe(0);
  });
});
