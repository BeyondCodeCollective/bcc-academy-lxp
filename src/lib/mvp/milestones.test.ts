import { describe, expect, it } from "vitest";
import {
  calculateAttendanceMilestone,
  type MvpAttendanceInput,
  type MvpAttendanceRecord,
} from "./milestones";

// Fabricated records exercise attendance rules without accessing
// Supabase or using real learner information.
function record(
  overrides: Partial<MvpAttendanceRecord> = {},
): MvpAttendanceRecord {
  return {
    id: "attendance-a",
    student_id: "learner-a",
    track: "example-course",
    week_number: 1,
    session_number: 1,
    checked_in_at: "2026-09-15T14:00:00.000Z",
    ...overrides,
  };
}

function input(
  overrides: Partial<MvpAttendanceInput> = {},
): MvpAttendanceInput {
  return {
    learnerId: "learner-a",
    courseSlug: "example-course",
    records: [],
    startSessions: [
      { weekNumber: 0, sessionNumber: 1, label: "Kickoff" },
      { weekNumber: 1, sessionNumber: 1, label: "First session" },
    ],
    heldRequiredSessions: [
      { weekNumber: 1, sessionNumber: 1, label: "Session one" },
      { weekNumber: 1, sessionNumber: 2, label: "Session two" },
    ],
    ...overrides,
  };
}

// Started means documented kickoff or first-session attendance.
// Later attendance alone does not establish that specific milestone.
describe("start evidence", () => {
  it("recognizes kickoff attendance separately from required sessions", () => {
    const result = calculateAttendanceMilestone(
      input({
        records: [record({ week_number: 0 })],
      }),
    );

    expect(result.hasStartEvidence).toBe(true);
    expect(result.startEvidenceRecordIds).toEqual(["attendance-a"]);
    expect(result.attendedRequiredSessions).toBe(0);
  });

  it("recognizes first-session attendance", () => {
    const result = calculateAttendanceMilestone(
      input({ records: [record()] }),
    );

    expect(result.hasStartEvidence).toBe(true);
    expect(result.attendanceRate).toBe(50);
  });

  it("does not treat later attendance as first-session evidence", () => {
    const result = calculateAttendanceMilestone(
      input({
        records: [record({ session_number: 2 })],
      }),
    );

    expect(result.hasStartEvidence).toBe(false);
    expect(result.attendanceRate).toBe(50);
  });

  it("keeps start evidence unknown when the start schedule is missing", () => {
    const result = calculateAttendanceMilestone(
      input({ startSessions: null, records: [record()] }),
    );

    expect(result.hasStartEvidence).toBeNull();
    expect(result.startEvidenceRecordIds).toEqual([]);
  });
});

// Attendance counts distinct eligible sessions for the selected learner
// and course. Optional or future sessions do not inflate the numerator.
describe("attendance calculation", () => {
  it("counts duplicate check-ins only once per session", () => {
    const result = calculateAttendanceMilestone(
      input({
        records: [
          record(),
          record({ id: "duplicate-record" }),
          record({ id: "second-session", session_number: 2 }),
        ],
      }),
    );

    expect(result.attendedRequiredSessions).toBe(2);
    expect(result.heldRequiredSessions).toBe(2);
    expect(result.attendanceRate).toBe(100);
  });

  it("ignores records for another learner or course", () => {
    const result = calculateAttendanceMilestone(
      input({
        records: [
          record({ student_id: "learner-b" }),
          record({ id: "other-course", track: "another-course" }),
        ],
      }),
    );

    expect(result.hasStartEvidence).toBe(false);
    expect(result.attendedRequiredSessions).toBe(0);
    expect(result.attendanceRate).toBe(0);
  });

  it("excludes sessions outside the held-required schedule", () => {
    const result = calculateAttendanceMilestone(
      input({
        records: [
          record(),
          record({ id: "future-session", week_number: 8 }),
        ],
      }),
    );

    expect(result.attendedRequiredSessions).toBe(1);
    expect(result.attendanceRate).toBe(50);
  });

  it("does not double-count duplicate schedule entries", () => {
    const session = {
      weekNumber: 1,
      sessionNumber: 1,
      label: "First session",
    };

    const result = calculateAttendanceMilestone(
      input({
        records: [record()],
        heldRequiredSessions: [session, session],
      }),
    );

    expect(result.heldRequiredSessions).toBe(1);
    expect(result.attendanceRate).toBe(100);
  });

  it("returns unknown attendance when the required schedule is missing", () => {
    const result = calculateAttendanceMilestone(
      input({ heldRequiredSessions: null }),
    );

    expect(result.attendedRequiredSessions).toBeNull();
    expect(result.heldRequiredSessions).toBeNull();
    expect(result.attendanceRate).toBeNull();
  });

  it("returns no rate when no required sessions have been held", () => {
    const result = calculateAttendanceMilestone(
      input({ heldRequiredSessions: [] }),
    );

    expect(result.attendedRequiredSessions).toBe(0);
    expect(result.heldRequiredSessions).toBe(0);
    expect(result.attendanceRate).toBeNull();
  });
});