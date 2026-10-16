import type { MvpAttendanceReview } from "./attendance-verification";

// Client input cannot set reviewer identity, recorded time, or the new revision.
export type MvpReviewDecision = {
  programId: string; courseSlug: string; learnerId: string;
  weekNumber: number; sessionNumber: number; expectedRevision: number;
  heldAt: string; eligibility: MvpAttendanceReview["eligibility"];
  eligibilityBasis: string | null; outcome: MvpAttendanceReview["outcome"]; reason: string;
};
export type MvpReviewScope = Pick<MvpReviewDecision, "programId" | "courseSlug" | "learnerId" | "weekNumber" | "sessionNumber">;

// Reading history requires only the target scope, not a proposed decision.
export function parseMvpReviewScope(input: unknown): MvpReviewScope {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some(key => !["programId", "courseSlug", "learnerId", "weekNumber", "sessionNumber"].includes(key))) {
    throw new Error("Invalid attendance review scope.");
  }
  const parsed = parseMvpReviewDecision({ ...input, expectedRevision: 0, heldAt: "2000-01-01T00:00:00Z",
    eligibility: "unknown", eligibilityBasis: null, outcome: "unknown", reason: "History lookup" });
  return { programId: parsed.programId, courseSlug: parsed.courseSlug, learnerId: parsed.learnerId,
    weekNumber: parsed.weekNumber, sessionNumber: parsed.sessionNumber };
}
export function parseMvpReviewDecision(input: unknown): MvpReviewDecision {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid attendance review.");
  const value = input as Record<string, unknown>;
  const keys = ["programId", "courseSlug", "learnerId", "weekNumber", "sessionNumber", "expectedRevision", "heldAt", "eligibility", "eligibilityBasis", "outcome", "reason"];
  if (Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !(key in value))) throw new Error("Invalid attendance review fields.");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (![value.programId, value.learnerId].every(id => typeof id === "string" && uuid.test(id)) ||
      typeof value.courseSlug !== "string" || !/^[a-z0-9][a-z0-9_-]{0,199}$/.test(value.courseSlug) ||
      !Number.isSafeInteger(value.weekNumber) || (value.weekNumber as number) < 0 ||
      ![1, 2, 3].includes(value.sessionNumber as number) ||
      !Number.isSafeInteger(value.expectedRevision) || (value.expectedRevision as number) < 0 ||
      typeof value.heldAt !== "string" || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value.heldAt) || !Number.isFinite(Date.parse(value.heldAt)) ||
      !["eligible", "not_eligible", "unknown"].includes(value.eligibility as string) ||
      !["present", "absent", "excused", "unknown"].includes(value.outcome as string) ||
      (value.eligibility !== "eligible" && value.outcome !== "unknown") ||
      typeof value.reason !== "string" || !value.reason.trim() || value.reason.length > 2000 ||
      (value.eligibilityBasis !== null && (typeof value.eligibilityBasis !== "string" || value.eligibilityBasis.length > 2000)) ||
      (value.eligibility !== "unknown" && !(value.eligibilityBasis as string | null)?.trim())) {
    throw new Error("Review requires valid session details, eligibility evidence, and a reason.");
  }
  return { ...value, reason: value.reason.trim(), eligibilityBasis: (value.eligibilityBasis as string | null)?.trim() || null } as MvpReviewDecision;
}
