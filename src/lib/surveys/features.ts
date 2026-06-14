// src/lib/surveys/features.ts
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Surveys (the BCC Learner Intake gate) are OPT-IN — off by default, turned on
 * per program or per track via program_features/track_features.survey_enabled,
 * exactly like the pathway assessment. Returns true if on for the program OR
 * any of the learner's enrolled tracks.
 */
export async function isSurveyEnabledForLearner(
  programSlug: string,
  enrolledTrackSlugs: string[]
): Promise<boolean> {
  const svc = createServiceClient();

  // Program-level flag acts as "on for all tracks in the program".
  const { data: prog } = await svc
    .from("program_features")
    .select("survey_enabled")
    .eq("program_slug", programSlug)
    .maybeSingle();

  if (prog?.survey_enabled) return true;

  // Track-level
  if (enrolledTrackSlugs.length === 0) return false;
  const { data: tracks } = await svc
    .from("track_features")
    .select("survey_enabled")
    .in("track_slug", enrolledTrackSlugs)
    .eq("survey_enabled", true)
    .limit(1);

  return (tracks ?? []).length > 0;
}
