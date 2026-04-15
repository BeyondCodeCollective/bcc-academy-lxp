"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeOnboarding(data: {
  first_name: string;
  last_name: string;
  location: string;
  date_of_birth: string;
  education_level: string;
}) {
  // Verify the user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Use service client to bypass RLS for the update
  const svc = createServiceClient();
  const { error } = await svc
    .from("students")
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      location: data.location,
      date_of_birth: data.date_of_birth,
      education_level: data.education_level,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Survey ───────────────────────────────────────────────────────────────────

export async function saveSurveyResponse(
  surveyType: string,
  responses: Record<string, unknown>,
  programSlug: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const svc = createServiceClient();

  // Look up program ID
  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) throw new Error("Program not found");

  const { error } = await svc.from("survey_responses").upsert(
    {
      student_id: user.id,
      survey_type: surveyType,
      responses,
      completed_at: new Date().toISOString(),
      program_id: programRow.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,survey_type" }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getSurveyStatus(
  surveyType: string
): Promise<{ completed: boolean; responses: Record<string, unknown> | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { completed: false, responses: null };

  const { data } = await supabase
    .from("survey_responses")
    .select("completed_at, responses")
    .eq("student_id", user.id)
    .eq("survey_type", surveyType)
    .maybeSingle();

  return {
    completed: !!data?.completed_at,
    responses: (data?.responses as Record<string, unknown>) ?? null,
  };
}
