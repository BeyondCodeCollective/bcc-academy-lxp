import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";

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
