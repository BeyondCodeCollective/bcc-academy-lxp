import { describe, expect, it } from "vitest";
import { buildGoogleCalendarUrl, toGcalUtc } from "./gcal";

describe("toGcalUtc", () => {
  it("converts to basic UTC format and drops millis", () => {
    expect(toGcalUtc("2026-07-09T18:00:00Z")).toBe("20260709T180000Z");
    expect(toGcalUtc("2026-07-09T18:00:00.123Z")).toBe("20260709T180000Z");
  });

  it("normalizes offsets to UTC, including across DST (23:30 ET)", () => {
    expect(toGcalUtc("2026-11-12T23:30:00-05:00")).toBe("20261113T043000Z");
    expect(toGcalUtc("2026-07-12T23:30:00-04:00")).toBe("20260713T033000Z");
  });

  it("throws on an unparseable date (callers must validate)", () => {
    expect(() => toGcalUtc("not a date")).toThrow(RangeError);
  });
});

describe("buildGoogleCalendarUrl", () => {
  it("emits a timed event when both start and end are given", () => {
    const u = new URL(
      buildGoogleCalendarUrl({ title: "Class", date: "2026-11-12", startUtc: "2026-11-12T16:00:00Z", endUtc: "2026-11-12T17:00:00Z" }),
    );
    expect(u.origin + u.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(u.searchParams.get("action")).toBe("TEMPLATE");
    expect(u.searchParams.get("dates")).toBe("20261112T160000Z/20261112T170000Z");
  });

  it("falls back to an all-day event with an exclusive next-day end", () => {
    const u = new URL(buildGoogleCalendarUrl({ title: "OH", date: "2026-11-12" }));
    expect(u.searchParams.get("dates")).toBe("20261112/20261113");
  });

  it("all-day end rolls over month, year and leap day", () => {
    const d = (date: string) => new URL(buildGoogleCalendarUrl({ title: "x", date })).searchParams.get("dates");
    expect(d("2026-11-30")).toBe("20261130/20261201");
    expect(d("2026-12-31")).toBe("20261231/20270101");
    expect(d("2028-02-28")).toBe("20280228/20280229");
  });

  it("uses all-day when only one of start/end is present", () => {
    const u = new URL(buildGoogleCalendarUrl({ title: "x", date: "2026-11-12", startUtc: "2026-11-12T16:00:00Z" }));
    expect(u.searchParams.get("dates")).toBe("20261112/20261113");
  });

  it("encodes title, details and location safely", () => {
    const url = buildGoogleCalendarUrl({ title: "A&B=C #1", date: "2026-11-12", details: "line\nbreak & more", location: "Room 5?" });
    const u = new URL(url);
    expect(u.searchParams.get("text")).toBe("A&B=C #1");
    expect(u.searchParams.get("details")).toBe("line\nbreak & more");
    expect(u.searchParams.get("location")).toBe("Room 5?");
    expect(u.hash).toBe("");
  });
});
