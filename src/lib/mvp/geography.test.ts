import { expect, it } from "vitest";
import { calculateMvpGeography } from "./geography";
it("deduplicates learners and preserves leading-zero postal codes and reported labels", () => {
  const profile = { id: "a", location: " Boston ", zip: "02108", state: " MA " };
  const result = calculateMvpGeography([profile, profile, { id: "b", location: null, zip: null, state: null }]);
  expect(result.postalCodes).toEqual({ respondentCount: 1, missingCount: 1, groups: [{ label: "02108", count: 1 }] });
  expect(result.states.groups).toEqual([{ label: "MA", count: 1 }]);
  expect(result.verifiedCities).toBeNull();
});
it("conflicting values stay unknown per field and do not invent a city", () => {
  const result = calculateMvpGeography([{ id: "a", location: "Boston, MA", zip: "02108", state: "MA" },
    { id: "a", location: "Boston, MA", zip: "02109", state: "Massachusetts" }]);
  expect(result.postalCodes.missingCount).toBe(1);
  expect(result.states.missingCount).toBe(1);
  expect(result.locations.respondentCount).toBe(1);
});
