"use server";

import { after } from "next/server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireCapability, logAdminAccess, resolveProgramForActor } from "./actions-shared";
import { logActivityEvent } from "@/lib/analytics/log-event";
import { notifyAnnouncement, notifyFeedback } from "@/lib/notifications";
import { sendCertificateEmail } from "@/lib/email";
import { issueCertificateCore, certEmailContext, type IssueCertificateResult } from "@/lib/certificates";

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
  after(() => notifyAnnouncement({
    programId: programId,
    trackSlug: data.trackSlug || null,
    message: data.message,
  }));

  // Fire-and-forget: push notification to enrolled students
  if (data.trackSlug) {
    after(() =>
      import("@/lib/push").then(({ sendPushToTrack }) =>
        sendPushToTrack({
          programId,
          trackSlug: data.trackSlug!,
          title: "New announcement",
          body: data.message.slice(0, 200),
          url: "/dashboard",
        })
      ),
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

export type CertificateEligibility = {
  /** Sessions someone checked into. 0 = attendance was never logged here. */
  sessionsHeld: number;
  /** student_id → sessions attended. Absent = attended none. */
  attended: Record<string, number>;
};

/**
 * Attendance behind a course, so "Issue all" isn't a blind bulk action on a
 * long roster — for a 3-day camp, showing up IS the bar.
 *
 * sessionsHeld === 0 means attendance was never logged for this course (Tech+
 * and MASS ran entirely off-platform). That's reported as "unknown", never as
 * "nobody attended" — the difference decides whether a 0 should stop you from
 * issuing.
 */
export async function getCertificateEligibility(
  trackSlug: string,
  programSlug: string,
): Promise<CertificateEligibility> {
  const actor = await requireAdmin();
  const { svc } = actor;
  await resolveProgramForActor(actor, svc, programSlug);

  const { data, error } = await svc
    .from("attendance")
    .select("student_id, week_number, session_number")
    .eq("track", trackSlug)
    .not("checked_in_at", "is", null);
  if (error) {
    console.error("getCertificateEligibility error:", error.message);
    return { sessionsHeld: 0, attended: {} };
  }

  const perLearner = new Map<string, Set<string>>();
  const held = new Set<string>();
  for (const r of data ?? []) {
    const key = `${r.week_number}-${r.session_number}`;
    held.add(key);
    if (!perLearner.has(r.student_id)) perLearner.set(r.student_id, new Set());
    perLearner.get(r.student_id)!.add(key);
  }
  const attended: Record<string, number> = {};
  for (const [id, set] of perLearner) attended[id] = set.size;
  return { sessionsHeld: held.size, attended };
}

const CERT_EMAIL_PACE_MS = 550; // ~2/sec — Resend rate limit
const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type { IssueCertificateResult } from "@/lib/certificates";

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

  const result = await issueCertificateCore(svc, {
    studentId,
    trackSlug,
    programId,
    programSlug,
    issuedBy: actor.userId,
    skipEmail: opts?.skipEmail,
  });

  if (result.success) revalidatePath("/dashboard");
  return result;
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
  // Backfilling a course that finished weeks ago shouldn't surprise 58
  // families with an email about it. Recording the completion and telling
  // people about it are separate decisions — an email can't be unsent, so the
  // caller has to ask for it.
  opts?: { skipEmail?: boolean },
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
    const res = await issueCertificate(studentId, trackSlug, programSlug, opts);
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

/**
 * Send the certificate email to a batch of learners who already hold one —
 * the second half of "issue now, tell people later". Paced like the bulk
 * issue so the sends don't trip the provider's rate limit.
 */
export async function sendCertificateEmailsBulk(
  studentIds: string[],
  trackSlug: string,
  programSlug: string,
): Promise<{ sent: number; failed: { studentId: string; error: string }[] }> {
  await requireAdmin();

  let sent = 0;
  const failed: { studentId: string; error: string }[] = [];
  for (const studentId of studentIds) {
    const res = await resendCertificateEmail(studentId, trackSlug, programSlug);
    if (res.success) {
      sent++;
      await sleepMs(CERT_EMAIL_PACE_MS);
    } else {
      failed.push({ studentId, error: res.error ?? "unknown" });
    }
  }
  return { sent, failed };
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

/**
 * Short-lived signed URL for a file uploaded through a public application form.
 *
 * The bucket is private and has no RLS policies, so this service-role call is
 * the ONLY way to read one — which is the point: a resume carries an
 * applicant's name, phone number, and address, and must never sit behind a
 * guessable public URL. Staff-only, and the link expires in five minutes so a
 * URL pasted into Slack stops working long before the tab does.
 */
export async function getApplicationFileUrl(
  path: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { svc, userId } = await requireCapability("view_insights");

  // Only ever inside the one bucket, and never an absolute or traversing path.
  if (!path || path.startsWith("/") || path.includes("..")) {
    return { ok: false, error: "Invalid file path." };
  }

  const { data, error } = await svc.storage
    .from("resumes")
    .createSignedUrl(path, 300);

  if (error || !data?.signedUrl) {
    console.error("[application-file] signed url failed", { path, error });
    return { ok: false, error: "Could not open that file." };
  }

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "view",
    resource: `application_file.${path}`,
    rowCount: 1,
  });

  return { ok: true, url: data.signedUrl };
}
