// The one implementation of every Sentinel remedy.
//
// This lived inside the server action, which meant the nightly cron could only
// apply a fix by reimplementing it. Two copies of a write path is how the
// tampered-payload guards drift apart — the copy without them is the one that
// eventually runs unattended. So the validation lives here and BOTH callers go
// through it: the human clicking a button, and the cron applying an auto-fix.
//
// Every fix re-reads its target and refuses on the DB's answer rather than
// trusting the payload, because on the human path those parameters arrive from
// the client.

import type { createServiceClient } from "@/lib/supabase/server";
import type { SentinelFix } from "./checks";

type Svc = ReturnType<typeof createServiceClient>;

export type FixResult = { success: true; detail: string } | { success: false; error: string };

export async function applyFix(svc: Svc, fix: SentinelFix): Promise<FixResult> {
  if (fix.kind === "assign_instructor") {
    // The target must actually be staff — a tampered payload could otherwise
    // hand a learner instructor scoping over a course.
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
    return { success: true, detail: `${person.email} unenrolled from ${fix.trackSlug}.` };
  }

  return { success: false, error: "Unknown fix type." };
}
