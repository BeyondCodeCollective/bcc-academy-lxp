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
  it("flags two confirmed absences with review IDs as evidence", () => {
    const result = evaluateMvpCourseCheckIns("program:course", "course", ["learner"], [], slots, asOf,
      { programId: "program", reviews: [review(1), review(2)] });
    expect(result.learnersNeedingCheckIn).toBe(1);
    expect(result.evaluations[0].attentionFlags[0].evidence.map((item) => item.sourceRecordId)).toEqual(["review-1", "review-2"]);
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
