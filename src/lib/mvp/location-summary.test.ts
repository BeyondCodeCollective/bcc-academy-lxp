import { expect, it } from "vitest";
import { calculateMvpLocations } from "./location-summary";
it("deduplicates learners, trims labels, and counts missing locations", () => {
  const result = calculateMvpLocations([{ id: "a", location: " Boston " }, { id: "a", location: "Boston" },
    { id: "b", location: null }, { id: "c", location: "Boston" }]);
  expect(result).toMatchObject({ uniqueLearners: 3, knownLocationLearners: 2, missingLocationLearners: 1,
    distinctReportedLocations: 1, citiesRepresented: null, groups: [{ label: "Boston", count: 2 }] });
  expect(JSON.stringify(result)).not.toContain('"id"');
});
it("does not resolve conflicting profiles or geocode text", () => {
  const result = calculateMvpLocations([{ id: "a", location: "Boston" }, { id: "a", location: "NYC" },
    { id: "b", location: "Boston, MA" }, { id: "c", location: "Boston" }]);
  expect(result.missingLocationLearners).toBe(1);
  expect(result.distinctReportedLocations).toBe(2);
});
it("preserves known empty counts", () => {
  expect(calculateMvpLocations([])).toMatchObject({ uniqueLearners: 0, groups: [], missingLocationLearners: 0 });
});
