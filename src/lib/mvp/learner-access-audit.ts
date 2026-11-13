import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { logAdminAccess } from "@/app/dashboard/admin/actions-shared";

// Audit only records actually released, grouped by their authorized program.
// Never copy request filters or evidence into audit metadata.
export function auditMvpLearnerView(actorUserId: string, resource: "mvp/learners/directory" | "mvp/learners/evidence",
  learners: readonly { id: string; enrollments: readonly { programId: string }[] }[]) {
  const groups = new Map<string, Set<string>>();
  for (const learner of learners) for (const enrollment of learner.enrollments) {
    const ids = groups.get(enrollment.programId) ?? new Set<string>();
    ids.add(learner.id);
    groups.set(enrollment.programId, ids);
  }
  if (!groups.size) return;
  try {
    const db = createServiceClient();
    for (const [programId, ids] of groups) logAdminAccess(db, {
      actorUserId, programId, action: "view", resource, rowCount: ids.size,
      metadata: { rowUnit: "returned_learners" },
    });
  } catch {
    // Preserve the existing non-blocking audit policy, including setup errors.
    console.error("MVP learner access audit could not be started.");
  }
}
