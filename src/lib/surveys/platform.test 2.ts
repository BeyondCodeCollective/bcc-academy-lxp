import { describe, expect, it } from "vitest";
import { surveyTargetsLearner } from "./platform";

// The AI Fundamentals pre-survey is the case that forced the union: it belongs
// to Beyond Code Centers, and Catalyst Labs teaches the same course under
// Catalyst. ANDing the two allowlists made that unexpressible.
const aiFundamentalsPre = {
  appliesToPrograms: ["beyond-code-centers"],
  appliesToTracks: ["catalyst-labs"],
};

describe("surveyTargetsLearner", () => {
  it("offers a both-lists survey to the named program's learners", () => {
    expect(
      surveyTargetsLearner(aiFundamentalsPre, ["beyond-code-centers"], ["foundations-ai"]),
    ).toBe(true);
  });

  it("offers a both-lists survey to the named course's learners in another program", () => {
    expect(surveyTargetsLearner(aiFundamentalsPre, ["catalyst"], ["catalyst-labs"])).toBe(true);
  });

  it("withholds it from other courses in that same program", () => {
    expect(surveyTargetsLearner(aiFundamentalsPre, ["catalyst"], ["mass-sept-2026"])).toBe(false);
  });

  it("keeps a course-only allowlist exact", () => {
    const massPre = { appliesToTracks: ["mass-sept-2026"] };
    expect(surveyTargetsLearner(massPre, ["catalyst"], ["mass-sept-2026"])).toBe(true);
    expect(surveyTargetsLearner(massPre, ["catalyst"], ["catalyst-labs"])).toBe(false);
  });

  it("keeps a program-only allowlist exact", () => {
    const impact = { appliesToPrograms: ["beyond-code-centers"] };
    expect(surveyTargetsLearner(impact, ["beyond-code-centers"], ["foundations-ai"])).toBe(true);
    expect(surveyTargetsLearner(impact, ["catalyst"], ["comptia-security"])).toBe(false);
  });

  it("applies to everyone when a survey names neither", () => {
    expect(surveyTargetsLearner({}, ["catalyst"], ["comptia-security"])).toBe(true);
  });
});
