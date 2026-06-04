// src/app/dashboard/assessment/actions.ts
"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { scoreAssessment } from "@/lib/assessment/scoring";
import type { RawResponses } from "@/lib/assessment/types";

export async function saveAssessmentProgress(
  responses: RawResponses,
  currentModule: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const svc = createServiceClient();
  await svc.from("assessment_progress").upsert({
    student_id: user.id,
    current_module: currentModule,
    responses_so_far: responses,
    updated_at: new Date().toISOString(),
  });

  return { success: true };
}

export async function getAssessmentProgress() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const svc = createServiceClient();
  const { data } = await svc
    .from("assessment_progress")
    .select("*")
    .eq("student_id", user.id)
    .maybeSingle();

  return data;
}

export async function submitAssessment(
  responses: RawResponses,
  programSlug: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Score synchronously — pure function, fast
  const scored_output = scoreAssessment(responses);

  const svc = createServiceClient();

  // Write results
  const { error } = await svc.from("assessment_results").insert({
    student_id: user.id,
    program_slug: programSlug,
    raw_responses: responses,
    scored_output,
    completed_at: new Date().toISOString(),
  });

  if (error) {
    // Unique violation means already submitted — treat as idempotent success
    if (error.code === "23505") {
      revalidatePath("/dashboard/assessment/results");
      return { success: true, scored_output };
    }
    throw new Error(error.message);
  }

  // Clean up in-progress state
  await svc.from("assessment_progress").delete().eq("student_id", user.id);

  revalidatePath("/dashboard/assessment/results");
  return { success: true, scored_output };
}

export async function getAssessmentResult(studentId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Only allow admins to view other students' results
  const targetId = studentId ?? user.id;
  if (studentId && studentId !== user.id) {
    const svc = createServiceClient();
    const { data: student } = await svc
      .from("students")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = student?.role;
    if (!role || !["admin", "instructor", "super_admin"].includes(role)) {
      throw new Error("Unauthorized");
    }
  }

  const svc = createServiceClient();
  const { data } = await svc
    .from("assessment_results")
    .select("*")
    .eq("student_id", targetId)
    .maybeSingle();

  return data;
}

export async function markAssessmentViewed(studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const svc = createServiceClient();
  const { data: caller } = await svc
    .from("students")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!caller || !["admin", "instructor", "super_admin"].includes(caller.role ?? "")) {
    throw new Error("Unauthorized");
  }

  await svc
    .from("assessment_results")
    .update({ facilitator_viewed_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .is("facilitator_viewed_at", null);
}
