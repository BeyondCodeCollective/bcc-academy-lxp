import { expect, it } from "vitest";
import { calculateMvpAges } from "./demographics";

// Fixed dates keep birthday and missing-data checks reproducible.
const now = new Date("2026-10-02T12:00:00Z");
it("deduplicates learners and respects birthdays", () => {
  const result = calculateMvpAges([{ id: "a", dateOfBirth: "2008-10-03" },
    { id: "b", dateOfBirth: "2008-10-02" }, { id: "b", dateOfBirth: "2008-10-02" }], now);
  expect(result.respondentCount).toBe(2);
  expect(result.groups.slice(0, 2).map((group) => group.count)).toEqual([1, 1]);
});
it("keeps missing, malformed, impossible and future dates unknown", () => {
  const result = calculateMvpAges([null, "bad", "2025-02-29", "2027-01-01"].map((dateOfBirth, i) => ({ id: String(i), dateOfBirth })), now);
  expect(result.missingCount).toBe(4);
  expect(result.respondentCount).toBe(0);
});
it("handles an empty roster", () => {
  expect(calculateMvpAges([], now)).toMatchObject({ respondentCount: 0, missingCount: 0 });
});
