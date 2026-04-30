"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeOnboarding(data: {
  first_name: string;
  last_name: string;
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
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  return { success: true };
}

export async function markWelcomeSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const svc = createServiceClient();
  await svc
    .from("students")
    .update({ welcome_seen_at: new Date().toISOString() })
    .eq("id", user.id);

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
  if (!user) {
    console.error("[saveSurveyResponse] no authenticated user", { programSlug, surveyType });
    throw new Error("Not authenticated — please sign in again and retry.");
  }

  // Pull program_id from the student row (guaranteed non-null by schema)
  // instead of doing an extra lookup against `programs` by slug.
  const { data: studentRow, error: studentErr } = await supabase
    .from("students")
    .select("program_id")
    .eq("id", user.id)
    .maybeSingle();

  if (studentErr) {
    console.error("[saveSurveyResponse] student lookup failed", {
      userId: user.id,
      programSlug,
      surveyType,
      error: studentErr,
    });
    throw new Error(`Couldn't load your profile: ${studentErr.message}`);
  }

  // Fall back to a programs-by-slug lookup if the student row is somehow
  // missing a program_id (shouldn't happen on a healthy DB, but be safe).
  let programId = studentRow?.program_id ?? null;
  if (!programId) {
    const { data: programRow, error: programErr } = await supabase
      .from("programs")
      .select("id")
      .eq("slug", programSlug)
      .maybeSingle();
    if (programErr || !programRow) {
      console.error("[saveSurveyResponse] program fallback lookup failed", {
        userId: user.id,
        programSlug,
        surveyType,
        error: programErr,
      });
      throw new Error("Couldn't find your program. Refresh and try again.");
    }
    programId = programRow.id;
  }

  // RLS allows a student to upsert their own survey_responses row, so the
  // regular auth client works here — no service role key required.
  const { error } = await supabase.from("survey_responses").upsert(
    {
      student_id: user.id,
      survey_type: surveyType,
      responses,
      completed_at: new Date().toISOString(),
      program_id: programId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,survey_type" }
  );

  if (error) {
    console.error("[saveSurveyResponse] upsert failed", {
      userId: user.id,
      programSlug,
      surveyType,
      programId,
      error,
    });
    throw new Error(`Save failed: ${error.message}`);
  }

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
