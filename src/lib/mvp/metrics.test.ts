// Handles all the differences between unique learners and program participations, as well as the
// distinction between a real zero and unavailable data. This is the only place where the MVP metrics
// are calculated, so it is the only place that needs to be tested.
import { describe, expect, it } from "vitest";
import {
  calculateMvpPercentage,
  calculateMvpSummary,
} from "./metrics";
import type { MvpLearnerRow, MvpProgramRow } from "./types";

// Fabricated program and learner records keep these tests independent
// of Supabase and real participant information.
function program(
  overrides: Partial<MvpProgramRow> = {},
): MvpProgramRow {
  return {
    id: "offering-a",
    programId: "program-a",
    programName: "Example program",
    courseSlug: "example-course",
    courseName: "Example course",
    cohortId: null,
    cohortName: null,
    status: "active",
    startDate: null,
    endDate: null,
    totalParticipants: null,
    enrolledBeforeStart: null,
    started: null,
    active: null,
    completed: null,
    attendanceRate: null,
    progressRate: null,
    completionRate: null,
    surveyResponseRate: null,
    learnersNeedingCheckIn: null,
    ...overrides,
  };
}

function learner(
  overrides: Partial<MvpLearnerRow> = {},
): MvpLearnerRow {
  return {
    learnerId: "learner-a",
    learnerName: "Example learner",
    programRowId: "offering-a",
    location: { zip: null, city: null, state: null },
    startedAt: null,
    completedAt: null,
    isActive: null,
    attendanceRate: null,
    progressRate: null,
    lastMeaningfulActivityAt: null,
    checkInStatus: "not_evaluated",
    attentionFlags: [],
    ...overrides,
  };
}

const completeCoverage = {
  startsComplete: true,
  completionsComplete: true,
  upcomingEnrollmentsComplete: true,
};

const milestoneDate = "2026-09-15T14:00:00.000Z";

// Unique people are counted once across programs. Participation counts
// distinguish programs without multiplying a person's courses within one program.
describe("calculateMvpSummary", () => {
  it("separates unique learners from program participations", () => {
    const programs = [
      program(),
      program({ id: "offering-b", courseSlug: "second-course" }),
      program({ id: "offering-c", programId: "program-b" }),
    ];

    const learners = programs.map((offering) =>
      learner({
        programRowId: offering.id,
        startedAt: milestoneDate,
        completedAt: milestoneDate,
      }),
    );

    const result = calculateMvpSummary(
      learners,
      programs,
      completeCoverage,
    );

    expect(result.uniqueLearnersStarted).toBe(1);
    expect(result.uniqueLearnersCompleted).toBe(1);
    expect(result.programParticipationsStarted).toBe(2);
    expect(result.programParticipationsCompleted).toBe(2);
  });

  it("does not count enrollment alone as a start or completion", () => {
    const result = calculateMvpSummary(
      [learner()],
      [program()],
      completeCoverage,
    );

    expect(result.uniqueLearnersStarted).toBe(0);
    expect(result.uniqueLearnersCompleted).toBe(0);
  });

  it("counts completion without inventing a missing start", () => {
    const result = calculateMvpSummary(
      [learner({ completedAt: milestoneDate })],
      [program()],
      completeCoverage,
    );

    expect(result.uniqueLearnersStarted).toBe(0);
    expect(result.uniqueLearnersCompleted).toBe(1);
  });

  it("returns unknown totals when source coverage is incomplete", () => {
    const result = calculateMvpSummary([], [], {
      startsComplete: false,
      completionsComplete: false,
      upcomingEnrollmentsComplete: false,
    });

    expect(Object.values(result).every((value) => value === null)).toBe(true);
  });

  it("rejects learners outside the supplied program rows", () => {
    expect(() =>
      calculateMvpSummary(
        [learner({ programRowId: "unavailable-offering" })],
        [program()],
        completeCoverage,
      ),
    ).toThrow("does not match the supplied program scope");
  });

  it("counts enrollment only for upcoming offerings", () => {
    const result = calculateMvpSummary(
      [],
      [
        program({ enrolledBeforeStart: 20 }),
        program({
          id: "upcoming-offering",
          status: "starting_soon",
          enrolledBeforeStart: 8,
        }),
      ],
      completeCoverage,
    );

    expect(result.upcomingEnrollments).toBe(8);
  });

  it("keeps upcoming enrollment unknown when a count is missing", () => {
    const result = calculateMvpSummary(
      [],
      [program({ status: "starting_soon", enrolledBeforeStart: null })],
      completeCoverage,
    );

    expect(result.upcomingEnrollments).toBeNull();
  });
});

// Rates distinguish a genuine zero from unavailable or invalid inputs.
describe("calculateMvpPercentage", () => {
  it.each([
    [0, 10, 0],
    [8, 10, 80],
    [1, 3, 33.3],
    [null, 10, null],
    [5, null, null],
    [0, 0, null],
    [11, 10, null],
    [-1, 10, null],
    [Number.NaN, 10, null],
  ])("calculates %s / %s as %s", (numerator, denominator, expected) => {
    expect(calculateMvpPercentage(numerator, denominator)).toBe(expected);
  });
});