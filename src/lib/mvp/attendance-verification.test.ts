import { describe, expect, it } from "vitest";
import { verifyMvpMissedSessions, type MvpAttendanceReview } from "./attendance-verification";
import { evaluateMvpCourseCheckIns } from "./check-ins";

// Synthetic review history only. No database connection or migration execution.
const asOf = new Date("2026-10-08T22:00:00Z");
const slots = [1, 2].map((weekNumber) => ({ weekNumber, sessionNumber: 1, label: `Session ${weekNumber}` }));
function review(week: number, overrides: Partial<MvpAttendanceReview> = {}): MvpAttendanceReview {
  return { id: `review-${week}`, revision: week, program_id: "program", track_slug: "course", student_id: "learner",
    week_number: week, session_number: 1, session_held_at: "2026-10-01T12:00:00Z",
    eligibility: "eligible", eligibility_basis: "Verified session roster reference", outcome: "absent",
    recorded_by: "staff", recorded_at: "2026-10-02T12:00:00Z", ...overrides };
}
const base = { programId: "program", courseSlug: "course", learnerId: "learner", heldRequiredSessions: slots,
  attendance: [], asOf };

describe("staff-verified absence evidence", () => {
  it("keeps absence, excused, unrecorded, present, and ineligible sessions distinct", () => {
    const heldRequiredSessions = [5, 3, 2, 1, 4, 1].map(weekNumber => ({ weekNumber, sessionNumber: 1, label: "Session" }));
    const result = verifyMvpMissedSessions({ ...base, heldRequiredSessions, reviews: [review(1),
      review(2, { outcome: "excused" }), review(4, { outcome: "present" }),
      review(5, { eligibility: "not_eligible", outcome: "unknown" })] });
    expect(result.sessionStates).toEqual(["verified_absent", "excused", "unrecorded", "verified_present", "not_eligible"].map((state, index) =>
      ({ weekNumber: index + 1, sessionNumber: 1, state })));
    expect(result.evidence).toHaveLength(1);
    expect(result.finalizedAttendance).toBeNull();
    expect(JSON.stringify(result.sessionStates)).not.toContain("staff");
  });
  it.each([
    { outcome: "unknown" as const }, { eligibility: "unknown" as const }, { eligibility_basis: null },
    { recorded_at: "invalid" }, { revision: 0 },
  ])("keeps incomplete evidence unresolved, not unrecorded or absent: %j", overrides => {
    const result = verifyMvpMissedSessions({ ...base, reviews: [review(1, overrides)] });
    expect(result.sessionStates?.map(row => row.state)).toEqual(["unresolved", "unrecorded"]);
  });
  it("does not call an unverified check-in unrecorded or a verified absence", () => {
    const attendance = [{ id: "c", student_id: "learner", track: "course", week_number: 1, session_number: 1, checked_in_at: null }];
    for (const reviews of [[], [review(1)]]) {
      expect(verifyMvpMissedSessions({ ...base, reviews, attendance }).sessionStates?.[0].state).toBe("unresolved");
    }
  });
  it("uses corrections as of the snapshot, not stale or ambiguous outcomes", () => {
    const correction = review(1, { id: "new", revision: 3, outcome: "excused" });
    expect(verifyMvpMissedSessions({ ...base, reviews: [review(1), correction] }).sessionStates?.[0].state).toBe("excused");
    expect(verifyMvpMissedSessions({ ...base, reviews: [review(1), correction, correction] }).sessionStates?.[0].state).toBe("unresolved");
    expect(verifyMvpMissedSessions({ ...base, reviews: [review(1), { ...correction, recorded_at: "2027-01-01T00:00:00Z" }] }).sessionStates?.[0].state).toBe("verified_absent");
  });
  it("ignores other scopes and future-only evidence when identifying unrecorded sessions", () => {
    const result = verifyMvpMissedSessions({ ...base, reviews: [review(1, { program_id: "other" }),
      review(1, { student_id: "other" }), review(1, { track_slug: "other" }),
      review(1, { recorded_at: "2027-01-01T00:00:00Z" })],
    attendance: [{ id: "future", student_id: "learner", track: "course", week_number: 1, session_number: 1, checked_in_at: "2027-01-01T00:00:00Z" }] });
    expect(result.sessionStates?.map(row => row.state)).toEqual(["unrecorded", "unrecorded"]);
  });
  it("distinguishes an unavailable schedule from a known empty one", () => {
    expect(verifyMvpMissedSessions({ ...base, heldRequiredSessions: null, reviews: [] }).sessionStates).toBeNull();
    expect(verifyMvpMissedSessions({ ...base, heldRequiredSessions: [], reviews: [] }).sessionStates).toEqual([]);
  });
  it("flags two confirmed absences with review IDs as evidence", () => {
    const result = evaluateMvpCourseCheckIns("program:course", "course", ["learner"], [], slots, asOf,
      { programId: "program", reviews: [review(1), review(2)] });
    expect(result.learnersNeedingCheckIn).toBe(1);
    expect(result.evaluations[0].attentionFlags[0].evidence.map((item) => item.sourceRecordId)).toEqual(["review-1", "review-2"]);
  });
  it("returns two confirmed absences with review IDs as evidence", () => {
    const result = verifyMvpMissedSessions({ ...base, reviews: [review(1), review(2)] });
    expect(result.value).toBe(2);
    expect(result.evidence.map((item) => item.sourceRecordId)).toEqual(["review-1", "review-2"]);
  });
  it("does not infer absence from missing reviews or positive check-ins", () => {
    expect(verifyMvpMissedSessions({ ...base, reviews: [] })).toMatchObject({ value: null, unknownSessions: 2 });
    expect(verifyMvpMissedSessions({ ...base, reviews: [review(1)] }).value).toBeNull();
  });
  it("requires only two proven absences to flag, but discloses other unknown sessions", () => {
    expect(verifyMvpMissedSessions({ ...base, heldRequiredSessions: [...slots, { weekNumber: 3, sessionNumber: 1, label: "Three" }],
      reviews: [review(1), review(2)] })).toMatchObject({ value: 2, unknownSessions: 1 });
  });
  it.each(["present", "excused"] as const)("does not count %s as absence", (outcome) => {
    expect(verifyMvpMissedSessions({ ...base, reviews: [review(1), review(2, { outcome })] }).value).toBe(1);
  });
  it("excludes learners confirmed not expected at a session", () => {
    expect(verifyMvpMissedSessions({ ...base, reviews: [review(1), review(2, { eligibility: "not_eligible", outcome: "unknown" })] }).value).toBe(1);
  });
  it.each([
    { program_id: "other" }, { student_id: "other" }, { track_slug: "other" }, { week_number: 4 },
    { eligibility_basis: null }, { recorded_by: "" }, { recorded_at: "invalid" }, { session_held_at: "2027-01-01T00:00:00Z" },
    { revision: -1 }, { eligibility: "unknown" as const },
  ])("does not accept unrelated or unverified evidence: %j", (overrides) => {
    expect(verifyMvpMissedSessions({ ...base, reviews: [review(1), review(2, overrides)] }).value).toBeNull();
  });
  it("uses the newest correction instead of retaining a superseded absence", () => {
    const correction = review(2, { id: "correction", revision: 3, outcome: "present" });
    expect(verifyMvpMissedSessions({ ...base, reviews: [correction, review(1), review(2)] }).value).toBe(1);
    expect(verifyMvpMissedSessions({ ...base, reviews: [review(1), review(2), { ...correction, outcome: "unknown" }] }).value).toBeNull();
  });
  it("evaluates only review history known at the requested time", () => {
    expect(verifyMvpMissedSessions({ ...base, reviews: [review(1), review(2),
      review(2, { id: "future", revision: 3, outcome: "present", recorded_at: "2026-10-09T00:00:00Z" })] }).value).toBe(2);
  });
  it("does not double-count duplicate slots or ambiguous review revisions", () => {
    expect(verifyMvpMissedSessions({ ...base, heldRequiredSessions: [...slots, ...slots], reviews: [review(1), review(2)] }).value).toBe(2);
    expect(verifyMvpMissedSessions({ ...base, reviews: [review(1), review(2), review(2)] }).value).toBeNull();
  });
  it("requires resolution when a confirmed absence conflicts with a check-in", () => {
    expect(verifyMvpMissedSessions({ ...base, reviews: [review(1), review(2)], attendance: [{
      id: "check-in", student_id: "learner", track: "course", week_number: 2, session_number: 1, checked_in_at: null,
    }] }).value).toBeNull();
  });
  it("requires a verified held-session schedule and valid evaluation date", () => {
    expect(verifyMvpMissedSessions({ ...base, heldRequiredSessions: null, reviews: [review(1), review(2)] }).value).toBeNull();
    expect(() => verifyMvpMissedSessions({ ...base, asOf: new Date("invalid"), reviews: [] })).toThrow();
  });
});
