import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ participants: vi.fn(), policy: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./detail-queries", () => ({ getMvpProgramParticipants: mocks.participants }));
vi.mock("./participant-progress", async original => ({
  ...await original<typeof import("./participant-progress")>(), getParticipantProgressPolicy: mocks.policy,
}));
import { loadLearnerProgress } from "./learner-progress";
const programs = [{ id: "p1", slug: "one" }, { id: "p2", slug: "two" }];
const enrollment = { programId: "p1", courseSlug: "a", courseName: "Course A" };
const directory = [{ id: "s1", enrollments: [enrollment] }, { id: "s2", enrollments: [enrollment] }];
const progress = { percent: 50, completedSessions: 1, applicableSessions: 2, unavailableReason: null };
const participant = (learnerId: string) => ({ learnerId, ...enrollment, caughtUp: progress, email: "private@example.test" });
beforeEach(() => { vi.resetAllMocks(); mocks.policy.mockReturnValue(null); });
describe("learner enrollment progress", () => {
  it("reuses the unconfigured-policy result without activity queries or invented zero", async () => {
    const result = await loadLearnerProgress(directory, programs);
    expect(result[0].enrollments[0]).toMatchObject({ courseName: "Course A", caughtUp: {
      percent: null, completedSessions: null, applicableSessions: null,
      unavailableReason: "Complete participant requirements are not configured for this offering.",
    } });
    expect(mocks.participants).not.toHaveBeenCalled();
    expect(directory[0].enrollments[0]).not.toHaveProperty("caughtUp");
  });
  it("loads once per offering and projects only selected learners' calculated progress", async () => {
    mocks.policy.mockReturnValue({});
    mocks.participants.mockResolvedValue({ participants: [participant("s1"), participant("s2"), participant("other")] });
    const result = await loadLearnerProgress(directory, programs);
    expect(mocks.participants).toHaveBeenCalledExactlyOnceWith({ programId: "p1", courseSlug: "a" });
    expect(result.map(row => row.id)).toEqual(["s1", "s2"]);
    expect(result[0].enrollments[0].caughtUp).toEqual(progress);
    expect(JSON.stringify(result)).not.toContain("private@example.test");
  });
  it("keeps the same course slug in different programs separate, preserving unknown and zero", async () => {
    mocks.policy.mockReturnValue({});
    mocks.participants.mockImplementation(async ({ programId }) => ({ participants: [{ ...participant("s1"), programId,
      caughtUp: programId === "p1" ? { ...progress, percent: 0, completedSessions: 0 } :
        { percent: null, completedSessions: null, applicableSessions: null, unavailableReason: "Missing evidence" },
    }] }));
    const result = await loadLearnerProgress([{ id: "s1", enrollments: [enrollment, { ...enrollment, programId: "p2" }] }], programs);
    expect(result[0].enrollments.map(row => row.caughtUp.percent)).toEqual([0, null]);
    expect(mocks.participants).toHaveBeenCalledTimes(2);
    expect(result[0]).not.toHaveProperty("caughtUp");
  });
  it.each(["missing", "duplicate", "scope", "denied"])("fails closed for %s evidence", async kind => {
    mocks.policy.mockReturnValue({});
    if (kind === "denied") mocks.participants.mockRejectedValue(new Error("MVP access is required."));
    else mocks.participants.mockResolvedValue({ participants: kind === "missing" ? [] : kind === "duplicate" ?
      [participant("s1"), participant("s1")] : [{ ...participant("s1"), programId: "p2" }] });
    await expect(loadLearnerProgress(directory, programs)).rejects.toThrow();
  });
  it("does not load courses outside the supplied page or unknown program scope", async () => {
    expect(await loadLearnerProgress([], programs)).toEqual([]);
    await expect(loadLearnerProgress(directory, [])).rejects.toThrow("scope is unavailable");
    expect(mocks.participants).not.toHaveBeenCalled();
  });
});
