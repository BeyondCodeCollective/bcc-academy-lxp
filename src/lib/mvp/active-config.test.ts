import { describe, expect, it } from "vitest";
import { getMvpOfferingActiveConfig, MVP_ACTIVE_DEFAULTS, toMvpActiveRule, validateMvpActiveConfigs,
  type MvpOfferingActiveConfig, type MvpRequiredAssignment } from "./active-config";

// Fictional fixtures demonstrate the shape without assigning real policies.
const assignment: MvpRequiredAssignment = { id: "project-1", label: "Project 1", weekNumber: 1, dueAt: "2026-10-10T21:00:00Z" };
const cohort = (work: readonly MvpRequiredAssignment[] | null = [assignment]): MvpOfferingActiveConfig => ({
  programSlug: "example-program", courseSlug: "example-course", kind: "cohort",
  ...MVP_ACTIVE_DEFAULTS, requiredAssignments: work,
});

describe("MVP active configuration", () => {
  it("does not auto-configure a real offering", () => {
    expect(getMvpOfferingActiveConfig("catalyst", "example-course")).toBeNull();
  });
  it("looks up by both program and course", () => {
    const config = cohort();
    expect(getMvpOfferingActiveConfig("example-program", "example-course", [config])).toEqual(config);
    expect(getMvpOfferingActiveConfig("other-program", "example-course", [config])).toBeNull();
  });
  it("permits a shared slug with distinct program policies", () => {
    expect(() => validateMvpActiveConfigs([cohort(), { ...cohort(), programSlug: "other-program" }])).not.toThrow();
  });
  it("rejects duplicate offering policies", () => {
    expect(() => validateMvpActiveConfigs([cohort(), cohort()])).toThrow("Duplicate");
  });
  it("distinguishes unconfirmed requirements from confirmed no required work", () => {
    expect(toMvpActiveRule(cohort(null))).toBeNull();
    expect(toMvpActiveRule(cohort([]))).toEqual({ kind: "cohort", attendanceThreshold: 80, submissionsRequired: false });
    expect(toMvpActiveRule(cohort())).toEqual({ kind: "cohort", attendanceThreshold: 80, submissionsRequired: true });
    expect(toMvpActiveRule(null)).toBeNull();
  });
  it("supports single events without cohort assumptions", () => {
    expect(toMvpActiveRule({ programSlug: "example", courseSlug: "event", kind: "single_event" })).toEqual({ kind: "single_event" });
  });
  it.each(["2026-10-10", "2026-02-30T21:00:00Z", "2026-10-10T21:00:00", "invalid"])("rejects invalid or ambiguous deadline %s", (dueAt) => {
    expect(() => validateMvpActiveConfigs([cohort([{ ...assignment, dueAt }])])).toThrow("dueAt");
  });
  it("rejects ambiguous assignment-to-submission mappings", () => {
    expect(() => validateMvpActiveConfigs([cohort([assignment, { ...assignment, id: "another" }])])).toThrow("unique");
  });
  it("validates configurable thresholds and grace days", () => {
    const config = cohort();
    if (config.kind !== "cohort") throw new Error("Invalid fixture");
    expect(() => validateMvpActiveConfigs([{ ...config, attendanceThreshold: 101 }])).toThrow("threshold");
    expect(() => validateMvpActiveConfigs([{ ...config, submissionGraceDays: -1 }])).toThrow("grace");
    expect(() => validateMvpActiveConfigs([{ ...config, submissionGraceDays: 1.5 }])).toThrow("grace");
  });
});
