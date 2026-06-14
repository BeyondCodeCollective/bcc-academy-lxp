"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { canSwitchPrograms } from "@/lib/roles";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!canSwitchPrograms(student?.role ?? "")) throw new Error("Unauthorized");
  return svc;
}

export async function toggleAssessment(programSlug: string, enabled: boolean) {
  const svc = await requireSuperAdmin();
  await svc.from("program_features").upsert({
    program_slug: programSlug,
    assessment_enabled: enabled,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/dashboard/admin/features");
  revalidatePath("/dashboard");
}

export async function toggleTrackAssessment(trackSlug: string, enabled: boolean) {
  const svc = await requireSuperAdmin();
  await svc.from("track_features").upsert({
    track_slug: trackSlug,
    assessment_enabled: enabled,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/dashboard/admin/features");
  revalidatePath("/dashboard");
}

export async function toggleSurvey(programSlug: string, enabled: boolean) {
  const svc = await requireSuperAdmin();
  await svc.from("program_features").upsert({
    program_slug: programSlug,
    survey_enabled: enabled,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/dashboard/admin/features");
  revalidatePath("/dashboard");
}

export async function toggleTrackSurvey(trackSlug: string, enabled: boolean) {
  const svc = await requireSuperAdmin();
  await svc.from("track_features").upsert({
    track_slug: trackSlug,
    survey_enabled: enabled,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/dashboard/admin/features");
  revalidatePath("/dashboard");
}
