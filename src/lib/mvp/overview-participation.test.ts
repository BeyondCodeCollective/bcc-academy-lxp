import { describe, expect, it } from "vitest";
import { buildMvpOverviewParticipation } from "./overview-participation";
import type { MvpProgramRow } from "./types";

// Fixtures are synthetic, local inputs; no database records are created.
function row(id: string, attendanceRate: number | null, overrides: Partial<MvpProgramRow> = {}): MvpProgramRow {
  return { id, programId: id, programName: id, courseName: id, courseSlug: id, cohortId: null, cohortName: null,
    status: "active", startDate: null, endDate: null, totalParticipants: 10, enrolledBeforeStart: null,
    started: 4, active: null, completed: null, attendanceQualified: 8, attendanceRate,
    progressRate: null, completionRate: null, surveyResponseRate: null, learnersNeedingCheckIn: null, ...overrides };
}

describe("Overview participation projection", () => {
  it.each([null, undefined, -1, 11, NaN])("preserves roster totals when attendance qualification is unavailable or invalid: %s", attendanceQualified => {
    const result = buildMvpOverviewParticipation([row("a", 50), row("b", null, { attendanceQualified })]);
    expect(result.attendance).toEqual({ total: 20, qualified: null, notVerified: null, percent: null });
  });
  it.each([null, -1, 1.5, NaN])("does not present partial totals when a roster count is invalid: %s", totalParticipants => {
    const result = buildMvpOverviewParticipation([row("a", 50), row("b", null, { totalParticipants })]);
    expect(result.attendance).toEqual({ total: null, qualified: null, notVerified: null, percent: null });
  });
  it("preserves zero active learners and leaves unknown counts unavailable", () => {
    const result = buildMvpOverviewParticipation([row("a", 20, { active: 0 }), row("b", 30, { active: null }), row("c", 40, { active: 6 })]);
    expect(result.attention.map(item => item.activeLearners)).toEqual([0, null, 6]);
    expect(result.attention.map(item => item.totalLearners)).toEqual([10, 10, 10]);
    expect(result.attention.map(item => item.activePercent)).toEqual([0, null, 60]);
  });
  it("ranks three distinct active programs by their lowest course rate, preserving zero", () => {
    const input = [row("a", 90), row("a-low", 20, { programId: "a" }), row("b", 0), row("c", 40), row("d", 50),
      row("unknown", null), row("finished", 1, { status: "completed" }), row("empty", 0, { totalParticipants: 0 })];
    const result = buildMvpOverviewParticipation(input);
    expect(result.attention.map(item => item.id)).toEqual(["b", "a-low", "c"]);
    expect(result.unavailableOfferingCount).toBe(2);
    expect(input[0].id).toBe("a");
  });
  it("uses all active course rosters for the bar, not starts or just the top three", () => {
    const result = buildMvpOverviewParticipation([row("a", 60), row("b", 80), row("c", 90), row("d", 95), row("done", 50, { status: "completed" })]);
    expect(result.attendance).toEqual({ total: 40, qualified: 32, notVerified: 8, percent: 80 });
  });
  it("does not turn incomplete evidence into a partial bar or confirmed absence", () => {
    expect(buildMvpOverviewParticipation([row("a", 50), row("b", null, { attendanceQualified: null })]).attendance.percent).toBeNull();
    expect(buildMvpOverviewParticipation([]).attendance.total).toBeNull();
    expect(buildMvpOverviewParticipation([row("empty", null, { totalParticipants: 0, attendanceQualified: null })]).attendance)
      .toEqual({ total: 0, qualified: 0, notVerified: 0, percent: null });
    expect(buildMvpOverviewParticipation([row("bad", 101, { attendanceQualified: 11 })]).attention).toEqual([]);
  });
  it("joins only the chosen course's outcomes and removes sample-diagnostic fields", () => {
    const measure = { id: "m", label: "Confidence", sourceLabel: "Survey", unit: "1–5", beforeValue: 2, afterValue: 3,
      change: 1, respondentCount: 10, pairedRespondentCount: 5 };
    const result = buildMvpOverviewParticipation([row("a", 50)], [
      { programRowId: "a", programId: "a", measures: [measure], unavailableReason: null },
      { programRowId: "a", programId: "other", measures: [measure], unavailableReason: null },
      { programRowId: "a", scope: "program", measures: [measure], unavailableReason: null },
    ]);
    expect(result.attention[0].outcomes).toHaveLength(1);
    expect(result.attention[0].outcomes[0]).not.toHaveProperty("pairedRespondentCount");
    expect(result.attention[0].outcomes[0].change).toBe(1);
  });
});
