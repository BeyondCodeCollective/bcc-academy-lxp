import { describe, expect, it } from "vitest";
import { getSurveySchema } from "./schemas";
import { catalystConfig as catalyst } from "@/lib/programs/catalyst";
import { surveyNotOpenYet } from "@/lib/onboarding/survey-timing";
import { CATALYST_LABS_POST_SURVEY, CATALYST_LABS_POST_SURVEY_ID } from "./catalyst-labs-post";

describe("catalyst-labs-post", () => {
  it("has the three approved questions", () => {
    const schema = getSurveySchema(CATALYST_LABS_POST_SURVEY_ID)!;
    expect(schema.map((q) => q.id)).toEqual(["lab_rating", "try_this_week", "field_ready_interest"]);
  });

  it("is a required Catalyst survey for the Nov 19 Labs learners only", () => {
    const config = catalyst.surveys?.find((s) => s.id === CATALYST_LABS_POST_SURVEY_ID);
    expect(config?.required).toBe(true);
    expect(config?.appliesToTracks).toEqual(["catalyst-labs-nov19"]);
  });

  it("opens 15 minutes before the Nov 19 session ends", () => {
    expect(surveyNotOpenYet(CATALYST_LABS_POST_SURVEY, Date.parse("2026-11-19T19:14:00-05:00"))).toBe(true);
    expect(surveyNotOpenYet(CATALYST_LABS_POST_SURVEY, Date.parse("2026-11-19T19:15:00-05:00"))).toBe(false);
    expect(surveyNotOpenYet({}, 0)).toBe(false);
  });
});
