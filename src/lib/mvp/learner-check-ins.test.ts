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
  it("returns scoped session evidence without calling nonconsecutive absences consecutive", () => {
    const result = run(["verified_absent", "excused", "verified_absent", "unrecorded"]);
    expect(result.checkIn.attentionFlags[0]).toMatchObject({ learnerId: "s1", programId: "p1", courseSlug: "a",
      ruleId: "framework-missed-sessions-v1", detectedAt: asOf.toISOString(), supportingEvidence: {
        kind: "verified_absences", count: 2, threshold: 2,
        sessions: [{ weekNumber: 1, sessionNumber: 1, state: "verified_absent" }, { weekNumber: 3, sessionNumber: 1, state: "verified_absent" }],
      } });
    expect(result.checkIn.attentionFlags[0].explanation).not.toContain("consecutive");
  });
  it("returns only overdue missing assignments with their deadline and grace evidence", () => {
    mocks.config.mockReturnValue({ ...config, requiredAssignments: [
      ...config.requiredAssignments!,
      { id: "submitted", label: "Already submitted", weekNumber: 2, dueAt: "2026-10-01T00:00:00Z" },
      { id: "future", label: "Future work", weekNumber: 3, dueAt: "2026-11-01T00:00:00Z" },
    ] });
    const result = run(null, [{ weekNumber: 2, submission: { at: "2026-10-02T00:00:00Z", state: "recorded" }, reflection: none, markedWatched: none }]);
    expect(result.checkIn.attentionFlags[0].supportingEvidence).toEqual({ kind: "overdue_required_submissions", count: 1, threshold: 1,
      assignments: [{ assignmentId: "work", label: "Week 1 work", weekNumber: 1, dueAt: "2026-10-01T00:00:00Z", graceDays: 14,
        graceEndsAt: "2026-10-15T00:00:00.000Z", submittedAt: null, state: "none_recorded" }] });
    expect(result.checkIn.attentionFlags[0].evidence[0].sourceRecordId).toBe(JSON.stringify(["one", "a", "work"]));
  });
  it("returns required video weeks, recorded marks, and the configured checkpoint", () => {
    mocks.policy.mockReturnValue({ programSlug: "one", courseSlug: "a", progress: {
      source: "required_videos", dueAt: "2026-10-01T00:00:00Z", requiredWeeks: [2, 1], minimumPercent: 80,
    } });
    const result = run(null, [{ weekNumber: 1, submission: none, reflection: none, markedWatched: { at: "2026-10-02T00:00:00Z", state: "recorded" } }]);
    expect(result.checkIn.attentionFlags[0].supportingEvidence).toEqual({ kind: "required_video_checkpoint",
      dueAt: "2026-10-01T00:00:00Z", minimumPercent: 80, recordedPercent: 50, requiredCount: 2, markedCount: 1,
      weeks: [{ weekNumber: 1, markedWatchedAt: "2026-10-02T00:00:00Z", state: "recorded" },
        { weekNumber: 2, markedWatchedAt: null, state: "none_recorded" }] });
  });
  it("keeps evidence scoped and projects no private source fields", () => {
    const sessions = [1, 2].map(weekNumber => ({ weekNumber, sessionNumber: 1, state: "verified_absent" as const, reviewNotes: "PRIVATE", recorded_by: "PRIVATE" }));
    const results = evaluateLearnerCheckIns([{ id: "s1", enrollments: [
      { programId: "p1", courseSlug: "a", attendanceSessions: sessions, weeklyMilestones: [] },
      { programId: "p2", courseSlug: "b", attendanceSessions: null, weeklyMilestones: [] },
    ] }, { id: "s2", enrollments: [{ programId: "p1", courseSlug: "a", attendanceSessions: null, weeklyMilestones: [] }] }],
    [{ id: "p1", slug: "one" }, { id: "p2", slug: "two" }], asOf);
    const checkIns = results.flatMap(row => row.enrollments.map(enrollment => enrollment.checkIn));
    expect(checkIns.map(row => row.attentionFlags.length)).toEqual([1, 0, 0]);
    expect(JSON.stringify(checkIns)).not.toContain("PRIVATE");
    expect(Object.keys(checkIns[0].attentionFlags[0].supportingEvidence)).toEqual(["kind", "count", "threshold", "sessions"]);
  });
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
