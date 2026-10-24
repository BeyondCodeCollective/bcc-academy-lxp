import { describe, expect, it } from "vitest";
import { calculateMvpCoursePerformance, getMvpStartSlots } from "./course-performance";
import type { MvpScheduleInput } from "./schedule";
import type { MvpAttendanceReview } from "./attendance-verification";

// A session-based course has a kickoff, two teaching sessions, and an exam.
const track: NonNullable<MvpScheduleInput["track"]> = {
  slug: "course", name: "Course", shortName: "Course", totalWeeks: 2,
  sessionsPerWeek: 2, unitLabel: "Session", startDate: "2026-10-01",
  lastSessionDayOffset: 0,
  weekSummaries: [
    { week: 0, date: "2026-10-01", label: "Kickoff" },
    { week: 1, date: "2026-10-02" },
    { week: 2, date: "2026-10-05" },
    { week: 3, date: "2026-10-06", label: "Exam" },
  ],
};
const asOf = new Date("2026-10-03T18:00:00Z");

// Reviewed evidence is synthetic and never written to a database.
const reviewed: MvpAttendanceReview = { id: "review", revision: 1, program_id: "p", track_slug: "course",
  student_id: "a", week_number: 1, session_number: 1, session_held_at: "2026-10-02T12:00:00Z",
  eligibility: "eligible", eligibility_basis: "Session roster", outcome: "absent", recorded_by: "staff",
  recorded_at: "2026-10-02T15:00:00Z" };
const delivered = [{ week_number: 1, status: "completed", status_2: "upcoming", status_3: "upcoming" }];
const cohortRule = { kind: "cohort" as const, attendanceThreshold: 80, submissionsRequired: false };
function withReviews(reviews: MvpAttendanceReview[]) {
  return calculateMvpCoursePerformance(track, ["a"], [], delivered, asOf, "p:course", cohortRule,
    new Map(), { programId: "p", reviews });
}

describe("course performance integration", () => {
  it("keeps recorded attendance distinct from reviewed active eligibility", () => {
    const present = withReviews([{ ...reviewed, outcome: "present" }]);
    expect(present).toMatchObject({ active: 1, attendanceQualified: 0, attendanceRate: 0 });
    const absent = withReviews([reviewed]);
    expect(absent).toMatchObject({ active: 0, attendanceQualified: 0, attendanceRate: 0 });
    expect(withReviews([])).toMatchObject({ active: null, attendanceQualified: 0, attendanceRate: 0 });
  });
  it("uses finalized absence to establish inactive rather than unknown", () => {
    expect(withReviews([]).active).toBeNull();
    expect(withReviews([reviewed]).activeByLearner.get("a")).toBe(false);
    expect(withReviews([reviewed]).active).toBe(0);
  });
  it("uses reviewed presence and the latest correction without requiring a check-in", () => {
    const correction = { ...reviewed, id: "correction", revision: 2, outcome: "present" as const };
    expect(withReviews([reviewed, correction]).active).toBe(1);
    expect(withReviews([correction, reviewed]).active).toBe(1);
    expect(withReviews([reviewed, { ...correction, outcome: "unknown" }]).active).toBeNull();
    expect(withReviews([reviewed, { ...correction, recorded_at: "2026-10-04T00:00:00Z" }]).active).toBe(0);
  });
  it.each([
    { program_id: "other" }, { student_id: "other" }, { track_slug: "other" },
    { recorded_by: "" }, { recorded_at: "invalid" }, { eligibility_basis: null },
    { outcome: "excused" as const }, { eligibility: "not_eligible" as const, outcome: "unknown" as const },
  ])("does not finalize active status from unrelated or unresolved evidence %j", overrides => {
    expect(withReviews([{ ...reviewed, ...overrides }]).active).toBeNull();
  });
  it("rejects duplicate revisions, conflicting check-ins, and ambiguous delivery", () => {
    expect(withReviews([reviewed, reviewed]).active).toBeNull();
    const records = [{ id: "check-in", student_id: "a", track: "course", week_number: 1, session_number: 1, checked_in_at: null }];
    expect(calculateMvpCoursePerformance(track, ["a"], records, delivered, asOf, "p:course", cohortRule,
      new Map(), { programId: "p", reviews: [reviewed] }).active).toBeNull();
    expect(calculateMvpCoursePerformance(track, ["a"], [], [...delivered, ...delivered], asOf, "p:course", cohortRule,
      new Map(), { programId: "p", reviews: [reviewed] }).active).toBeNull();
  });
  it("requires complete review coverage and does not publish a partial roster count", () => {
    expect(calculateMvpCoursePerformance(track, ["a", "b"], [], delivered, asOf, "p:course", cohortRule,
      new Map(), { programId: "p", reviews: [reviewed] }).active).toBeNull();
    const later = new Date("2026-10-07T18:00:00Z");
    expect(calculateMvpCoursePerformance(track, ["a"], [], [...delivered, { ...delivered[0], week_number: 2 }], later,
      "p:course", cohortRule, new Map(), { programId: "p", reviews: [reviewed] }).active).toBeNull();
  });
  it("keeps required work mandatory after reviewed presence and handles event attendance", () => {
    const reviews = [{ ...reviewed, outcome: "present" as const }];
    expect(calculateMvpCoursePerformance(track, ["a"], [], delivered, asOf, "p:course",
      { ...cohortRule, submissionsRequired: true }, new Map(), { programId: "p", reviews }).active).toBeNull();
    for (const outcome of ["present", "absent"] as const) {
      expect(calculateMvpCoursePerformance(track, ["a"], [], delivered, asOf, "p:course",
        { kind: "single_event" }, new Map(), { programId: "p", reviews: [{ ...reviewed, outcome }] }).active)
        .toBe(outcome === "present" ? 1 : 0);
    }
  });
  it("counts 80% of held sessions, excluding future sessions and duplicate evidence", () => {
    const longTrack = { ...track, totalWeeks: 6, weekSummaries: Array.from({ length: 6 }, (_, index) =>
      ({ week: index + 1, date: `2026-10-${String(index + 1).padStart(2, "0")}` })) };
    const records = [1, 2, 3, 4, 4, 6].map((week, index) => ({ id: `r${index}`, student_id: "a", track: "course",
      week_number: week, session_number: 1, checked_in_at: null }));
    const delivery = [1, 2, 3, 4, 5, 6].map((week) => ({ week_number: week, status: "completed", status_2: "upcoming", status_3: "upcoming" }));
    const result = calculateMvpCoursePerformance(longTrack, ["a", "a"], records, delivery,
      new Date("2026-10-05T23:00:00Z"), "p:course", { kind: "cohort", attendanceThreshold: 80, submissionsRequired: false });
    expect(result.attendanceQualified).toBe(1);
    expect(result.active).toBe(1);
  });
  it("keeps required-work eligibility unknown even when attendance qualifies", () => {
    const result = calculateMvpCoursePerformance(track, ["a"], [{ id: "r", student_id: "a", track: "course",
      week_number: 1, session_number: 1, checked_in_at: null }],
      [{ week_number: 1, status: "completed", status_2: "upcoming", status_3: "upcoming" }], asOf, "p:course",
      { kind: "cohort", attendanceThreshold: 80, submissionsRequired: true });
    expect(result.attendanceQualified).toBe(1);
    expect(result.active).toBeNull();
    expect(result.activeUnavailableReason).toContain("submission");
  });
  it("does not infer an active policy from attendance alone", () => {
    const result = calculateMvpCoursePerformance(track, ["a"], [], [], asOf);
    expect(result.attendanceQualified).toBeNull();
    expect(result.active).toBeNull();
    expect(result.activeUnavailableReason).toContain("not configured");
  });
  it("maps kickoff and first teaching session but never the exam", () => {
    expect(getMvpStartSlots(track)?.map((slot) => slot.weekNumber)).toEqual([0, 1]);
  });
  it("requires a precise start mapping for multi-session weekly courses", () => {
    expect(getMvpStartSlots({ ...track, unitLabel: "Week" })).toBeNull();
  });
  it("aggregates attendance over explicitly completed sessions and deduplicated learners", () => {
    const result = calculateMvpCoursePerformance(track, ["a", "b", "a"], [{
      id: "attendance", student_id: "a", track: "course", week_number: 1,
      session_number: 1, checked_in_at: null,
    }], [{ week_number: 1, status: "completed", status_2: "upcoming", status_3: "upcoming" }], asOf);
    expect(result).toMatchObject({ started: 1, attendanceRate: 50, startedLearnerIds: ["a"] });
  });
  it("does not call missing delivery metadata zero attendance", () => {
    expect(calculateMvpCoursePerformance(track, ["a"], [], [], asOf).attendanceRate).toBeNull();
  });
  it("does not infer a completion or attendance rate from future delivery flags", () => {
    const result = calculateMvpCoursePerformance(track, ["a"], [], [
      { week_number: 2, status: "completed", status_2: "upcoming", status_3: "upcoming" },
    ], asOf);
    expect(result.attendanceRate).toBeNull();
  });
});
