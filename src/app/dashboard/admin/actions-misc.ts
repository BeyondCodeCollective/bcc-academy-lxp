"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./actions-shared";
import { notifyAnnouncement, notifyFeedback } from "@/lib/notifications";

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
  const { svc } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return [];

  let query = svc
    .from("submissions")
    .select("*, students!submissions_student_id_fkey(first_name, last_name, email), submission_feedback(id)")
    .eq("program_id", programRow.id)
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
  const { svc } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return [];

  let query = svc
    .from("reflections")
    .select("*, students!reflections_student_id_fkey(first_name, last_name, email), submission_feedback(id)")
    .eq("program_id", programRow.id)
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
  const { svc, userId } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", data.programSlug)
    .single();

  if (!programRow) throw new Error("Program not found");

  const { error } = await svc.from("announcements").insert({
    program_id: programRow.id,
    track_slug: data.trackSlug || null,
    instructor_id: userId,
    message: data.message,
    expires_at: data.expiresAt,
  });

  if (error) throw new Error(error.message);

  // Fire-and-forget: email enrolled students (who haven't opted out). Never
  // let a delivery hiccup fail the instructor's post.
  void notifyAnnouncement({
    programId: programRow.id,
    trackSlug: data.trackSlug || null,
    message: data.message,
  });

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
  const { svc } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) throw new Error("Program not found");

  const { data: completion, error } = await svc
    .from("track_completions")
    .upsert(
      {
        student_id: studentId,
        track_slug: trackSlug,
        program_id: programRow.id,
      },
      { onConflict: "student_id,track_slug,program_id" }
    )
    .select("certificate_id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  return { success: true, certificateId: completion?.certificate_id };
}

export async function revokeCompletion(
  studentId: string,
  trackSlug: string,
  programSlug: string
) {
  const { svc } = await requireAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) throw new Error("Program not found");

  const { error } = await svc
    .from("track_completions")
    .delete()
    .eq("student_id", studentId)
    .eq("track_slug", trackSlug)
    .eq("program_id", programRow.id);

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
