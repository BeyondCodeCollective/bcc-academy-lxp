import { beforeAll, describe, expect, it } from "vitest";
import { checkinWindowState, eventCheckinKey, verifyEventCheckinKey } from "./event-checkin";

beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
});

describe("event check-in key", () => {
  it("verifies for its own event only", () => {
    const k = eventCheckinKey("11111111-1111-1111-1111-111111111111");
    expect(verifyEventCheckinKey("11111111-1111-1111-1111-111111111111", k)).toBe(true);
    expect(verifyEventCheckinKey("22222222-2222-2222-2222-222222222222", k)).toBe(false);
    expect(verifyEventCheckinKey("11111111-1111-1111-1111-111111111111", "")).toBe(false);
    expect(verifyEventCheckinKey("11111111-1111-1111-1111-111111111111", k + "x")).toBe(false);
  });
});

describe("checkinWindowState", () => {
  const ev = { starts_at: "2026-11-09T15:00:00Z", ends_at: "2026-11-09T20:00:00Z" };
  const at = (iso: string) => Date.parse(iso);
  it("is early more than 2h before start", () => {
    expect(checkinWindowState(ev, at("2026-11-09T12:00:00Z"))).toBe("early");
  });
  it("is open from 2h before to 3h after the end", () => {
    expect(checkinWindowState(ev, at("2026-11-09T13:30:00Z"))).toBe("open");
    expect(checkinWindowState(ev, at("2026-11-09T22:30:00Z"))).toBe("open");
  });
  it("is closed after that, defaulting to 4h length without an end", () => {
    expect(checkinWindowState(ev, at("2026-11-09T23:30:00Z"))).toBe("closed");
    expect(checkinWindowState({ ...ev, ends_at: null }, at("2026-11-09T21:00:00Z"))).toBe("open");
  });
});
