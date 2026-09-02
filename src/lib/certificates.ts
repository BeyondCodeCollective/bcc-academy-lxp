import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCertificateEmail } from "@/lib/email";
import { logActivityEvent } from "@/lib/analytics/log-event";
import { getProgramBySlug, getTrackBySlug } from "@/lib/programs";

// Certificate issuance core, shared by the admin actions (actions-misc.ts,
// which add authz + revalidation on top) and the automation cron (which has
// no admin actor). Idempotent: re-issuing returns the existing certificate.

export type IssueCertificateResult = {
  success: boolean;
  certificateId?: string;
  /** True when the certificate already existed before this call. */
  alreadyIssued?: boolean;
  emailed?: boolean;
  error?: string;
};

/** The name/email bits the certificate email needs, or null when the student
 *  row is missing (deleted between render and click). */
export async function certEmailContext(
  svc: SupabaseClient,
  studentId: string,
  trackSlug: string,
  programSlug: string,
) {
  const { data: student } = await svc
    .from("students")
    .select("first_name, email")
    .eq("id", studentId)
    .maybeSingle();
  if (!student?.email) return null;
  const program = getProgramBySlug(programSlug);
  const track = getTrackBySlug(program, trackSlug);
  return {
    to: student.email as string,
    firstName: (student.first_name as string | null) ?? "",
    programName: program.name,
    courseName: track?.certificateName ?? track?.name ?? trackSlug,
    domain: program.domain,
  };
}

export async function issueCertificateCore(
  svc: SupabaseClient,
  params: {
    studentId: string;
    trackSlug: string;
    programId: string;
    programSlug: string;
    /** Recorded in the activity event: an admin's user id, or "automation". */
    issuedBy: string;
    skipEmail?: boolean;
  },
): Promise<IssueCertificateResult> {
  const { studentId, trackSlug, programId, programSlug } = params;

  const { data: existing } = await svc
    .from("track_completions")
    .select("certificate_id")
    .eq("student_id", studentId)
    .eq("track_slug", trackSlug)
    .eq("program_id", programId)
    .maybeSingle();
  if (existing?.certificate_id) {
    return {
      success: true,
      certificateId: existing.certificate_id,
      alreadyIssued: true,
      emailed: false,
    };
  }

  const { data: created, error } = await svc
    .from("track_completions")
    .insert({ student_id: studentId, track_slug: trackSlug, program_id: programId })
    .select("certificate_id")
    .single();
  if (error) return { success: false, error: error.message };

  void logActivityEvent({
    userId: studentId,
    eventType: "certificate_issued",
    programId,
    trackSlug,
    metadata: { issuedBy: params.issuedBy },
  });

  let emailed = false;
  if (!params.skipEmail) {
    try {
      const ctx = await certEmailContext(svc, studentId, trackSlug, programSlug);
      if (ctx) {
        const { domain, ...email } = ctx;
        await sendCertificateEmail({
          ...email,
          certificateUrl: `https://${domain}/certificate/${created.certificate_id}`,
        });
        emailed = true;
      }
    } catch (e) {
      // The certificate exists either way — surface the email failure so the
      // admin can hit "Email again" rather than silently losing it.
      console.error(
        "[certificates] email failed:",
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  return {
    success: true,
    certificateId: created.certificate_id,
    alreadyIssued: false,
    emailed,
  };
}
