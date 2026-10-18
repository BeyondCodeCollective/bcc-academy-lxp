import { describe, it, expect } from "vitest";
import { surveyWaitsForFirstSession } from "@/lib/onboarding/survey-timing";

describe("surveyWaitsForFirstSession", () => {
  it("holds a flagged survey until the learner has attended", () => {
    expect(surveyWaitsForFirstSession({ afterFirstSession: true }, false)).toBe(true);
  });

  it("releases it once they have attended", () => {
    expect(surveyWaitsForFirstSession({ afterFirstSession: true }, true)).toBe(false);
  });

  it("never holds a survey that is not flagged", () => {
    expect(surveyWaitsForFirstSession({}, false)).toBe(false);
    expect(surveyWaitsForFirstSession({ afterFirstSession: false }, false)).toBe(false);
  });
});
