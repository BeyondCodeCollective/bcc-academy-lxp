import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { aggregateLearnerMilestones } from "./learner-milestone-aggregates";
import type { LearnerWeeklyMilestones } from "./learner-activity";
const recorded = { at: "2026-01-01T12:00:00Z", state: "recorded" as const };
const none = { at: null, state: "none_recorded" as const };
const roster = () => Array.from({ length: 15 }, (_, i) => ({ id: `PRIVATE-${i}`, enrollments: [{
  programId: "p1", courseSlug: "a", weeklyMilestones: [{ weekNumber: 1,
    submission: i < 5 ? recorded : none, reflection: i < 10 ? recorded : none, markedWatched: recorded,
  }] as LearnerWeeklyMilestones[],
}] }));
describe("weekly milestone aggregates", () => {
  it("counts distinct learners per activity without exposing identities or timestamps", () => {
    const learners = roster();
    learners[0].enrollments.push(learners[0].enrollments[0]);
    learners[0].enrollments[0].weeklyMilestones.push(learners[0].enrollments[0].weeklyMilestones[0]);
    const result = aggregateLearnerMilestones([...learners, ...learners]);
    expect(result).toEqual({ state: "ready", rows: [{ programId: "p1", courseSlug: "a", weekNumber: 1,
      total: 15, submissions: 5, reflections: 10, markedWatched: 15 }] });
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|2026/);
  });
  it("includes learners without activity in the matching population", () => {
    const learners = roster();
    learners.slice(10).forEach(l => { l.enrollments[0].weeklyMilestones = []; });
    expect(aggregateLearnerMilestones(learners)).toMatchObject({ state: "ready", rows: [{ total: 15, markedWatched: 10 }] });
  });
  it("separates program, course, and course week and sorts consistently", () => {
    const learners = roster();
    learners.forEach(l => {
      const e = l.enrollments[0];
      e.weeklyMilestones.push({ ...e.weeklyMilestones[0], weekNumber: 2 });
      l.enrollments.push({ ...e, programId: "p2" }, { ...e, courseSlug: "b" });
    });
    const result = aggregateLearnerMilestones(learners);
    expect(result.state).toBe("ready");
    if (result.state === "ready") expect(result.rows).toHaveLength(6);
    expect(aggregateLearnerMilestones([...learners].reverse())).toEqual(result);
  });
  it("suppresses small counts and small complementary populations", () => {
    expect(aggregateLearnerMilestones(roster().slice(1))).toEqual({ state: "suppressed" });
    const learners = roster();
    learners[14].enrollments[0].weeklyMilestones[0].markedWatched = none;
    expect(aggregateLearnerMilestones(learners)).toEqual({ state: "suppressed" });
  });
  it("preserves known zeroes and does not invent weeks for an empty dataset", () => {
    const learners = roster();
    learners.forEach(l => { l.enrollments[0].weeklyMilestones[0].submission = none; });
    expect(aggregateLearnerMilestones(learners)).toMatchObject({ state: "ready", rows: [{ submissions: 0 }] });
    learners.forEach(l => { l.enrollments[0].weeklyMilestones = []; });
    expect(aggregateLearnerMilestones(learners)).toEqual({ state: "empty" });
    expect(aggregateLearnerMilestones([])).toEqual({ state: "empty" });
  });
  it.each([null, 0, -1, 1.5])("does not assign unmapped activity to an invented week: %s", weekNumber => {
    const learners = roster();
    learners[0].enrollments[0].weeklyMilestones[0].weekNumber = weekNumber;
    expect(aggregateLearnerMilestones(learners)).toEqual({ state: "unavailable" });
  });
  it.each(["submission", "reflection", "markedWatched"] as const)("does not count unavailable %s evidence as zero", kind => {
    const learners = roster();
    learners[0].enrollments[0].weeklyMilestones[0][kind] = { at: null, state: "unavailable" };
    expect(aggregateLearnerMilestones(learners)).toEqual({ state: "unavailable" });
  });
});
