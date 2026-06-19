"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";

export type TrackProgress = {
  /** student id → week numbers where the recording was marked watched. */
  watched: Record<string, number[]>;
  /** student id → week numbers where homework was submitted. */
  submitted: Record<string, number[]>;
};

/**
 * Per-student completion for a self-paced track: which weeks each learner has
 * watched (week_progress.video_watched_at) and submitted (submissions). Keyed
 * by student id — week_progress.user_id and submissions.student_id are both the
 * auth uid, which equals students.id in this app.
 */
export async function getTrackProgress(trackSlug: string): Promise<TrackProgress> {
  const ctx = await getSessionContext();
  if (
    !ctx ||
    !canAccessAdminPanel(ctx.student?.role ?? "") ||
    (await isPreviewingAsStudent(ctx.student?.role ?? ""))
  ) {
    return { watched: {}, submitted: {} };
  }
  const svc = createServiceClient();

  const [wp, sub] = await Promise.all([
    svc
      .from("week_progress")
      .select("user_id, week_number")
      .eq("track_slug", trackSlug)
      .not("video_watched_at", "is", null),
    svc
      .from("submissions")
      .select("student_id, week_number")
      .eq("track_slug", trackSlug)
      .not("submitted_at", "is", null),
  ]);

  const watched: Record<string, number[]> = {};
  for (const r of (wp.data ?? []) as { user_id: string; week_number: number }[]) {
    (watched[r.user_id] ??= []).push(r.week_number);
  }
  const submitted: Record<string, number[]> = {};
  for (const r of (sub.data ?? []) as { student_id: string; week_number: number }[]) {
    (submitted[r.student_id] ??= []).push(r.week_number);
  }
  return { watched, submitted };
}
