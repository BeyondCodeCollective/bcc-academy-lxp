import { describe, expect, it } from "vitest";
import { parseLearnerSort, sortLearners } from "./learner-sort";
import { paginateLearners } from "./learner-pagination";

describe("Stable learner sorting", () => {
  it("defaults to name ascending and rejects unsupported or repeated sort values", () => {
    expect(parseLearnerSort({})).toEqual({ sortBy: "name", sortOrder: "asc" });
    for (const params of [{ sortBy: "status" }, { sortBy: ["name"] }, { sortOrder: "random" }, { sortOrder: ["asc"] }]) expect(() => parseLearnerSort(params)).toThrow();
  });
  it("sorts names and email in both directions with missing values last", () => {
    const rows = [
      { id: "3", firstName: null, lastName: null, email: null },
      { id: "2", firstName: "Zoe", lastName: "Baker", email: "a@example.test" },
      { id: "1", firstName: "Amy", lastName: "Adams", email: "z@example.test" },
    ];
    const ids = (sortBy: "name" | "email", sortOrder: "asc" | "desc") => sortLearners(rows, { sortBy, sortOrder }).map(r => r.id);
    expect(ids("name", "asc")).toEqual(["1", "2", "3"]);
    expect(ids("name", "desc")).toEqual(["2", "1", "3"]);
    expect(ids("email", "asc")).toEqual(["2", "1", "3"]);
    expect(ids("email", "desc")).toEqual(["1", "2", "3"]);
    expect(rows.map(r => r.id)).toEqual(["3", "2", "1"]);
  });
  it("keeps equal-name/email ties stable across input order and page boundaries", () => {
    const rows = Array.from({ length: 26 }, (_, i) => ({ id: String(i).padStart(2, "0"), firstName: i % 2 ? " amy " : "Amy", lastName: "Same", email: "same@example.test" }));
    for (const sortBy of ["name", "email"] as const) for (const sortOrder of ["asc", "desc"] as const) {
      const sorted = sortLearners([...rows].reverse(), { sortBy, sortOrder });
      expect(sorted.map(r => r.id)).toEqual(rows.map(r => r.id));
      const first = paginateLearners(sorted, { page: 1, pageSize: 25 });
      const second = paginateLearners(sorted, { page: 2, pageSize: 25 });
      expect(new Set([...first.directory, ...second.directory].map(r => r.id)).size).toBe(26);
    }
  });
});
