import type { MvpActiveRule } from "./active-learners";

// Configuration is scoped to an exact program/course pair, never a course
// slug alone. Deadlines are explicit UTC instants, not inferred session dates.
export type MvpRequiredAssignment = {
  id: string;
  label: string;
  weekNumber: number;
  dueAt: string;
};

export type MvpOfferingActiveConfig = {
  programSlug: string;
  courseSlug: string;
} & (
  | { kind: "single_event" }
  | {
      kind: "cohort";
      attendanceThreshold: number;
      submissionGraceDays: number;
      // null = requirements unconfirmed; [] = confirmed no required work.
      requiredAssignments: readonly MvpRequiredAssignment[] | null;
    }
);

// Mica's approved starting values. These do not enroll any offering into a
// rule automatically; each registry entry must explicitly select its policy.
export const MVP_ACTIVE_DEFAULTS = {
  attendanceThreshold: 80,
  submissionGraceDays: 14,
} as const;

// Populate only after program owners confirm offering type and requirements.
// Keep illustrative/fake courses in tests, not in the live registry.
export const MVP_OFFERING_ACTIVE_CONFIGS: readonly MvpOfferingActiveConfig[] = [];

// Fail on invalid or duplicate policies rather than silently choosing one.
// Current submissions storage identifies work by course/week, so two required
// assignments cannot share a week until a stronger assignment key is available.
export function validateMvpActiveConfigs(configs: readonly MvpOfferingActiveConfig[]): void {
  const offerings = new Set<string>();
  for (const config of configs) {
    if (![config.programSlug, config.courseSlug].every((slug) => slug.length > 0 && slug === slug.trim())) {
      throw new Error("Active configuration requires exact nonempty program and course slugs.");
    }
    const key = JSON.stringify([config.programSlug, config.courseSlug]);
    if (offerings.has(key)) throw new Error("Duplicate offering active configuration.");
    offerings.add(key);
    if (config.kind === "single_event") continue;
    if (!Number.isFinite(config.attendanceThreshold) || config.attendanceThreshold <= 0 || config.attendanceThreshold > 100) {
      throw new Error("Invalid active attendance threshold.");
    }
    if (!Number.isInteger(config.submissionGraceDays) || config.submissionGraceDays < 0) {
      throw new Error("Submission grace days must be a nonnegative integer.");
    }
    const ids = new Set<string>();
    const weeks = new Set<number>();
    for (const assignment of config.requiredAssignments ?? []) {
      if (!assignment.id.trim() || assignment.id !== assignment.id.trim() || !assignment.label.trim()) {
        throw new Error("Required assignments need an ID and label.");
      }
      if (ids.has(assignment.id) || weeks.has(assignment.weekNumber)) {
        throw new Error("Required assignment IDs and week mappings must be unique within an offering.");
      }
      if (!Number.isInteger(assignment.weekNumber) || assignment.weekNumber < 1) {
        throw new Error("Required assignments need a positive integer week number.");
      }
      const date = new Date(assignment.dueAt);
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(assignment.dueAt) ||
          !Number.isFinite(date.getTime()) || date.toISOString() !== assignment.dueAt.replace("Z", ".000Z")) {
        throw new Error("Assignment dueAt must be a valid UTC timestamp: YYYY-MM-DDTHH:mm:ssZ.");
      }
      ids.add(assignment.id);
      weeks.add(assignment.weekNumber);
    }
  }
}

// Exact lookup prevents another program's policy being reused for the same
// course slug. Unconfigured offerings deliberately return null.
export function getMvpOfferingActiveConfig(
  programSlug: string,
  courseSlug: string,
  configs: readonly MvpOfferingActiveConfig[] = MVP_OFFERING_ACTIVE_CONFIGS,
): MvpOfferingActiveConfig | null {
  validateMvpActiveConfigs(configs);
  return configs.find((config) => config.programSlug === programSlug && config.courseSlug === courseSlug) ?? null;
}

// Unknown assignment requirements must not turn into attendance-only status.
export function toMvpActiveRule(config: MvpOfferingActiveConfig | null): MvpActiveRule | null {
  if (!config) return null;
  validateMvpActiveConfigs([config]);
  if (config.kind === "single_event") return { kind: "single_event" };
  if (config.requiredAssignments === null) return null;
  return {
    kind: "cohort",
    attendanceThreshold: config.attendanceThreshold,
    submissionsRequired: config.requiredAssignments.length > 0,
  };
}
