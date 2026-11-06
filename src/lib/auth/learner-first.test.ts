import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createServiceClient: vi.fn() }));

import { courseNotOver } from "./learner-first";

const fieldReady = { track_slug: "field-ready-staff-cohort", start_date: "2026-11-09", total_weeks: 5 };

describe("courseNotOver", () => {
  it("is true before the start date (pre-survey time)", () => {
    expect(courseNotOver(fieldReady, new Date("2026-11-06T17:00:00Z"))).toBe(true);
  });
  it("is true from the start date", () => {
    expect(courseNotOver(fieldReady, new Date("2026-11-09T15:00:00Z"))).toBe(true);
  });
  it("is false after the last week", () => {
    expect(courseNotOver(fieldReady, new Date("2026-12-15T15:00:00Z"))).toBe(false);
  });
  it("needs a start date", () => {
    expect(courseNotOver({ ...fieldReady, start_date: null }, new Date("2026-11-10T15:00:00Z"))).toBe(false);
  });
});
