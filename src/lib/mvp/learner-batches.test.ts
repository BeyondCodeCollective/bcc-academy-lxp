import { describe, expect, it } from "vitest";
import { learnerCourseBatches } from "./learner-batches";

describe("Authorized learner course batches", () => {
  it("bounds batches and never forms cross-program course combinations", () => {
    const courses = Array.from({ length: 205 }, (_, i) => ({ programId: "p1", slug: `c${i}` }));
    const batches = learnerCourseBatches([...courses, courses[0], { programId: "p2", slug: "c0" }]);
    expect(batches.map(b => b.length)).toEqual([100, 100, 5, 1]);
    expect(batches.every(b => new Set(b.map(c => c.programId)).size === 1)).toBe(true);
    expect(batches.flat()).toHaveLength(206);
    expect(learnerCourseBatches([])).toEqual([]);
  });
});
