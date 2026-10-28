import { describe, expect, it } from "vitest";
import { getSurveySchema } from "./schemas";
import { PLATFORM_PUBLIC_SURVEYS } from "./platform";

describe("mass-fall-2026-post", () => {
  it("is registered with unique question ids and the eight rating statements", () => {
    const schema = getSurveySchema("mass-fall-2026-post")!;
    const ids = schema.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    const statements = schema.flatMap((q) => (q.type === "likert" ? q.statements : []));
    expect(statements).toHaveLength(8);
    expect(PLATFORM_PUBLIC_SURVEYS["mass-fall-2026-post"]?.appliesToTracks).toEqual(["mass-fall-2026"]);
  });
});
