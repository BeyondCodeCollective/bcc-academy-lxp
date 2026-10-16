import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";
import type { SurveyConfig } from "@/lib/programs/types";

/** True while a survey flagged `afterFirstSession` should stay out of the way. */
export function surveyWaitsForFirstSession(
  survey: Pick<SurveyConfig, "afterFirstSession">,
  hasAttended: boolean,
): boolean {
  return !!survey.afterFirstSession && !hasAttended;
}

/**
 * Has the learner joined or been marked at any session? Attendance rows are
 * written when someone joins a live session or an admin marks them, so this
 * flips on the first session they actually attend. Shared per request because
 * the dashboard layout and page both ask.
 */
export const hasAttendedAnySession = cache(async (userId: string): Promise<boolean> => {
  const { count } = await createServiceClient()
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("student_id", userId);
  return (count ?? 0) > 0;
});
