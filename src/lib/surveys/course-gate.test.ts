import { describe, expect, it } from "vitest";
import { openTimedSurveyForTrack } from "./course-gate";

describe("openTimedSurveyForTrack", () => {
  const before = Date.parse("2026-11-19T19:14:00-05:00");
  const after = Date.parse("2026-11-19T19:15:00-05:00");

  it("stays closed until 7:15 PM ET on Nov 19", () => {
    expect(openTimedSurveyForTrack("catalyst-labs-nov19", before)).toBeNull();
  });

  it("hands Nov 19 learners to the post survey once it opens", () => {
    expect(openTimedSurveyForTrack("catalyst-labs-nov19", after)).toBe("catalyst-labs-post");
  });

  it("never fires for other courses, including untimed required surveys", () => {
    expect(openTimedSurveyForTrack("catalyst-labs", after)).toBeNull();
    expect(openTimedSurveyForTrack("ai-fundamentals", after)).toBeNull();
  });
});
