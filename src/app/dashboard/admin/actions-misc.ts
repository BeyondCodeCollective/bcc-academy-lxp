"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, resolveProgramForActor } from "./actions-shared";
import { logActivityEvent } from "@/lib/analytics/log-event";
import { notifyAnnouncement, notifyFeedback } from "@/lib/notifications";
import { sendCertificateEmail } from "@/lib/email";
import { getProgramBySlug, getTrackBySlug } from "@/lib/programs";

// ─── Submissions & Reflections (Admin) ──────────────────────────────────────

export type AdminSubmissionRow = {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  track_slug: string;
  week_number: number;
  description: string | null;
  links: { url: string; label: string }[];
  files: { url: string; name: string; type: string }[];
  prompt_responses: Record<string, string>;
  submitted_at: string | null;
  feedback_count: number;
};

export type AdminReflectionRow = {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  track_slug: string;
  week_number: number;
  responses: Record<string, string>;
  submitted_at: string | null;
  feedback_count: number;
};

export async function getAllSubmissions(
  programSlug: string,
  trackSlug?: string
): Promise<AdminSubmissionRow[]> {
  const actor = await requireAdmin();
  const { svc } = actor;

  const programId = await resolveProgramForActor(actor, svc, programSlug);

  let query = svc
    .from("submissions")
    .select("*, students!submissions_student_id_fkey(first_name, last_name, email), submission_feedback(id)")
    .eq("program_id", programId)
    .not("submitted_at", "is", null)
    .order("week_number")
    .order("submitted_at", { ascending: false });

  if (trackSlug) {
    query = query.eq("track_slug", trackSlug);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAllSubmissions error:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const student = row.students as { first_name: string; last_name: string; email: string } | null;
    const feedbackArr = row.submission_feedback as { id: string }[] | null;
    return {
      id: row.id as string,
      student_id: row.student_id as string,
      student_name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
      student_email: student?.email ?? "",
      track_slug: row.track_slug as string,
      week_number: row.week_number as number,
      description: row.description as string | null,
      links: (row.links ?? []) as { url: string; label: string }[],
      files: (row.files ?? []) as { url: string; name: string; type: string }[],
      prompt_responses: (row.prompt_responses ?? {}) as Record<string, string>,
      submitted_at: row.submitted_at as string | null,
      feedback_count: feedbackArr?.length ?? 0,
    };
  });
}

export async function getAllReflections(
  programSlug: string,
  trackSlug?: string
): Promise<AdminReflectionRow[]> {
  const actor = await requireAdmin();
  const { svc } = actor;

  const programId = await resolveProgramForActor(actor, svc, programSlug);

  let query = svc
    .from("reflections")
    .select("*, students!reflections_student_id_fkey(first_name, last_name, email), submission_feedback(id)")
    .eq("program_id", programId)
    .not("submitted_at", "is", null)
    .order("week_number")
    .order("submitted_at", { ascending: false });

  if (trackSlug) {
    query = query.eq("track_slug", trackSlug);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAllReflections error:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const student = row.students as { first_name: string; last_name: string; email: string } | null;
    const feedbackArr = row.submission_feedback as { id: string }[] | null;
    return {
      id: row.id as string,
      student_id: row.student_id as string,
      student_name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
      student_email: student?.email ?? "",
      track_slug: row.track_slug as string,
      week_number: row.week_number as number,
      responses: (row.responses ?? {}) as Record<string, string>,
      submitted_at: row.submitted_at as string | null,
      feedback_count: feedbackArr?.length ?? 0,
    };
  });
}

// ─── Announcements ───────────────────────────────────────────────────────────

export async function createAnnouncement(data: {
  programSlug: string;
  trackSlug?: string;
  message: string;
  expiresAt: string;
}) {
  const actor = await requireAdmin();
  const { svc, userId } = actor;

  const programId = await resolveProgramForActor(actor, svc, data.programSlug);

  const { error } = await svc.from("announcements").insert({
    program_id: programId,
    track_slug: data.trackSlug || null,
    instructor_id: userId,
    message: data.message,
    expires_at: data.expiresAt,
  });

  if (error) throw new Error(error.message);

  // Fire-and-forget: email enrolled students (who haven't opted out). Never
  // let a delivery hiccup fail the instructor's post.
  void notifyAnnouncement({
    programId: programId,
    trackSlug: data.trackSlug || null,
    message: data.message,
  });

  // Fire-and-forget: push notification to enrolled students
  if (data.trackSlug) {
    void import("@/lib/push").then(({ sendPushToTrack }) =>
      sendPushToTrack({
        programId,
        trackSlug: data.trackSlug!,
        title: "New announcement",
        body: data.message.slice(0, 200),
        url: "/dashboard",
      })
    );
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAnnouncement(announcementId: string) {
  const { svc } = await requireAdmin();
  const { error } = await svc.from("announcements").delete().eq("id", announcementId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getActiveAnnouncements(programSlug: string) {
  // Gate this exported "use server" action — it reads via the service client and
  // previously had no auth check (any caller could invoke it).
  const { svc } = await requireAdmin();
  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return [];

  const { data, error } = await svc
    .from("announcements")
    .select("id, message, track_slug, created_at, expires_at, instructor_id")
    .eq("program_id", programRow.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getActiveAnnouncements error:", error.message);
    return [];
  }
  return data ?? [];
}

// ─── Track Completions / Certificates ────────────────────────────────────────

export async function grantCompletion(
  studentId: string,
  trackSlug: string,
  programSlug: string
) {
  const actor = await requireAdmin();
  const { svc } = actor;

  const programId = await resolveProgramForActor(actor, svc, programSlug);

  const { data: completion, error } = await svc
    .from("track_completions")
    .upsert(
      {
        student_id: studentId,
        track_slug: trackSlug,
        program_id: programId,
      },
      { onConflict: "student_id,track_slug,program_id" }
    )
    .select("certificate_id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  return { success: true, certificateId: completion?.certificate_id };
}

export type TrackCompletionRow = {
  student_id: string;
  certificate_id: string;
  completed_at: string;
};

/** All issued certificates for a track — drives the admin Certificates view. */
export async function getTrackCompletions(
  trackSlug: string,
  programSlug: string,
): Promise<TrackCompletionRow[]> {
  const actor = await requireAdmin();
  const { svc } = actor;
  const programId = await resolveProgramForActor(actor, svc, programSlug);

  const { data, error } = await svc
    .from("track_completions")
    .select("student_id, certificate_id, completed_at")
    .eq("track_slug", trackSlug)
    .eq("program_id", programId);
  if (error) throw new Error(error.message);
  return (data ?? []) as TrackCompletionRow[];
}

const CERT_EMAIL_PACE_MS = 550; // ~2/sec — Resend rate limit
const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The name/email bits the certificate email needs, or null when the student
 *  row is missing (deleted between render and click). */
async function certEmailContext(
  svc: Awaited<ReturnType<typeof requireAdmin>>["svc"],
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

export type IssueCertificateResult = {
  success: boolean;
  certificateId?: string;
  /** True when the certificate already existed before this call. */
  alreadyIssued?: boolean;
  emailed?: boolean;
  error?: string;
};

/**
 * Issue a certificate to one student: create the completion row (idempotent —
 * re-issuing returns the existing certificate) and email the family the
 * public certificate link. The email is only sent when the certificate is
 * NEWLY issued, so clicking twice can't double-send; use
 * resendCertificateEmail for an explicit re-send.
 */
export async function issueCertificate(
  studentId: string,
  trackSlug: string,
  programSlug: string,
  opts?: { skipEmail?: boolean },
): Promise<IssueCertificateResult> {
  const actor = await requireAdmin();
  const { svc } = actor;
  const programId = await resolveProgramForActor(actor, svc, programSlug);

  const { data: existing } = await svc
    .from("track_completions")
    .select("certificate_id")
    .eq("student_id", studentId)
    .eq("track_slug", trackSlug)
    .eq("program_id", programId)
    .maybeSingle();
  if (existing?.certificate_id) {
    return { success: true, certificateId: existing.certificate_id, alreadyIssued: true, emailed: false };
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
    metadata: { issuedBy: actor.userId },
  });

  let emailed = false;
  if (!opts?.skipEmail) {
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
      console.error("[certificates] email failed:", e instanceof Error ? e.message : String(e));
    }
  }

  revalidatePath("/dashboard");
  return { success: true, certificateId: created.certificate_id, alreadyIssued: false, emailed };
}

/**
 * Issue certificates to a whole roster (the end-of-camp move: "everyone who
 * finished gets their certificate"). Skips students who already have one,
 * paces the emails for Resend, and reports per-student results so a partial
 * failure is visible and retryable.
 */
export async function issueCertificatesBulk(
  studentIds: string[],
  trackSlug: string,
  programSlug: string,
): Promise<{
  issued: number;
  skipped: number;
  emailed: number;
  failed: { studentId: string; error: string }[];
}> {
  // Authz once up front (each issueCertificate call re-checks; this just
  // fails fast before any work).
  await requireAdmin();

  let issued = 0, skipped = 0, emailed = 0;
  const failed: { studentId: string; error: string }[] = [];
  for (const studentId of studentIds) {
    const res = await issueCertificate(studentId, trackSlug, programSlug);
    if (!res.success) {
      failed.push({ studentId, error: res.error ?? "unknown" });
      continue;
    }
    if (res.alreadyIssued) skipped++;
    else {
      issued++;
      if (res.emailed) {
        emailed++;
        await sleepMs(CERT_EMAIL_PACE_MS);
      }
    }
  }
  return { issued, skipped, emailed, failed };
}

/** Explicit re-send of the certificate email (e.g. it bounced or was lost). */
export async function resendCertificateEmail(
  studentId: string,
  trackSlug: string,
  programSlug: string,
): Promise<{ success: boolean; error?: string }> {
  const actor = await requireAdmin();
  const { svc } = actor;
  const programId = await resolveProgramForActor(actor, svc, programSlug);

  const { data: completion } = await svc
    .from("track_completions")
    .select("certificate_id")
    .eq("student_id", studentId)
    .eq("track_slug", trackSlug)
    .eq("program_id", programId)
    .maybeSingle();
  if (!completion?.certificate_id) {
    return { success: false, error: "No certificate issued for this student yet" };
  }
  const ctx = await certEmailContext(svc, studentId, trackSlug, programSlug);
  if (!ctx) return { success: false, error: "Student record not found" };
  try {
    const { domain, ...email } = ctx;
    await sendCertificateEmail({
      ...email,
      certificateUrl: `https://${domain}/certificate/${completion.certificate_id}`,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function revokeCompletion(
  studentId: string,
  trackSlug: string,
  programSlug: string
) {
  const actor = await requireAdmin();
  const { svc } = actor;

  const programId = await resolveProgramForActor(actor, svc, programSlug);

  const { error } = await svc
    .from("track_completions")
    .delete()
    .eq("student_id", studentId)
    .eq("track_slug", trackSlug)
    .eq("program_id", programId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export async function addFeedback(data: {
  submissionId?: string;
  reflectionId?: string;
  comment: string;
}) {
  const { svc, userId } = await requireAdmin();

  if (!data.submissionId && !data.reflectionId) {
    throw new Error("Must provide submissionId or reflectionId");
  }

  const { error } = await svc.from("submission_feedback").insert({
    submission_id: data.submissionId ?? null,
    reflection_id: data.reflectionId ?? null,
    reviewer_id: userId,
    comment: data.comment,
  });

  if (error) throw new Error(error.message);

  // Fire-and-forget: email the student whose work this is (unless opted out).
  void notifyFeedback({
    submissionId: data.submissionId ?? null,
    reflectionId: data.reflectionId ?? null,
  });

  return { success: true };
}
