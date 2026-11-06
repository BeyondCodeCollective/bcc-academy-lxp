import type { loadMvpLearnerEvidence } from "../learner-evidence-actions";
import type { LearnerFilters } from "./learner-filters";

export type EvidenceResult = Awaited<ReturnType<typeof loadMvpLearnerEvidence>>;
export type EvidenceResponse = { key: string; result: EvidenceResult };

// This is a display safeguard, not authorization. The server rechecks access.
// Never partially render a response containing evidence for another person or
// offering. A stale request must show loading, not its old result or error.
export function currentEvidenceResult(response: EvidenceResponse | null, key: string, learnerId: string, filters: LearnerFilters): EvidenceResult | null {
  if (!response || response.key !== key) return null;
  const result = response.result;
  if (result.state !== "ready") return result;
  const mismatch = result.evidence.id !== learnerId || result.evidence.enrollments.some(course =>
    (!!filters.programId && course.programId !== filters.programId) ||
    (!!filters.courseSlug && course.courseSlug !== filters.courseSlug) ||
    course.checkIn.attentionFlags.some(flag => flag.learnerId !== learnerId ||
      flag.programId !== course.programId || flag.courseSlug !== course.courseSlug));
  return mismatch ? { state: "unavailable" } : result;
}
