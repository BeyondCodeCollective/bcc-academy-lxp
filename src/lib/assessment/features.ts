// src/lib/assessment/features.ts
import { createServiceClient } from "@/lib/supabase/server";

// Returns true if the assessment is on for ANY of the learner's enrolled track slugs,
// OR if the program-level flag is on (program-level acts as "on for all tracks").
export async function isAssessmentEnabledForLearner(
  programSlug: string,
  enrolledTrackSlugs: string[]
): Promise<boolean> {
  const svc = createServiceClient();

  // Check program-level first
  const { data: prog } = await svc
    .from("program_features")
    .select("assessment_enabled")
    .eq("program_slug", programSlug)
    .maybeSingle();

  if (prog?.assessment_enabled) return true;

  // Check track-level
  if (enrolledTrackSlugs.length === 0) return false;
  const { data: tracks } = await svc
    .from("track_features")
    .select("assessment_enabled")
    .in("track_slug", enrolledTrackSlugs)
    .eq("assessment_enabled", true)
    .limit(1);

  return (tracks ?? []).length > 0;
}

export async function getProgramFeatures(programSlug: string) {
  const svc = createServiceClient();
  const { data } = await svc
    .from("program_features")
    .select("*")
    .eq("program_slug", programSlug)
    .maybeSingle();
  return data ?? null;
}

export async function setAssessmentEnabled(programSlug: string, enabled: boolean) {
  const svc = createServiceClient();
  await svc
    .from("program_features")
    .upsert({ program_slug: programSlug, assessment_enabled: enabled, updated_at: new Date().toISOString() });
}

export async function setTrackAssessmentEnabled(trackSlug: string, enabled: boolean) {
  const svc = createServiceClient();
  await svc
    .from("track_features")
    .upsert({ track_slug: trackSlug, assessment_enabled: enabled, updated_at: new Date().toISOString() });
}

export async function getTrackFeatures(trackSlugs: string[]) {
  if (trackSlugs.length === 0) return {};
  const svc = createServiceClient();
  const { data } = await svc
    .from("track_features")
    .select("track_slug, assessment_enabled")
    .in("track_slug", trackSlugs);
  return Object.fromEntries((data ?? []).map((r) => [r.track_slug as string, r as { track_slug: string; assessment_enabled: boolean }]));
}
