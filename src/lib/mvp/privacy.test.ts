import { describe, expect, it } from "vitest";
import { calculateMvpGeography } from "./geography";
import { calculateMvpLocations } from "./location-summary";
import { protectMvpGeography, protectMvpSurvey } from "./privacy";
import type { MvpDashboardData } from "./types";
import type { MvpSurveyOutcomeGroup } from "./survey-queries";

function survey(count: number, eligible = count): MvpSurveyOutcomeGroup {
  return { programRowId: "p:c", measures: [{ id: "m", label: "Confidence", sourceLabel: "Survey", unit: "points",
    beforeValue: count ? 2 : null, afterValue: count ? 4 : null, change: count ? 2 : null,
    respondentCount: count, pairedRespondentCount: count }],
    participation: [{ surveyId: "s", label: "Survey", respondents: count, eligibleLearners: eligible,
      responseRate: eligible ? count / eligible * 100 : null }],
    anySurveyResponseRate: eligible ? count / eligible * 100 : null, unavailableReason: null };
}
function geography(count: number, other = 0, missing = 0): MvpDashboardData {
  const profiles = Array.from({ length: count + other + missing }, (_, i) => ({ id: String(i),
    location: i < count ? "Small location" : i < count + other ? "Large location" : null,
    zip: i < count ? "02108" : i < count + other ? "99999" : null, state: i < count + other ? "MA" : null }));
  return { metricDefinitions: [], geography: calculateMvpGeography(profiles), locations: calculateMvpLocations(profiles) } as unknown as MvpDashboardData;
}
describe("MVP minimum-five privacy boundary", () => {
  it.each([1, 2, 3, 4])("withholds survey results and all related rates for n=%i", count => {
    const input = survey(count, 20);
    const safe = protectMvpSurvey(input);
    expect(safe.measures[0]).toMatchObject({ beforeValue: null, afterValue: null, change: null,
      respondentCount: null, pairedRespondentCount: null });
    expect(safe.participation).toEqual([]);
    expect(safe.anySurveyResponseRate).toBeNull();
    expect(input.measures[0].pairedRespondentCount).toBe(count);
  });
  it.each([0, 5, 6, 20])("preserves survey results at safe boundaries n=%i", count => {
    expect(protectMvpSurvey(survey(count))).toEqual(survey(count));
  });
  it("hides a small unpaired remainder and related measures", () => {
    const input = survey(5, 10);
    input.measures[0].respondentCount = 6;
    expect(protectMvpSurvey(input).measures[0].pairedRespondentCount).toBeNull();
  });
  it("withholds participation rates that reveal a small nonresponding remainder", () => {
    const safe = protectMvpSurvey(survey(5, 6));
    expect(safe.participation).toEqual([]);
    expect(safe.anySurveyResponseRate).toBeNull();
  });
  it.each([1, 2, 3, 4])("withholds both geography projections including complementary totals for n=%i", count => {
    const input = geography(count, 10);
    const safe = protectMvpGeography(input);
    expect(safe.geography).toBeUndefined();
    expect(safe.locations).toBeUndefined();
    expect(JSON.stringify(safe)).not.toContain("02108");
    expect(input.geography?.postalCodes.groups).toHaveLength(2);
  });
  it.each([0, 5, 6])("retains safe geography and exact zero for n=%i", count => {
    const input = geography(count);
    expect(protectMvpGeography(input)).toEqual(input);
  });
  it("protects missing-location counts as well as named groups", () => {
    expect(protectMvpGeography(geography(10, 0, 1)).locations).toBeUndefined();
  });
});
