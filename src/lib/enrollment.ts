import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";
import { resolveCurrentUnit } from "@/lib/utils";

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

// Where a login should drop a single-course learner: the current week's page
// once the course has started (that's where the live session/Zoom embed is),
// week 1 before the start, and the overview as the safe fallback for slugs
// with no matching week content.
export function courseLandingPath(track: TrackConfig): string {
  // resolveCurrentUnit accounts for day-gated camps (returns Day 2 on
  // Wednesday, Day 3 on Thursday) where computeCurrentWeek would pin at Day 1.
  // 0 before the track starts → land on unit 1's page.
  const week = Math.max(1, resolveCurrentUnit(track));
  if (track.weeks.some((w) => w.week === week)) {
    return `/dashboard/track/${track.slug}/${week}`;
  }
  return `/dashboard/track/${track.slug}`;
}
