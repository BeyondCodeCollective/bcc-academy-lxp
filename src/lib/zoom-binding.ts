import type { SupabaseClient } from "@supabase/supabase-js";
import { parseZoomLink } from "@/lib/zoom";

/**
 * True when `meetingNumber` is one of the Zoom meetings configured for a track
 * the learner is enrolled in. Source of truth is session_content.meeting_link,
 * meeting_link_2 and meeting_link_3 (the same columns the unit page renders and
 * the attendance sync reads), scoped to the program that owns the enrollment.
 *
 * Matches against every week of the track, not only the requested week: a dated
 * cohort reuses one recurring meeting across weeks, and the client-sent week is
 * not trusted anyway.
 */
export async function isMeetingBoundToLearnerTrack(
  svc: SupabaseClient,
  studentId: string,
  trackSlug: string,
  meetingNumber: string,
): Promise<boolean> {
  if (!trackSlug || !meetingNumber) return false;

  const { data: enrollment } = await svc
    .from("student_tracks")
    .select("program_id")
    .eq("student_id", studentId)
    .eq("track_slug", trackSlug)
    .maybeSingle<{ program_id: string }>();
  if (!enrollment?.program_id) return false;

  const { data: rows } = await svc
    .from("session_content")
    .select("meeting_link, meeting_link_2, meeting_link_3")
    .eq("program_id", enrollment.program_id)
    .eq("track", trackSlug)
    .returns<
      {
        meeting_link: string | null;
        meeting_link_2: string | null;
        meeting_link_3: string | null;
      }[]
    >();

  return (rows ?? []).some((r) =>
    [r.meeting_link, r.meeting_link_2, r.meeting_link_3].some(
      (l) => !!l && parseZoomLink(l)?.meetingNumber === meetingNumber,
    ),
  );
}
