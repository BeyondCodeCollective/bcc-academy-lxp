import { describe, expect, it } from "vitest";
import { evaluateMvpRequiredWork, type MvpSubmissionRecord } from "./required-work";
import type { MvpOfferingActiveConfig } from "./active-config";

// Fictional policies exercise inclusive UTC deadlines without configuring live offerings.
const config: Extract<MvpOfferingActiveConfig, { kind: "cohort" }> = {
  programSlug: "example", courseSlug: "course", kind: "cohort", attendanceThreshold: 80,
  submissionGraceDays: 14,
  requiredAssignments: [{ id: "work", label: "Required work", weekNumber: 1, dueAt: "2026-09-01T12:00:00Z" }],
};
const record = (submitted_at: string | null): MvpSubmissionRecord => ({
  id: "s", student_id: "learner", track_slug: "course", week_number: 1, submitted_at,
});
const after = new Date("2026-09-16T12:00:00Z");

describe("required submissions with grace", () => {
  it.each(["2026-09-01T12:00:00Z", "2026-09-15T12:00:00Z"])("accepts on-time work including the exact grace boundary: %s", (time) => {
    expect(evaluateMvpRequiredWork(config, "learner", [record(time)], after)).toBe(true);
  });
  it("rejects work one millisecond after grace", () => {
    expect(evaluateMvpRequiredWork(config, "learner", [record("2026-09-15T12:00:00.001Z")], after)).toBe(false);
  });
  it("keeps missing work pending through the inclusive deadline", () => {
    expect(evaluateMvpRequiredWork(config, "learner", [], new Date("2026-09-15T12:00:00Z"))).toBeNull();
    expect(evaluateMvpRequiredWork(config, "learner", [], after)).toBe(false);
  });
  it("does not require future work or count drafts as submitted", () => {
    expect(evaluateMvpRequiredWork(config, "learner", null, new Date("2026-08-31T12:00:00Z"))).toBe(true);
    expect(evaluateMvpRequiredWork(config, "learner", [record(null)], after)).toBe(false);
  });
  it("does not borrow another learner, course, or week's evidence", () => {
    const base = record("2026-09-01T12:00:00Z");
    expect(evaluateMvpRequiredWork(config, "learner", [
      { ...base, student_id: "other" }, { ...base, track_slug: "other" }, { ...base, week_number: 2 },
    ], after)).toBe(false);
  });
  it.each(["invalid", "2027-01-01T00:00:00Z"])("preserves unknown for unusable timestamp %s", (time) => {
    expect(evaluateMvpRequiredWork(config, "learner", [record(time)], after)).toBeNull();
  });
  it("distinguishes unknown requirements from confirmed no required work", () => {
    expect(evaluateMvpRequiredWork({ ...config, requiredAssignments: null }, "learner", [], after)).toBeNull();
    expect(evaluateMvpRequiredWork({ ...config, requiredAssignments: [] }, "learner", [], after)).toBe(true);
    expect(evaluateMvpRequiredWork(config, "learner", null, after)).toBeNull();
  });
  it("requires every due assignment and honors program-specific grace", () => {
    const work = [record("2026-09-03T12:00:00Z")];
    expect(evaluateMvpRequiredWork({ ...config, submissionGraceDays: 1 }, "learner", work, after)).toBe(false);
    expect(evaluateMvpRequiredWork({ ...config, requiredAssignments: [...config.requiredAssignments!,
      { id: "two", label: "Second work", weekNumber: 2, dueAt: "2026-09-01T12:00:00Z" }],
    }, "learner", work, after)).toBe(false);
  });
  it("does not impose submissions on single events", () => {
    expect(evaluateMvpRequiredWork({ programSlug: "example", courseSlug: "course", kind: "single_event" }, "learner", null, after)).toBe(true);
  });
});
