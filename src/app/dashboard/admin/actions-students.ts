"use server";

import { revalidatePath } from "next/cache";
import { requireManager } from "./actions-shared";

export type CohortRow = {
  id: string;
  name: string;
  display_name: string;
  track_slug: string;
  start_date: string | null;
  total_weeks: number | null;
};

export async function deleteStudentAction(studentId: string) {
  const { svc } = await requireManager();
  await svc.from("attendance").delete().eq("student_id", studentId);
  const { error } = await svc.from("students").delete().eq("id", studentId);
  if (error) throw new Error(error.message);
  // Also remove from auth so they can re-register cleanly
  await svc.auth.admin.deleteUser(studentId);
  return { success: true };
}

export async function updateStudentAction(
  studentId: string,
  field: "role" | "cohort_id",
  value: string
) {
  const { svc } = await requireManager();
  const { error } = await svc
    .from("students")
    .update({ [field]: value })
    .eq("id", studentId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function addStudentAction(data: {
  email: string;
  first_name: string;
  last_name: string;
  role: "student" | "instructor" | "admin";
  cohort_id: string | null;
}) {
  const { svc, programId } = await requireManager();
  if (!programId) {
    throw new Error("Calling admin has no program — refusing to create student");
  }

  // Create auth user (sends magic link invite)
  const { data: authUser, error: authError } = await svc.auth.admin.createUser({
    email: data.email,
    email_confirm: true,
  });

  if (authError) throw new Error(authError.message);
  if (!authUser.user) throw new Error("Failed to create user");

  // Insert student record — pinned to the calling admin's program so
  // program-scoped RLS (program_rls.sql) lets the new user read their
  // data, AND so admins can't manufacture students outside their program.
  const { error: studentError } = await svc.from("students").insert({
    id: authUser.user.id,
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name,
    role: data.role,
    cohort_id: data.cohort_id || null,
    program_id: programId,
  });

  if (studentError) throw new Error(studentError.message);

  return {
    success: true,
    student: {
      id: authUser.user.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      role: data.role,
      cohort_id: data.cohort_id || null,
    },
  };
}

export async function updateCohortAction(
  cohortId: string,
  data: { display_name?: string; start_date?: string; total_weeks?: number }
) {
  const { svc } = await requireManager();
  const { error } = await svc.from("cohorts").update(data).eq("id", cohortId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function createCohortAction(data: {
  track_slug: string;
  display_name: string;
  start_date?: string | null;
  total_weeks?: number | null;
}): Promise<{ success: true; cohort: CohortRow }> {
  const { svc, programId } = await requireManager();

  const name = data.display_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const { data: cohort, error } = await svc
    .from("cohorts")
    .insert({
      name,
      display_name: data.display_name,
      track_slug: data.track_slug,
      start_date: data.start_date ?? null,
      total_weeks: data.total_weeks ?? null,
      program_id: programId,
    })
    .select("id, name, display_name, track_slug, start_date, total_weeks")
    .single<CohortRow>();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin");
  return { success: true, cohort: cohort! };
}
