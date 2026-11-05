import { describe, expect, it } from "vitest";
import { getSurveySchema } from "./schemas";
import { PLATFORM_AUTH_SURVEYS } from "./platform";
import { CATALYST_LABS_POST_SURVEY_ID, CATALYST_LABS_TRACKS } from "./catalyst-labs-post";

describe("catalyst-labs-post", () => {
  it("is registered with the three questions for every Labs date", () => {
    const schema = getSurveySchema(CATALYST_LABS_POST_SURVEY_ID)!;
    expect(schema.map((q) => q.id)).toEqual(["lab_rating", "try_this_week", "field_ready_interest"]);
    expect(PLATFORM_AUTH_SURVEYS[CATALYST_LABS_POST_SURVEY_ID]?.appliesToTracks).toEqual(CATALYST_LABS_TRACKS);
  });
});
