import { describe, expect, it } from "vitest";
import type { TrackConfig } from "@/lib/programs/types";
import {
  computeCurrentWeek,
  easternDayKey,
  easternToUtc,
  formatCohortTime,
  resolveCurrentUnit,
  resolveTrackEndDayKey,
  resolveTrackPhase,
  trackHasStarted,
  unitDateHasArrived,
} from "./utils";

const track = (extra: Partial<TrackConfig> = {}) =>
  ({
    startDate: "2026-11-09",
    totalWeeks: 4,
    weekSummaries: [],
    weeks: [],
    ...extra,
  }) as unknown as TrackConfig;

describe("easternDayKey", () => {
  it("23:30 ET is still the same ET day even though it is the next UTC day", () => {
    // 2026-11-12 23:30 EST = 2026-11-13 04:30Z
    expect(easternDayKey(new Date("2026-11-13T04:30:00Z"))).toBe("2026-11-12");
    // 2026-07-12 23:30 EDT = 2026-07-13 03:30Z
    expect(easternDayKey(new Date("2026-07-13T03:30:00Z"))).toBe("2026-07-12");
  });

  it("flips at ET midnight, not UTC midnight", () => {
    expect(easternDayKey(new Date("2026-11-13T04:59:59Z"))).toBe("2026-11-12");
    expect(easternDayKey(new Date("2026-11-13T05:00:00Z"))).toBe("2026-11-13");
  });

  it("handles the spring-forward day (2026-03-08)", () => {
    expect(easternDayKey(new Date("2026-03-08T04:59:00Z"))).toBe("2026-03-07");
    expect(easternDayKey(new Date("2026-03-08T05:00:00Z"))).toBe("2026-03-08");
    // After the change, ET midnight is 04:00Z.
    expect(easternDayKey(new Date("2026-03-09T03:59:00Z"))).toBe("2026-03-08");
    expect(easternDayKey(new Date("2026-03-09T04:00:00Z"))).toBe("2026-03-09");
  });

  it("handles the fall-back day (2026-11-01)", () => {
    expect(easternDayKey(new Date("2026-11-01T03:59:00Z"))).toBe("2026-10-31");
    expect(easternDayKey(new Date("2026-11-01T04:00:00Z"))).toBe("2026-11-01");
    // The repeated 1am hour: both instants are Nov 1.
    expect(easternDayKey(new Date("2026-11-01T05:30:00Z"))).toBe("2026-11-01");
    expect(easternDayKey(new Date("2026-11-02T04:59:00Z"))).toBe("2026-11-01");
    expect(easternDayKey(new Date("2026-11-02T05:00:00Z"))).toBe("2026-11-02");
  });
});

describe("trackHasStarted / unitDateHasArrived", () => {
  it("does not start at midnight UTC the evening before (8pm ET Sunday)", () => {
    expect(trackHasStarted({ startDate: "2026-11-09" }, new Date("2026-11-09T01:30:00Z"))).toBe(false);
    expect(trackHasStarted({ startDate: "2026-11-09" }, new Date("2026-11-09T05:00:00Z"))).toBe(true);
  });

  it("a TBD start has never started", () => {
    expect(trackHasStarted({ startDate: "2020-01-01", startDateTbd: true }, new Date())).toBe(false);
  });

  it("accepts an ISO timestamp by its date part", () => {
    expect(unitDateHasArrived("2026-11-09T00:00:00Z", new Date("2026-11-09T12:00:00Z"))).toBe(true);
    expect(unitDateHasArrived("2026-11-10T00:00:00Z", new Date("2026-11-09T12:00:00Z"))).toBe(false);
  });

  it("a learner in another timezone sees the same ET-based answer (instant-based, not local)", () => {
    // 2026-11-09 04:30Z is 8:30pm PST Sunday for a Pacific learner and 11:30pm ET Sunday: not started for both.
    expect(trackHasStarted({ startDate: "2026-11-09" }, new Date("2026-11-09T04:30:00Z"))).toBe(false);
  });
});

describe("computeCurrentWeek", () => {
  const start = "2026-11-09T00:00:00Z";
  it("stays on week 1 through the first week and advances after the offset", () => {
    expect(computeCurrentWeek(start, 8, 6, new Date("2026-11-09T00:00:00Z"))).toBe(1);
    expect(computeCurrentWeek(start, 8, 6, new Date("2026-11-15T23:59:00Z"))).toBe(1);
    expect(computeCurrentWeek(start, 8, 6, new Date("2026-11-16T00:00:00Z"))).toBe(2);
    expect(computeCurrentWeek(start, 8, 6, new Date("2026-11-23T00:00:00Z"))).toBe(3);
  });

  it("clamps to totalWeeks and to week 1 before the start", () => {
    expect(computeCurrentWeek(start, 3, 6, new Date("2027-06-01T00:00:00Z"))).toBe(3);
    expect(computeCurrentWeek(start, 3, 6, new Date("2026-10-01T00:00:00Z"))).toBe(1);
  });

  it("honours a short lastSessionDayOffset (Wed start, Fri last session)", () => {
    expect(computeCurrentWeek("2026-11-11T00:00:00Z", 8, 2, new Date("2026-11-13T12:00:00Z"))).toBe(1);
    expect(computeCurrentWeek("2026-11-11T00:00:00Z", 8, 2, new Date("2026-11-14T12:00:00Z"))).toBe(2);
  });

  it("crossing the fall-back day does not shift week boundaries (UTC math)", () => {
    expect(computeCurrentWeek("2026-10-26T00:00:00Z", 8, 6, new Date("2026-11-02T00:00:00Z"))).toBe(2);
  });
});

describe("resolveCurrentUnit before the first ET day", () => {

  it("is 0 well before and 1 on the first ET day", () => {
    const t = track({ startDate: "2026-11-09" });
    expect(resolveCurrentUnit(t, new Date("2026-11-01T12:00:00Z"))).toBe(0);
    expect(resolveCurrentUnit(t, new Date("2026-11-09T15:00:00Z"))).toBe(1);
  });

  it("a dated syllabus is authoritative and compares ET days", () => {
    const t = track({
      weekSummaries: [
        { week: 1, date: "2026-11-10" },
        { week: 2, date: "2026-11-17" },
      ] as never,
    });
    expect(resolveCurrentUnit(t, new Date("2026-11-10T03:00:00Z"))).toBe(0); // Mon 10pm ET
    expect(resolveCurrentUnit(t, new Date("2026-11-10T05:00:00Z"))).toBe(1);
    expect(resolveCurrentUnit(t, new Date("2026-11-17T04:00:00Z"))).toBe(1); // Mon 11pm ET, week 2 not yet
    expect(resolveCurrentUnit(t, new Date("2026-11-17T05:00:00Z"))).toBe(2);
  });

  it("self-paced is 1 once started", () => {
    expect(resolveCurrentUnit(track({ selfPaced: true }), new Date("2026-12-01T00:00:00Z"))).toBe(1);
  });
});

describe("track end and phase", () => {
  it("derives the end day from start + weeks", () => {
    expect(resolveTrackEndDayKey(track({ totalWeeks: 4 }))).toBe("2026-11-30");
    expect(resolveTrackEndDayKey(track({ totalWeeks: 4, lastSessionDayOffset: 3 }))).toBe("2026-12-03");
  });

  it("day-labelled camps end totalWeeks-1 days after the start", () => {
    expect(resolveTrackEndDayKey(track({ totalWeeks: 3, unitLabel: "Day" }))).toBe("2026-11-11");
  });

  it("returns null for TBD and self-paced", () => {
    expect(resolveTrackEndDayKey(track({ startDateTbd: true }))).toBeNull();
    expect(resolveTrackEndDayKey(track({ selfPaced: true }))).toBeNull();
  });

  it("is running on the last ET day and ended only the day after", () => {
    const t = track({ totalWeeks: 1 }); // ends 2026-11-09
    expect(resolveTrackPhase(t, new Date("2026-11-08T12:00:00Z"))).toBe("upcoming");
    expect(resolveTrackPhase(t, new Date("2026-11-10T03:00:00Z"))).toBe("running"); // 10pm ET on last day
    expect(resolveTrackPhase(t, new Date("2026-11-10T05:00:00Z"))).toBe("ended");
  });
});

describe("easternToUtc", () => {
  it("follows DST: EDT in July, EST in January", () => {
    expect(easternToUtc("2026-07-20", "11:00")).toBe("2026-07-20T15:00:00.000Z");
    expect(easternToUtc("2026-01-20", "11:00")).toBe("2026-01-20T16:00:00.000Z");
  });

  it("resolves the day-of-change correctly", () => {
    expect(easternToUtc("2026-03-08", "01:30")).toBe("2026-03-08T06:30:00.000Z"); // still EST
    expect(easternToUtc("2026-03-08", "12:00")).toBe("2026-03-08T16:00:00.000Z"); // EDT
    expect(easternToUtc("2026-11-01", "12:00")).toBe("2026-11-01T17:00:00.000Z"); // EST
    expect(easternToUtc("2026-11-01", "00:30")).toBe("2026-11-01T04:30:00.000Z"); // EDT
  });

  it("23:30 ET lands on the next UTC day", () => {
    expect(easternToUtc("2026-11-12", "23:30")).toBe("2026-11-13T04:30:00.000Z");
    expect(easternToUtc("2026-07-12", "23:30")).toBe("2026-07-13T03:30:00.000Z");
  });
});

describe("formatCohortTime", () => {
  it("formats noon, midnight and afternoon", () => {
    expect(formatCohortTime("12:00")).toBe("12:00 PM ET");
    expect(formatCohortTime("00:05")).toBe("12:05 AM ET");
    expect(formatCohortTime("18:30")).toBe("6:30 PM ET");
  });
});
