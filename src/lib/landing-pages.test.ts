import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => ({}) }));

import { landingHasExpired } from "./landing-pages";

const NOW = Date.parse("2026-10-22T12:00:00Z");
const s = (startUtc: string | null, endUtc: string | null = null) => ({
  id: "x",
  label: "x",
  startUtc,
  endUtc,
});

describe("landingHasExpired", () => {
  it("never expires without sessions", () => {
    expect(landingHasExpired([], NOW)).toBe(false);
  });
  it("never expires when sessions have no dates", () => {
    expect(landingHasExpired([s(null)], NOW)).toBe(false);
  });
  it("expires when every session has ended", () => {
    expect(landingHasExpired([s("2026-09-01T15:00:00Z", "2026-09-01T17:00:00Z")], NOW)).toBe(true);
  });
  it("stays live while any session is upcoming", () => {
    expect(
      landingHasExpired([s("2026-09-01T15:00:00Z"), s("2026-11-19T23:00:00Z")], NOW),
    ).toBe(false);
  });
  it("gives an end-less session a 24h grace window", () => {
    expect(landingHasExpired([s("2026-10-22T05:00:00Z")], NOW)).toBe(false);
    expect(landingHasExpired([s("2026-10-20T05:00:00Z")], NOW)).toBe(true);
  });
});
