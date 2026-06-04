// src/lib/assessment/features.ts
import { createServiceClient } from "@/lib/supabase/server";

export async function isAssessmentEnabled(programSlug: string): Promise<boolean> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("program_features")
    .select("assessment_enabled")
    .eq("program_slug", programSlug)
    .maybeSingle();
  return data?.assessment_enabled ?? false;
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
