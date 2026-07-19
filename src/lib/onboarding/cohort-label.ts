import { getProgram } from "@/lib/programs/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * The cohort a Catalyst participation agreement is signed under.
 *
 * The agreement text is the same document for every Catalyst project, but the
 * cohort recorded alongside it used to be hardcoded to "Catalyst After the Game
 * Cohort" — so a Home for the Summer (or any other) signer was filed as an
 * After the Game participant and the agreements list couldn't tell cohorts
 * apart. Resolve the learner's enrolled COURSE name instead.
 *
 * Derived server-side (never passed in from the client) because it becomes part
 * of a consent record. Falls back to the program name for agreement-only
 * invites — `send-agreement-request.mjs --track none` creates an account with
 * no enrollment, so there's no course to name.
 */
export async function resolveCatalystCohortLabel(userId: string): Promise<string> {
  const program = await getProgram();

  const { data } = await createServiceClient()
    .from("student_tracks")
    .select("track_slug")
    .eq("student_id", userId);

  const enrolled = new Set(((data ?? []) as { track_slug: string }[]).map((r) => r.track_slug));
  // Iterate the program's own track order (not the enrollment rows) so the same
  // learner always resolves to the same course, whatever order the rows return.
  const course = program.tracks.find((t) => enrolled.has(t.slug));

  return course?.name ?? program.name;
}
