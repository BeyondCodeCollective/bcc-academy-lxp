import { describe, expect, it } from "vitest";
import { getSurveySchema } from "./schemas";
import { PLATFORM_AUTH_SURVEYS } from "./platform";

describe("mass-fall-2026-post", () => {
  it("is registered with unique question ids and the eight rating statements", () => {
    const schema = getSurveySchema("mass-fall-2026-post")!;
    const ids = schema.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    const statements = schema.flatMap((q) => (q.type === "likert" ? q.statements : []));
    expect(statements).toHaveLength(8);
    expect(PLATFORM_AUTH_SURVEYS["mass-fall-2026-post"]?.appliesToTracks).toEqual(["mass-fall-2026"]);
  });
});

describe("mass-sept-2026-post", () => {
  it("reuses the cohort 1 instrument, scoped to cohort 2 only", () => {
    expect(getSurveySchema("mass-sept-2026-post")).toBe(getSurveySchema("mass-fall-2026-post"));
    expect(PLATFORM_AUTH_SURVEYS["mass-sept-2026-post"]?.appliesToTracks).toEqual(["mass-sept-2026"]);
  });
});
