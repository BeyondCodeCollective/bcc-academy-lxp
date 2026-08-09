"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isMasterEmail } from "@/lib/auth/admins";
import type { SentinelFix } from "@/lib/sentinel/checks";

// Applies a Sentinel one-click fix. Master-only, mirroring the page gate.
// Every fix is a single reversible row operation; the params come from the
// client, so each kind re-validates against the DB before writing.

export type FixResult = { success: true; detail: string } | { success: false; error: string };

async function requireMaster() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  if (!isMasterEmail(user.email)) throw new Error("Not authorized");
}

export async function applySentinelFixAction(fix: SentinelFix): Promise<FixResult> {
  await requireMaster();
  const svc = createServiceClient();

  if (fix.kind === "assign_instructor") {
    // The target must actually be staff — a tampered payload could otherwise
    // hand a learner instructor scoping.
    const { data: person } = await svc
      .from("students")
      .select("role, email")
      .eq("id", fix.studentId)
      .single<{ role: string; email: string }>();
    if (!person || person.role === "student") {
      return { success: false, error: "That account is not staff." };
    }
    const { error } = await svc.from("instructor_tracks").upsert(
      {
        student_id: fix.studentId,
        track_slug: fix.trackSlug,
        program_id: fix.programId,
      },
      { onConflict: "student_id,track_slug,program_id", ignoreDuplicates: true },
    );
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/admin/health", "page");
    return { success: true, detail: `${person.email} assigned to ${fix.trackSlug}.` };
  }

  if (fix.kind === "unenroll") {
    // Only remove STAFF enrollments — this fix exists for the
    // staff-enrolled-as-learners finding, never for real learners.
    const { data: person } = await svc
      .from("students")
      .select("role, email, is_staff, is_test")
      .eq("id", fix.studentId)
      .single<{ role: string; email: string; is_staff: boolean | null; is_test: boolean | null }>();
    if (!person || (person.role === "student" && !person.is_staff && !person.is_test)) {
      return { success: false, error: "Refusing: that account is a learner, not staff." };
    }
    const { error } = await svc
      .from("student_tracks")
      .delete()
      .eq("student_id", fix.studentId)
      .eq("track_slug", fix.trackSlug);
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/admin/health", "page");
    return { success: true, detail: `${person.email} unenrolled from ${fix.trackSlug}.` };
  }

  return { success: false, error: "Unknown fix type." };
}
