"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import {
  MAX_HOURS_LENGTH,
  MAX_UNCLEAR_LENGTH,
  asksHours,
  cleanText,
  parseUnderstanding,
} from "@/lib/exit-survey";

export type ExitSurveyRow = {
  understanding: number | null;
  unclear_text: string | null;
  hours_text: string | null;
};

// The learner must be enrolled in a course that turned the survey on. Without
// this check the action would write rows for any track slug a caller names.
async function requireEnrolledLearner(trackSlug: string) {
  const ctx = await getSessionContext();
  if (!ctx) throw new Error("Not signed in");
  const svc = createServiceClient();
  const [{ data: enrollment }, { data: override }] = await Promise.all([
    svc
      .from("student_tracks")
      .select("program_id")
      .eq("student_id", ctx.userId)
      .eq("track_slug", trackSlug)
      .maybeSingle<{ program_id: string | null }>(),
    svc
      .from("track_overrides")
      .select("exit_survey_enabled")
      .eq("track_slug", trackSlug)
      .eq("exit_survey_enabled", true)
      .limit(1)
      .maybeSingle(),
  ]);
  if (!enrollment || !override) throw new Error("Survey not available for this course");
  return { svc, userId: ctx.userId, programId: enrollment.program_id };
}

function validSlot(weekNumber: number, sessionNumber: number) {
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 200) throw new Error("Bad week");
  if (!Number.isInteger(sessionNumber) || sessionNumber < 1 || sessionNumber > 5) throw new Error("Bad session");
}

/** Rating plus "what was unclear". Leaves the hours column alone. */
export async function submitExitSurvey(
  trackSlug: string,
  weekNumber: number,
  sessionNumber: number,
  understanding: number,
  unclear: string,
) {
  validSlot(weekNumber, sessionNumber);
  const rating = parseUnderstanding(understanding);
  if (rating === null) throw new Error("Pick a rating from 1 to 5");
  if (unclear.trim().length > MAX_UNCLEAR_LENGTH) throw new Error("That answer is too long");
  const { svc, userId, programId } = await requireEnrolledLearner(trackSlug);

  const { error } = await svc.from("session_exit_surveys").upsert(
    {
      student_id: userId,
      program_id: programId,
      track_slug: trackSlug,
      week_number: weekNumber,
      session_number: sessionNumber,
      understanding: rating,
      unclear_text: cleanText(unclear, MAX_UNCLEAR_LENGTH),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,track_slug,week_number,session_number" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/track/${trackSlug}/${weekNumber}`);
  return { success: true };
}

/** Monday hours answer. Leaves the rating columns alone. */
export async function submitExitHours(trackSlug: string, weekNumber: number, hours: string) {
  validSlot(weekNumber, 1);
  if (!asksHours(weekNumber, 1)) throw new Error("No hours question for this week");
  const text = cleanText(hours, MAX_HOURS_LENGTH);
  if (!text) throw new Error("Enter a number of hours");
  const { svc, userId, programId } = await requireEnrolledLearner(trackSlug);

  const { error } = await svc.from("session_exit_surveys").upsert(
    {
      student_id: userId,
      program_id: programId,
      track_slug: trackSlug,
      week_number: weekNumber,
      session_number: 1,
      hours_text: text,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,track_slug,week_number,session_number" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/track/${trackSlug}/${weekNumber}`);
  return { success: true };
}

/**
 * The signed-in learner's rows for one week, keyed by session number, or null
 * when they are not enrolled (an admin looking at the page, say), so the page
 * shows them no survey.
 */
export async function getMyExitSurveys(
  trackSlug: string,
  weekNumber: number,
): Promise<Record<number, ExitSurveyRow> | null> {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const svc = createServiceClient();
  const [{ data: enrollment }, { data }] = await Promise.all([
    svc
      .from("student_tracks")
      .select("student_id")
      .eq("student_id", ctx.userId)
      .eq("track_slug", trackSlug)
      .maybeSingle(),
    svc
      .from("session_exit_surveys")
      .select("session_number, understanding, unclear_text, hours_text")
      .eq("student_id", ctx.userId)
      .eq("track_slug", trackSlug)
      .eq("week_number", weekNumber),
  ]);
  if (!enrollment) return null;
  const out: Record<number, ExitSurveyRow> = {};
  for (const r of (data ?? []) as (ExitSurveyRow & { session_number: number })[]) {
    out[r.session_number] = r;
  }
  return out;
}
