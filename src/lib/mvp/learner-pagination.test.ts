import { describe, expect, it } from "vitest";
import { paginateLearners, parseLearnerPagination } from "./learner-pagination";

describe("Learner pagination", () => {
  it("defaults to 25 and accepts only supported page sizes", () => {
    expect(parseLearnerPagination({})).toEqual({ page: 1, pageSize: 25 });
    for (const size of [10, 25, 50]) {
      const parsed = parseLearnerPagination({ pageSize: String(size) });
      expect(paginateLearners(Array.from({ length: 60 }, (_, i) => i), parsed).directory).toHaveLength(size);
    }
  });
  it("rejects arrays, fractions, negatives, unsafe integers and unsupported sizes", () => {
    for (const value of [["1"], "0", "-1", "1.5", "Infinity", "abc", "9007199254740992"]) {
      expect(() => parseLearnerPagination({ page: value })).toThrow();
    }
    expect(() => parseLearnerPagination({ pageSize: "100" })).toThrow();
  });
  it("clamps out-of-range pages without mutation", () => {
    const rows = [1, 2];
    expect(paginateLearners(rows, { page: 999, pageSize: 10 }).pagination).toMatchObject({ page: 1, totalMatching: 2, hasNext: false, hasPrevious: false });
    expect(rows).toEqual([1, 2]);
    expect(paginateLearners([], { page: 999, pageSize: 10 }).pagination).toMatchObject({ page: 1, totalPages: 1, start: 0, end: 0 });
  });
});
