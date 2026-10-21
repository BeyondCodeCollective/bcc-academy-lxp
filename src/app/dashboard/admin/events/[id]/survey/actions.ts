"use server";

import { revalidatePath } from "next/cache";
import { requireManager, allowedProgramIdsForActor } from "@/app/dashboard/admin/actions-shared";
import { parseSurveyCsv, type SurveyQuestion } from "@/lib/event-survey";

// Set (CSV) or reset (null) the event's parent survey questions. Scoped to the
// programs the actor may manage, like every events action.
export async function saveSurveyQuestions(
  eventId: string,
  csv: string | null,
): Promise<{ ok: true; questions: SurveyQuestion[] | null } | { ok: false; error: string }> {
  const actor = await requireManager();
  const { svc } = actor;
  const allowedIds = allowedProgramIdsForActor(actor);

  let questions: SurveyQuestion[] | null = null;
  if (csv !== null) {
    const parsed = parseSurveyCsv(csv);
    if (!parsed.ok) return parsed;
    questions = parsed.questions;
  }

  let update = svc.from("events").update({ survey_questions: questions, updated_at: new Date().toISOString() }).eq("id", eventId);
  if (allowedIds) update = update.in("program_id", allowedIds);
  const { data, error } = await update.select("id").maybeSingle<{ id: string }>();
  if (error || !data) {
    console.error("[saveSurveyQuestions] update failed:", error);
    return { ok: false, error: "Could not save the survey." };
  }
  revalidatePath(`/dashboard/admin/events/${eventId}/survey`);
  return { ok: true, questions };
}
