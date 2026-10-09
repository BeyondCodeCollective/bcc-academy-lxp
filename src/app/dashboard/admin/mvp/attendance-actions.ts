"use server";

import { revalidatePath } from "next/cache";
import { finalizeMvpAttendanceReview, readMvpAttendanceReviewHistory } from "@/lib/mvp/attendance-review-server";

// The service validates input and rechecks session/program/course permissions
// on every call. Reviewer identity is never accepted from the client.
export async function saveMvpAttendanceReviewAction(input: unknown) {
  const saved = await finalizeMvpAttendanceReview(input);
  revalidatePath("/dashboard/admin/mvp");
  return { id: saved.id, revision: saved.revision, recordedAt: saved.recorded_at };
}

// Explicit audit DTO for the future staff form; do not expose arbitrary columns.
export async function readMvpAttendanceReviewHistoryAction(input: unknown) {
  const history = await readMvpAttendanceReviewHistory(input);
  return history.map(row => ({ id: row.id, revision: row.revision, outcome: row.outcome,
    eligibility: row.eligibility, eligibilityBasis: row.eligibility_basis,
    heldAt: row.session_held_at, recordedBy: row.recorded_by, recordedAt: row.recorded_at,
    supersedesId: row.supersedes_id, reason: row.review_reason }));
}
