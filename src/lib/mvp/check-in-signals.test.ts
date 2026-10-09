import { describe, expect, it } from "vitest";
import { buildMvpAdditionalSignals, getMvpSignalPolicy, type MvpSignalPolicy } from "./check-in-signals";
import type { MvpOfferingActiveConfig } from "./active-config";
import { evaluateMvpCourseCheckIns } from "./check-ins";

const config: MvpOfferingActiveConfig = { programSlug: "p", courseSlug: "c", kind: "cohort", attendanceThreshold: 80,
  submissionGraceDays: 14, requiredAssignments: [{ id: "a", label: "Project", weekNumber: 1, dueAt: "2026-09-01T12:00:00Z" }] };
const base = { learnerId: "u", courseSlug: "c", asOf: new Date("2026-10-01T12:00:00Z"), activeConfig: config,
  submissions: [], policy: null, exams: [], videos: [] };
const policy: MvpSignalPolicy = { programSlug: "p", courseSlug: "c", assessment: { examId: "exam", minimumPercent: 70 },
  progress: { source: "required_videos", dueAt: "2026-09-20T12:00:00Z", requiredWeeks: [1, 2], minimumPercent: 80 } };
const exam = { id: "e", student_id: "u", exam_id: "exam", submitted_at: "2026-09-21T12:00:00Z", score: 4, total: 10 };

describe("additional check-in evidence", () => {
  it("flags still-missing work after the inclusive grace window", () => {
    expect(buildMvpAdditionalSignals(base).observations.missing_required_submission?.value).toBe(1);
    expect(buildMvpAdditionalSignals({ ...base, asOf: new Date("2026-09-15T12:00:00Z") }).observations.missing_required_submission?.value).toBe(0);
  });
  it("clears missing-work attention after a late submission without rewriting active timeliness", () => {
    expect(buildMvpAdditionalSignals({ ...base, submissions: [{ id: "s", student_id: "u", track_slug: "c", week_number: 1,
      submitted_at: "2026-09-25T12:00:00Z" }] }).observations.missing_required_submission?.value).toBe(0);
  });
  it("does not use another learner's submission or a draft", () => {
    expect(buildMvpAdditionalSignals({ ...base, submissions: [{ id: "s", student_id: "other", track_slug: "c", week_number: 1,
      submitted_at: "2026-09-02T12:00:00Z" }, { id: "draft", student_id: "u", track_slug: "c", week_number: 1, submitted_at: null }] })
      .observations.missing_required_submission?.value).toBe(1);
  });
  it("keeps corrupt submission timestamps unknown", () => {
    expect(buildMvpAdditionalSignals({ ...base, submissions: [{ id: "s", student_id: "u", track_slug: "c", week_number: 1,
      submitted_at: "bad" }] }).observations.missing_required_submission?.value).toBeNull();
  });
  it("uses the latest completed mapped assessment, not best or unrelated attempts", () => {
    expect(buildMvpAdditionalSignals({ ...base, policy, exams: [exam, { ...exam, id: "old", score: 10, submitted_at: "2026-09-01T12:00:00Z" },
      { ...exam, student_id: "other", score: 9 }] }).observations.low_assessment?.value).toBe(40);
    expect(buildMvpAdditionalSignals({ ...base, policy, exams: [exam, { ...exam, id: "new", score: 9, submitted_at: "2026-09-25T12:00:00Z" }] })
      .observations.low_assessment?.value).toBe(90);
  });
  it("does not treat missing, malformed or ambiguous assessments as a low score", () => {
    for (const exams of [[], [{ ...exam, total: 0 }], [exam, { ...exam, id: "tie" }]]) {
      expect(buildMvpAdditionalSignals({ ...base, policy, exams }).observations.low_assessment?.value).toBeNull();
    }
  });
  it("counts only distinct required watched weeks after the configured checkpoint", () => {
    const video = { id: "v", user_id: "u", track_slug: "c", week_number: 1, video_watched_at: "2026-09-01T12:00:00Z" };
    expect(buildMvpAdditionalSignals({ ...base, policy, videos: [video, { ...video, id: "dup" }, { ...video, week_number: 9 }] })
      .observations.behind_expected_progress?.value).toBe(50);
    expect(buildMvpAdditionalSignals({ ...base, policy, asOf: new Date(policy.progress!.dueAt) }).observations.behind_expected_progress).toBeUndefined();
    expect(buildMvpAdditionalSignals({ ...base, policy, videos: [{ ...video, video_watched_at: "2027-01-01T00:00:00Z" }] })
      .observations.behind_expected_progress?.value).toBeNull();
  });
  it("flags a proven submission issue even when attendance is unresolved, counting the learner once", () => {
    const signals = buildMvpAdditionalSignals({ ...base, policy, exams: [exam] });
    const result = evaluateMvpCourseCheckIns("row", "c", ["u"], [], null, base.asOf,
      { programId: "p", reviews: [] }, new Map([["u", signals]]));
    expect(result.learnersNeedingCheckIn).toBe(1);
    expect(result.evaluations[0].attentionFlags).toHaveLength(3);
    expect(result.evaluations[0].unevaluatedRuleIds).toContain("framework-missed-sessions-v1");
  });
  it("does not invent policies and validates exact program-course ownership", () => {
    expect(getMvpSignalPolicy("other", "c", [policy])).toBeNull();
    expect(getMvpSignalPolicy("p", "c")).toBeNull();
    expect(() => getMvpSignalPolicy("p", "c", [policy, policy])).toThrow();
    expect(() => getMvpSignalPolicy("p", "c", [{ ...policy, assessment: { examId: "exam", minimumPercent: NaN } }])).toThrow();
    expect(() => getMvpSignalPolicy("p", "c", [{ ...policy, progress: { ...policy.progress!, requiredWeeks: [1, 1] } }])).toThrow();
  });
});
