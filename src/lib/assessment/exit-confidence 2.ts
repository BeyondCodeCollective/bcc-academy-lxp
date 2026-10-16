import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

/**
 * Is this learner due the exit confidence re-ask? Yes when they answered the
 * entry baseline, have not answered the exit yet, and have a track completion.
 * Completion is any `track_completions` row (admin-granted or self-recorded),
 * so the prompt fires wherever the platform already marks a learner as done.
 */
export async function isExitConfidencePending(studentId: string): Promise<boolean> {
  const svc = createServiceClient();
  const [confidence, completion] = await Promise.all([
    svc.from("lpat_confidence").select("phase").eq("student_id", studentId),
    svc.from("track_completions").select("id").eq("student_id", studentId).limit(1),
  ]);
  const phases = new Set((confidence.data ?? []).map((r) => r.phase as string));
  return phases.has("entry") && !phases.has("exit") && (completion.data ?? []).length > 0;
}
