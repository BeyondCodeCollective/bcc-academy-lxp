import { describe, expect, it } from "vitest";
import { calculateMvpEvent, eventMatchesWindow, type MvpEventRecord } from "./event-summary";
const event: MvpEventRecord = { id: "e", program_id: "p", title: "Workshop", starts_at: "2026-10-01T01:00:00Z",
  ends_at: "2026-10-01T02:00:00Z", timezone: "America/New_York", status: "closed", capacity: 30 };
const asOf = new Date("2026-10-02T00:00:00Z");
const family = { id: "r", event_id: "e", program_id: "p", status: "confirmed" };
const ticket = { id: "a", registration_id: "r", event_id: "e", status: "attended", checked_in_at: "2026-10-01T01:00:00Z" };
describe("separate-event evidence", () => {
  it("uses the event timezone and includes overlap boundaries", () => {
    expect(eventMatchesWindow(event, { start: "2026-09-30", end: "2026-09-30" })).toBe(true);
    expect(eventMatchesWindow(event, { start: "2026-10-01", end: null })).toBe(false);
  });
  it("does not invent ends or accept malformed dates and timezones", () => {
    expect(eventMatchesWindow({ ...event, ends_at: null }, { start: "2026-09-01", end: null })).toBeNull();
    expect(eventMatchesWindow({ ...event, timezone: "wrong" }, { start: "2026-09-01", end: null })).toBeNull();
    expect(eventMatchesWindow({ ...event, ends_at: "invalid" }, { start: "2026-09-01", end: null })).toBeNull();
  });
  it("counts tickets separately, deduplicates IDs, and never infers completion", () => {
    const result = calculateMvpEvent(event, [family], [ticket, ticket, { ...ticket, id: "b", status: "confirmed", checked_in_at: null }], asOf);
    expect(result).toMatchObject({ enrolled: 2, attended: 1, active: 1, completed: null, needsCheckIn: null });
  });
  it("excludes canceled tickets and separates waiting/offered tickets", () => {
    const result = calculateMvpEvent(event, [family], [ticket, { ...ticket, id: "b", status: "cancelled" },
      { ...ticket, id: "c", status: "waitlisted", checked_in_at: null }, { ...ticket, id: "d", status: "offered", checked_in_at: null }], asOf);
    expect(result).toMatchObject({ enrolled: 1, attended: 1, waitlisted: 1 });
    expect(calculateMvpEvent(event, [{ ...family, status: "cancelled" }], [ticket], asOf).enrolled).toBe(0);
  });
  it.each([null, "invalid", "2027-01-01T00:00:00Z"])("does not report partial attendance for invalid evidence %s", checked_in_at => {
    expect(calculateMvpEvent(event, [family], [{ ...ticket, checked_in_at }], asOf).active).toBeNull();
  });
  it("rejects mismatched registrations and excludes another event's tickets", () => {
    expect(calculateMvpEvent(event, [{ ...family, program_id: "other" }], [ticket], asOf).enrolled).toBeNull();
    expect(calculateMvpEvent(event, [family], [{ ...ticket, event_id: "other" }], asOf).enrolled).toBe(0);
  });
});
