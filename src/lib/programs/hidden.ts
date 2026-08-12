import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Returns the set of track slugs that have been hidden via the admin
 * Hide/Show control. Hiding is global per course (a hidden course disappears
 * from every program's admin home + the catalog) but never deletes data — the
 * row in `hidden_courses` is removed to restore it. Works for both hardcoded
 * TS-config tracks and DB/builder courses.
 */
export const getHiddenTrackSlugs = cache(async (): Promise<Set<string>> => {
  const svc = createServiceClient();
  const { data } = await svc.from("hidden_courses").select("track_slug");
  return new Set((data ?? []).map((r) => r.track_slug as string));
});
