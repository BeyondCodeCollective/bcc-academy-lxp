import { describe, expect, it } from "vitest";
import { buildMvpSchedule, type MvpScheduleInput } from "./schedule";

// Dated session-modeled course with a separate kickoff and a future session.
function input(): MvpScheduleInput {
  return {
    track: {
      slug: "example", name: "Example", shortName: "Example",
      totalWeeks: 2, sessionsPerWeek: 2, unitLabel: "Session",
      startDate: "2026-10-01", lastSessionDayOffset: 0,
      weekSummaries: [
        { week: 0, date: "2026-10-01", label: "Kickoff" },
        { week: 1, date: "2026-10-01" },
        { week: 2, date: "2026-10-03" },
      ],
    },
    asOf: new Date("2026-10-01T18:00:00Z"),
    verifiedStartSessions: [{ weekNumber: 0, sessionNumber: 1, label: "Kickoff" }],
    confirmedHeldSessions: null,
  };
}

describe("buildMvpSchedule", () => {
  it("does not multiply session units by weekly cadence or count kickoff as required", () => {
    const result = buildMvpSchedule(input());
    expect(result.scheduledRequiredSessions).toHaveLength(1);
    expect(result.startSessions).toHaveLength(1);
    expect(result.heldRequiredSessions).toBeNull();
  });
  it("excludes future and extra slots from confirmed attendance denominators", () => {
    const result = buildMvpSchedule({ ...input(), confirmedHeldSessions: [
      { weekNumber: 0, sessionNumber: 1, label: "Kickoff" },
      { weekNumber: 1, sessionNumber: 1, label: "First" },
      { weekNumber: 2, sessionNumber: 1, label: "Future" },
    ] });
    expect(result.heldRequiredSessions?.map((slot) => slot.weekNumber)).toEqual([1]);
  });
  it("does not advance a date at midnight UTC while it is still the prior Eastern day", () => {
    const result = buildMvpSchedule({ ...input(), asOf: new Date("2026-10-01T01:00:00Z") });
    expect(result.scheduledRequiredSessions).toEqual([]);
    expect(result.startSessions).toEqual([]);
  });
  it("keeps self-paced attendance unavailable", () => {
    const value = input();
    value.track = { ...value.track!, selfPaced: true };
    expect(buildMvpSchedule(value).scheduledRequiredSessions).toBeNull();
  });
  it("rejects invalid dates without inventing a schedule", () => {
    const value = input();
    value.track = { ...value.track!, startDate: "2026-02-30" };
    expect(buildMvpSchedule(value).scheduledRequiredSessions).toBeNull();
  });
});
