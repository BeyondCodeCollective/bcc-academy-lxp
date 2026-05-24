"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
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
    .update({ welcome_seen_at: new Date().toISOString(), onboarding_completed: true })
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
  // "marketing" is the apex-domain placeholder — it has no DB row; treat it
  // the same as catalyst (the umbrella program that owns the intake).
  let programId = studentRow?.program_id ?? null;
  if (!programId) {
    const lookupSlug = programSlug === "marketing" ? "catalyst" : programSlug;
    const { data: programRow, error: programErr } = await supabase
      .from("programs")
      .select("id")
      .eq("slug", lookupSlug)
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

  // If the survey collected a name, save it to the student record.
  // Supports both separate first_name/last_name fields and a single full_name field.
  let firstName = typeof responses.first_name === "string" ? responses.first_name.trim() : null;
  let lastName = typeof responses.last_name === "string" ? responses.last_name.trim() : null;
  if (!firstName && !lastName && typeof responses.full_name === "string") {
    const parts = responses.full_name.trim().split(/\s+/);
    firstName = parts[0] || null;
    lastName = parts.slice(1).join(" ") || null;
  }
  if (firstName || lastName) {
    const svc = createServiceClient();
    await svc.from("students").update({
      ...(firstName && { first_name: firstName }),
      ...(lastName && { last_name: lastName }),
      onboarding_completed: true,
    }).eq("id", user.id);
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getSurveyStatus(
  surveyType: string
): Promise<{ completed: boolean; responses: Record<string, unknown> | null }> {
  // Reuses the React-cached session so a page that already resolved auth
  // doesn't pay for a second auth roundtrip here.
  const ctx = await getSessionContext();
  if (!ctx?.userId) return { completed: false, responses: null };

  const supabase = await createClient();
  const { data } = await supabase
    .from("survey_responses")
    .select("completed_at, responses")
    .eq("student_id", ctx.userId)
    .eq("survey_type", surveyType)
    .maybeSingle();

  return {
    completed: !!data?.completed_at,
    responses: (data?.responses as Record<string, unknown>) ?? null,
  };
}
