import { describe, expect, it } from "vitest";
import { parseMvpLearnerFilter, selectMvpLearners } from "./learner-filter";

// Milestones overlap, while unknown membership is never guessed as inactive.
const evidence: Parameters<typeof selectMvpLearners>[2] = {
  active: new Map([["a", true], ["b", false], ["c", null]]),
  started: ["a", "b"], completed: ["a"], upcoming: false, checkIns: [],
};
describe("learner status membership", () => {
  it.each([
    ["all", ["a", "b", "c"], 0], ["active", ["a"], 1],
    ["started", ["a", "b"], 0], ["completed", ["a"], 0],
    ["enrolled", [], 0], ["needs_check_in", [], 3],
  ] as const)("selects %s without duplicate learners", (filter, expected, unknownCount) => {
    expect(selectMvpLearners(filter, ["a", "b", "c", "a"], evidence)).toEqual({ ids: [...expected], unknownCount });
  });
  it("keeps unknown schedules separate from nonmatching statuses", () => {
    expect(selectMvpLearners("enrolled", ["a"], { ...evidence, upcoming: null })).toEqual({ ids: [], unknownCount: 1 });
    expect(selectMvpLearners("completed", ["a"], { ...evidence, completed: null })).toEqual({ ids: [], unknownCount: 1 });
    expect(selectMvpLearners("enrolled", ["a"], { ...evidence, upcoming: true }).ids).toEqual(["a"]);
  });
  it("selects only flagged check-ins", () => {
    const checkIns = ["flagged", "not_evaluated", "no_flags"].map((checkInStatus, index) => ({
      learnerId: ["a", "b", "c"][index], programRowId: "p:c", checkInStatus,
      attentionFlags: [], unevaluatedRuleIds: [], unavailableReason: null,
    })) as typeof evidence.checkIns;
    expect(selectMvpLearners("needs_check_in", ["a", "b", "c"], { ...evidence, checkIns })).toEqual({ ids: ["a"], unknownCount: 1 });
  });
  it("validates the URL value", () => {
    expect(parseMvpLearnerFilter(null)).toBe("all");
    expect(parseMvpLearnerFilter("active")).toBe("active");
    expect(() => parseMvpLearnerFilter("inactive")).toThrow("Invalid learner status");
  });
});
