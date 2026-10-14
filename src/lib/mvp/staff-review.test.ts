import { describe, expect, it } from "vitest";
import { evaluateMvpAttention } from "./attention";
import type { MvpCheckInEvaluation } from "./check-ins";
import { buildMvpStaffReview } from "./staff-review";
import type { MvpAttentionReason, MvpProgramRow } from "./types";

// Synthetic server inputs exercise aggregation without creating database data.
function course(id: string, totalParticipants: number | null = 2): MvpProgramRow {
  return { id, programId: id, programName: id, courseSlug: "shared-slug", courseName: "Course",
    cohortId: null, cohortName: null, status: "active", startDate: null, endDate: null,
    totalParticipants, enrolledBeforeStart: null, started: null, active: null, completed: null,
    attendanceRate: null, progressRate: null, completionRate: null, surveyResponseRate: null,
    learnersNeedingCheckIn: null };
}
function evaluation(programRowId: string, learnerId: string, value: number | null = 2,
  reason: MvpAttentionReason = "missed_sessions"): MvpCheckInEvaluation {
  return { ...evaluateMvpAttention(learnerId, programRowId, [{ id: reason, reason, threshold: 2 }], {
    [reason]: { value, evidence: [{ sourceRecordId: "private-record", label: "Private evidence", href: null }] },
  }, new Date("2026-10-13T12:00:00Z")), learnerId, programRowId, unavailableReason: null };
}

describe("staff-review aggregates", () => {
  it("keeps verified flags when another learner cannot be evaluated", () => {
    const result = buildMvpStaffReview([course("a")], [evaluation("a", "one"), evaluation("a", "two", null)]);
    expect(result.coursesWithVerifiedFlags).toBe(1);
    expect(result.flaggedCourses[0].verifiedLearnerCount).toBe(1);
    expect(result.incompleteCourseCount).toBe(1);
  });
  it("deduplicates learners and reasons without combining different course rows", () => {
    const a = evaluation("a", "one");
    const result = buildMvpStaffReview([course("a", 1), course("b", 1)], [a, a,
      evaluation("a", "one", 2, "missing_required_submission"), evaluation("b", "one")]);
    expect(result.coursesWithVerifiedFlags).toBe(2);
    expect(result.flaggedCourses.map(row => row.verifiedLearnerCount)).toEqual([1, 1]);
    expect(result.flaggedCourses[0].reasons).toEqual([
      { reason: "missed_sessions", learnerCount: 1 }, { reason: "missing_required_submission", learnerCount: 1 },
    ]);
  });
  it("ignores evaluations outside the selected course rows and leaks no learner evidence", () => {
    const result = buildMvpStaffReview([course("a", 1)], [evaluation("a", "secret-learner"), evaluation("other", "secret-other")]);
    expect(result.courses).toHaveLength(1);
    const json = JSON.stringify(result);
    for (const secret of ["secret-learner", "secret-other", "private-record", "Private evidence", "learnerId", "href"]) {
      expect(json).not.toContain(secret);
    }
  });
  it("distinguishes zero flags from unavailable or missing evaluations", () => {
    const result = buildMvpStaffReview([course("empty", 0), course("clear", 1), course("missing", 1), course("unknown", null)],
      [evaluation("clear", "one", 0)]);
    expect(result.courses.map(row => row.evaluationComplete)).toEqual([true, true, false, false]);
    expect(result.coursesWithVerifiedFlags).toBe(0);
    expect(result.incompleteCourseCount).toBe(2);
  });
  it("does not count flags without supporting evidence", () => {
    const item = evaluation("a", "one");
    item.attentionFlags[0].evidence = [{ sourceRecordId: " ", label: "Unverified", href: null }];
    const result = buildMvpStaffReview([course("a", 1)], [item]);
    expect(result.coursesWithVerifiedFlags).toBe(0);
    expect(result.incompleteCourseCount).toBe(1);
  });
  it("retains verified flags but marks incomplete rules on that same learner", () => {
    const item = evaluation("a", "one");
    item.unevaluatedRuleIds.push("assessment");
    const result = buildMvpStaffReview([course("a", 1)], [item]);
    expect(result.flaggedCourses[0].verifiedLearnerCount).toBe(1);
    expect(result.incompleteCourseCount).toBe(1);
  });
  it("orders courses by verified learner count with stable ties", () => {
    const result = buildMvpStaffReview([course("c", 1), course("b"), course("a", 1)],
      [evaluation("c", "one"), evaluation("b", "one"), evaluation("b", "two"), evaluation("a", "one")]);
    expect(result.flaggedCourses.map(row => row.id)).toEqual(["b", "a", "c"]);
  });
  it("preserves the available cohort identity and handles an empty selection", () => {
    const row = { ...course("a", 0), cohortId: "cohort-a", cohortName: "Fall" };
    expect(buildMvpStaffReview([row], []).courses[0]).toMatchObject({ cohortId: "cohort-a", cohortName: "Fall" });
    expect(buildMvpStaffReview([], [])).toEqual({ courses: [], flaggedCourses: [], coursesWithVerifiedFlags: 0, incompleteCourseCount: 0 });
  });
});
