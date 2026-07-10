import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";
import { resolveCurrentUnit, trackHasStarted } from "@/lib/utils";

// Returns the tracks a student is enrolled in, joined with program config.
// Source of truth for "which tracks can this student see?" — combines
// the student_tracks DB rows with the program's track definitions.
// Admins bypass this entirely (caller's responsibility to check role).
export async function getEnrolledTracks(
  supabase: SupabaseClient,
  studentId: string,
  program: ProgramConfig,
): Promise<TrackConfig[]> {
  const { data } = await supabase
    .from("student_tracks")
    .select("track_slug")
    .eq("student_id", studentId);

  const enrolledSlugs = new Set((data ?? []).map((r: { track_slug: string }) => r.track_slug));
  return program.tracks.filter((t) => enrolledSlugs.has(t.slug));
}

/**
 * The course a learner actually came for.
 *
 * Enrolling in Security+ also enrolls you in its MASS coaching wraparound, so
 * "you have two courses" is true but misleading — one accompanies the other.
 * Prefer a standalone course over a companion; break ties by start date, then
 * slug, so the answer is stable rather than dependent on query order.
 */
export function primaryTrack<T extends { slug: string; startDate: string; companionOf?: string }>(
  tracks: T[],
): T | null {
  if (tracks.length === 0) return null;
  const standalone = tracks.filter((t) => !t.companionOf);
  const candidates = standalone.length > 0 ? standalone : tracks;
  return [...candidates].sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.slug.localeCompare(b.slug),
  )[0];
}

/**
 * Rewrite each companion track to the course it wraps around.
 *
 * "Skip this survey for Security+ learners" has to survive the fact that every
 * Security+ learner is ALSO enrolled in its MASS wraparound. Without this, the
 * `.every()` in surveySkippedForTracks sees an unlisted second track and shows
 * the survey anyway — which is how the Security+ cohort ended up being asked
 * for an AI Fundamentals pre-program survey.
 */
export function collapseCompanionSlugs(slugs: string[], tracks: TrackConfig[]): string[] {
  const companionOf = new Map(tracks.map((t) => [t.slug, t.companionOf]));
  return slugs.map((s) => companionOf.get(s) ?? s);
}

// Where a login should drop a learner: the current session's page once the
// course has started (that's where the live Zoom embed is), and the course
// overview before it starts — the overview carries the pre-start banner, and
// every session page is locked until day one anyway.
export function courseLandingPath(track: TrackConfig): string {
  if (!trackHasStarted(track)) return `/dashboard/track/${track.slug}`;
  // resolveCurrentUnit accounts for day-gated camps (returns Day 2 on
  // Wednesday, Day 3 on Thursday) where computeCurrentWeek would pin at Day 1.
  const week = Math.max(1, resolveCurrentUnit(track));
  if (track.weeks.some((w) => w.week === week)) {
    return `/dashboard/track/${track.slug}/${week}`;
  }
  return `/dashboard/track/${track.slug}`;
}
