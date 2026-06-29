"use server";

import { revalidatePath } from "next/cache";
import { requireManager, assertStudentInActorProgram } from "./actions-shared";
import { assignableRoles, canAssignRole } from "@/lib/roles";
import { isMasterEmail } from "@/lib/auth/admins";
import { subscribeToNewsletter } from "@/lib/mailchimp";

// Whether the acting user is a master (the only tier that may grant super_admin).
// requireManager doesn't return the email, so resolve it once here.
async function resolveActor(
  svc: Awaited<ReturnType<typeof requireManager>>["svc"],
  userId: string,
) {
  const { data } = await svc.from("students").select("email").eq("id", userId).maybeSingle<{ email: string | null }>();
  return { isMaster: isMasterEmail(data?.email) };
}

export type CohortRow = {
  id: string;
  name: string;
  display_name: string;
  track_slug: string;
  start_date: string | null;
  total_weeks: number | null;
};

export async function deleteStudentAction(studentId: string) {
  const actor = await requireManager();
  const { svc } = actor;
  // Stay within the actor's program — a program admin can't delete another
  // tenant's student by passing a foreign id (the service client bypasses RLS).
  await assertStudentInActorProgram(actor, svc, studentId);
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
  const actor = await requireManager();
  const { svc, userId, role: actorRole } = actor;
  // Stay within the actor's program before any role/cohort mutation.
  await assertStudentInActorProgram(actor, svc, studentId);

  // Role changes are privilege-sensitive: enforce the tier hierarchy so an
  // admin can't escalate anyone (incl. themselves) to a role at or above their
  // own. Only a master may grant super_admin. cohort_id changes are unaffected.
  if (field === "role") {
    if (studentId === userId) throw new Error("You can't change your own role.");
    const { isMaster } = await resolveActor(svc, userId);
    const { data: target } = await svc
      .from("students")
      .select("role")
      .eq("id", studentId)
      .maybeSingle<{ role: string }>();
    if (!canAssignRole(actorRole, isMaster, target?.role ?? "", value)) {
      throw new Error("You don't have permission to assign that role.");
    }
  }

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
  role: "student" | "instructor" | "admin" | "super_admin";
  cohort_id: string | null;
}) {
  const { svc, programId, userId, role: actorRole } = await requireManager();
  if (!programId) {
    throw new Error("Calling admin has no program — refusing to create student");
  }

  // Can't create someone at a tier you're not allowed to grant (e.g. an admin
  // minting another admin). Same hierarchy as role changes.
  const { isMaster } = await resolveActor(svc, userId);
  if (!assignableRoles(actorRole, isMaster).includes(data.role)) {
    throw new Error("You don't have permission to create a user with that role.");
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

  // Auto-subscribe staff-enrolled students to the Mailchimp newsletter. The
  // program allowlist (Catalyst / Beyond Code Centers / Forte) is enforced
  // inside subscribeToNewsletter, so we just resolve the calling admin's slug.
  if (data.role === "student") {
    const { data: prog } = await svc
      .from("programs")
      .select("slug")
      .eq("id", programId)
      .maybeSingle();
    if (prog?.slug) {
      void subscribeToNewsletter({
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        programSlug: prog.slug,
      });
    }
  }

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
