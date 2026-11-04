import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MvpOfferingActiveConfig } from "./active-config";
import type { MvpSignalPolicy } from "./check-in-signals";
import type { MvpAttendanceSessionState } from "./attendance-verification";
import type { LearnerWeeklyMilestones } from "./learner-activity";
const mocks = vi.hoisted(() => ({ config: vi.fn(), policy: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./active-config", async original => ({ ...await original<typeof import("./active-config")>(), getMvpOfferingActiveConfig: mocks.config }));
vi.mock("./check-in-signals", async original => ({ ...await original<typeof import("./check-in-signals")>(), getMvpSignalPolicy: mocks.policy }));
import { evaluateLearnerCheckIns } from "./learner-check-ins";
const asOf = new Date("2026-10-20T00:00:00Z");
const config: MvpOfferingActiveConfig = { programSlug: "one", courseSlug: "a", kind: "cohort", attendanceThreshold: 80,
  submissionGraceDays: 14, requiredAssignments: [{ id: "work", label: "Week 1 work", weekNumber: 1, dueAt: "2026-10-01T00:00:00Z" }] };
const none = { at: null, state: "none_recorded" as const };
function run(states: MvpAttendanceSessionState["state"][] | null, weeklyMilestones: LearnerWeeklyMilestones[] = []) {
  return evaluateLearnerCheckIns([{ id: "s1", enrollments: [{ programId: "p1", courseSlug: "a", weeklyMilestones,
    attendanceSessions: states?.map((state, i) => ({ weekNumber: i + 1, sessionNumber: 1, state })) ?? null }] }], [{ id: "p1", slug: "one" }], asOf)[0].enrollments[0];
}
beforeEach(() => { vi.clearAllMocks(); mocks.config.mockReturnValue(null); mocks.policy.mockReturnValue(null); });
describe("evidence-backed learner check-ins", () => {
  it("requires two verified absences, not missing or excused records", () => {
    expect(run(["verified_absent", "verified_absent", "unrecorded"]).status).toBe("needs_check_in");
    for (const states of [["verified_absent", "excused"], ["unrecorded", "unrecorded"], ["verified_absent", "unresolved"], ["verified_present"]] as MvpAttendanceSessionState["state"][][]) {
      expect(run(states).status).toBe("not_evaluated");
    }
    expect(run(null).status).toBe("not_evaluated");
  });
  it("does not invent required work when no offering policy is configured", () => {
    const result = run(["verified_present"]);
    expect(result.checkIn.attentionFlags).toEqual([]);
    expect(result.checkIn.unevaluatedRuleIds).toContain("offering-requirements-unconfigured");
    expect(mocks.config).toHaveBeenCalledWith("one", "a");
  });
  it("flags only configured work after its grace deadline, retaining missing attendance as unknown", () => {
    mocks.config.mockReturnValue(config);
    const result = run(null);
    expect(result.status).toBe("needs_check_in");
    expect(result.checkIn.attentionFlags[0].reason).toBe("missing_required_submission");
    expect(result.checkIn.unevaluatedRuleIds).toContain("framework-missed-sessions-v1");
    mocks.config.mockReturnValue({ ...config, submissionGraceDays: 19 });
    expect(run(["verified_present"]).checkIn.attentionFlags).toEqual([]);
  });
  it("clears missing work after a recorded submission but never with invalid or unmapped evidence", () => {
    mocks.config.mockReturnValue(config);
    const week: LearnerWeeklyMilestones = { weekNumber: 1, submission: { at: "2026-10-18T00:00:00Z", state: "recorded" }, reflection: none, markedWatched: none };
    expect(run(["verified_present"], [week]).status).toBe("on_track");
    expect(run(["verified_present"], [{ ...week, submission: { at: null, state: "unavailable" } }]).status).toBe("not_evaluated");
    expect(run(["verified_present"], [{ ...week, weekNumber: null }]).status).toBe("not_evaluated");
  });
  it("evaluates explicitly configured video checkpoints without inventing viewing evidence", () => {
    const policy: MvpSignalPolicy = { programSlug: "one", courseSlug: "a", progress: { source: "required_videos", dueAt: "2026-10-01T00:00:00Z", requiredWeeks: [1, 2], minimumPercent: 80 } };
    mocks.policy.mockReturnValue(policy);
    expect(run(null).checkIn.attentionFlags[0].reason).toBe("behind_expected_progress");
    expect(run(null, [{ weekNumber: null, submission: none, reflection: none, markedWatched: { at: "2026-10-01T00:00:00Z", state: "recorded" } }]).status).toBe("not_evaluated");
  });
  it("keeps configured assessment rules unevaluated until assessment evidence is connected", () => {
    mocks.config.mockReturnValue({ ...config, requiredAssignments: [] });
    mocks.policy.mockReturnValue({ programSlug: "one", courseSlug: "a", assessment: { examId: "exam", minimumPercent: 80 } });
    expect(run(["verified_present"]).status).toBe("not_evaluated");
  });
});
