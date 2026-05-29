"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProgramId } from "@/lib/programs/server";
import { getSessionContext } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SubmissionLink = { url: string; label: string };
export type SubmissionFile = { url: string; name: string; type: string };

export type SubmissionRow = {
  id: string;
  student_id: string;
  track_slug: string;
  week_number: number;
  description: string | null;
  links: SubmissionLink[];
  files: SubmissionFile[];
  /** Structured answers keyed by prompt text (Forte's Written Artifact). */
  prompt_responses: Record<string, string>;
  submitted_at: string | null;
  program_id: string;
  created_at: string;
  updated_at: string;
};

export type ReflectionRow = {
  id: string;
  student_id: string;
  track_slug: string;
  week_number: number;
  responses: Record<string, string>;
  submitted_at: string | null;
  program_id: string;
  created_at: string;
  updated_at: string;
};

export type FeedbackRow = {
  id: string;
  submission_id: string | null;
  reflection_id: string | null;
  reviewer_id: string;
  comment: string;
  created_at: string;
  reviewer_name?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Reads/page-loads use the React-cached session context so all `requireAuth()`
// calls within a single request share one auth roundtrip. Mutations still
// fall back to a fresh `auth.getUser()` so we're not trusting a stale cache.
async function requireAuth() {
  const ctx = await getSessionContext();
  if (ctx?.userId) return ctx.userId;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export async function submitProject(
  trackSlug: string,
  weekNumber: number,
  data: {
    description: string;
    links: SubmissionLink[];
    files: SubmissionFile[];
    promptResponses?: Record<string, string>;
  }
) {
  const [userId, programId] = await Promise.all([requireAuth(), getProgramId()]);
  const svc = createServiceClient();

  const { error } = await svc.from("submissions").upsert(
    {
      student_id: userId,
      track_slug: trackSlug,
      week_number: weekNumber,
      description: data.description,
      links: data.links,
      files: data.files,
      prompt_responses: data.promptResponses ?? {},
      submitted_at: new Date().toISOString(),
      program_id: programId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,track_slug,week_number" }
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/track/${trackSlug}/${weekNumber}`);
  revalidatePath(`/dashboard/insights`);
  return { success: true };
}

export async function getSubmission(
  trackSlug: string,
  weekNumber: number
): Promise<SubmissionRow | null> {
  const userId = await requireAuth();
  const svc = createServiceClient();

  const { data, error } = await svc
    .from("submissions")
    .select("*")
    .eq("student_id", userId)
    .eq("track_slug", trackSlug)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (error) {
    console.error("getSubmission error:", error.message);
    return null;
  }
  return data as SubmissionRow | null;
}

// ─── Reflections ─────────────────────────────────────────────────────────────

export async function submitReflection(
  trackSlug: string,
  weekNumber: number,
  responses: Record<string, string>
) {
  const [userId, programId] = await Promise.all([requireAuth(), getProgramId()]);
  const svc = createServiceClient();

  const { error } = await svc.from("reflections").upsert(
    {
      student_id: userId,
      track_slug: trackSlug,
      week_number: weekNumber,
      responses,
      submitted_at: new Date().toISOString(),
      program_id: programId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,track_slug,week_number" }
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/track/${trackSlug}/${weekNumber}`);
  revalidatePath(`/dashboard/insights`);
  return { success: true };
}

export async function getReflection(
  trackSlug: string,
  weekNumber: number
): Promise<ReflectionRow | null> {
  const userId = await requireAuth();
  const svc = createServiceClient();

  const { data, error } = await svc
    .from("reflections")
    .select("*")
    .eq("student_id", userId)
    .eq("track_slug", trackSlug)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (error) {
    console.error("getReflection error:", error.message);
    return null;
  }
  return data as ReflectionRow | null;
}

// ─── Week Progress ────────────────────────────────────────────────────────────

export type WeekProgress = {
  videoWatched: boolean;
  homeworkSubmitted: boolean;
  completed: boolean;
};

export async function getWeekProgress(
  trackSlug: string,
  weekNumber: number
): Promise<WeekProgress> {
  const userId = await requireAuth();
  const svc = createServiceClient();

  const [progressRow, submissionRow] = await Promise.all([
    svc
      .from("week_progress")
      .select("video_watched_at")
      .eq("user_id", userId)
      .eq("track_slug", trackSlug)
      .eq("week_number", weekNumber)
      .maybeSingle(),
    svc
      .from("submissions")
      .select("submitted_at")
      .eq("student_id", userId)
      .eq("track_slug", trackSlug)
      .eq("week_number", weekNumber)
      .maybeSingle(),
  ]);

  const videoWatched = !!progressRow.data?.video_watched_at;
  const homeworkSubmitted = !!submissionRow.data?.submitted_at;

  return { videoWatched, homeworkSubmitted, completed: videoWatched && homeworkSubmitted };
}

export async function markVideoWatched(trackSlug: string, weekNumber: number) {
  const [userId, programId] = await Promise.all([requireAuth(), getProgramId()]);
  const svc = createServiceClient();

  const { error } = await svc.from("week_progress").upsert(
    {
      user_id: userId,
      program_id: programId,
      track_slug: trackSlug,
      week_number: weekNumber,
      video_watched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,track_slug,week_number" }
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/track/${trackSlug}/${weekNumber}`);
  return { success: true };
}

// ─── Feedback (read-only for students) ───────────────────────────────────────

export async function getFeedback(
  submissionId?: string,
  reflectionId?: string
): Promise<FeedbackRow[]> {
  await requireAuth();
  const svc = createServiceClient();

  let query = svc
    .from("submission_feedback")
    .select("*, students!submission_feedback_reviewer_id_fkey(first_name, last_name)")
    .order("created_at");

  if (submissionId) {
    query = query.eq("submission_id", submissionId);
  } else if (reflectionId) {
    query = query.eq("reflection_id", reflectionId);
  } else {
    return [];
  }

  const { data, error } = await query;

  if (error) {
    console.error("getFeedback error:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const reviewer = row.students as { first_name: string; last_name: string } | null;
    return {
      id: row.id as string,
      submission_id: row.submission_id as string | null,
      reflection_id: row.reflection_id as string | null,
      reviewer_id: row.reviewer_id as string,
      comment: row.comment as string,
      created_at: row.created_at as string,
      reviewer_name: reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : "Instructor",
    };
  });
}
