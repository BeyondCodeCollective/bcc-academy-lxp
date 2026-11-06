"use server";

import { getSessionContext } from "@/lib/auth/session";
import { getMvpLearnerEvidence } from "@/lib/mvp/learner-queries";
import type { LearnerQueryParams } from "@/lib/mvp/learner-roster";

export async function loadMvpLearnerEvidence(learnerId: string, params: LearnerQueryParams) {
  try {
    const context = await getSessionContext();
    if (!context?.userId || context.student?.role !== "super_admin") throw new Error("Access denied");
    // The loader independently checks preview mode, grants, and membership.
    const evidence = await getMvpLearnerEvidence(learnerId, params);
    return evidence ? { state: "ready" as const, evidence } : { state: "unavailable" as const };
  } catch {
    // Do not disclose whether a denied learner exists or expose database errors.
    return { state: "error" as const };
  }
}
