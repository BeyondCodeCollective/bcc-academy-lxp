import { describe, expect, it } from "vitest";
import { sessionDates, sessionLabel } from "./session-days";
import type { OfficeHour } from "@/lib/programs/types";

const ev = (date: string, type?: OfficeHour["type"]): OfficeHour => ({
  date,
  time: "1pm EST",
  title: "Workshop",
  description: "",
  type,
});

// Field Ready's real schedule shape: Mon kickoff/workshops, Thu workshops,
// one optional office-hours slot.
const schedule = [
  ev("2026-11-09", "event"),
  ev("2026-11-12", "event"),
  ev("2026-11-16", "event"),
  ev("2026-11-19", "event"),
  ev("2026-11-24", "office-hours"),
];

describe("sessionDates", () => {
  it("dates session 2 from the next class event in the same week", () => {
    expect(sessionDates("2026-11-09", 2, schedule)).toEqual(["2026-11-09", "2026-11-12"]);
    expect(sessionDates("2026-11-16", 2, schedule)).toEqual(["2026-11-16", "2026-11-19"]);
  });

  it("ignores office hours and events outside the week", () => {
    expect(sessionDates("2026-11-23", 2, schedule)).toEqual(["2026-11-23", null]);
  });

  it("returns nulls when the week has no date", () => {
    expect(sessionDates(undefined, 2, schedule)).toEqual([null, null]);
  });
});

describe("sessionLabel", () => {
  it("adds the weekday when the date is known", () => {
    expect(sessionLabel(1, "2026-11-12")).toMatch(/^Session 2 · Thu, Nov 12$/);
    expect(sessionLabel(1, null)).toBe("Session 2");
  });
});
