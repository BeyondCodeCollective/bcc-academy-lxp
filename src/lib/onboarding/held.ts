import { createServiceClient } from "@/lib/supabase/server";
import { getHomeProgramForTrack } from "@/lib/programs";
import { trackHasStarted } from "@/lib/utils";
import { getEnforcedOnboardingChecklist, getOnboardingStatus } from "./checklists";

/** True when any of these course start dates (YYYY-MM-DD) has arrived. */
export function anyCourseStarted(startDates: string[], at: Date = new Date()): boolean {
  return startDates.some((d) => !!d && trackHasStarted({ startDate: d }, at));
}

/**
 * The enrolled track whose enforced acceptance checklist still HOLDS this
 * learner — items pending, or done but the course not yet started — or null.
 *
 * Everything here is resolved context-free (service client + per-slug
 * lookups), never through the browsing program's track list: a fresh signup's
 * first request has no program cookie, resolves a context that doesn't list
 * DB-driven courses, and any context-dependent path silently skips the hold.
 * Shared by the dashboard layout's confinement gate and the ?setup=1
 * dashboard render, which races that gate because deferred setup creates the
 * enrollment mid-render.
 */
export async function heldChecklistTrackSlug(studentId: string): Promise<string | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("student_tracks")
    .select("track_slug")
    .eq("student_id", studentId);
  const enrolled = ((data ?? []) as { track_slug: string }[]).map((r) => r.track_slug);
  for (const trackSlug of enrolled) {
    const checklist = getEnforcedOnboardingChecklist(trackSlug);
    if (!checklist) continue;
    if (checklist.exemptIfInStartedCourse && (await inStartedCourseElsewhere(svc, enrolled, trackSlug))) continue;
    const status = await getOnboardingStatus(svc, studentId, trackSlug);
    if (!status) continue;
    if (!status.allComplete) return trackSlug;
    // All items done — held only until start day. Start date from the track's
    // own record (track_overrides is THE course record), falling back to the
    // TS config; no date anywhere = treat as not started (hold, conservative).
    const { data: ov } = await svc
      .from("track_overrides")
      .select("start_date")
      .eq("track_slug", trackSlug)
      .maybeSingle<{ start_date: string | null }>();
    const startDate =
      ov?.start_date ||
      getHomeProgramForTrack(trackSlug)?.tracks.find((t) => t.slug === trackSlug)
        ?.startDate ||
      "";
    if (!startDate || !trackHasStarted({ startDate })) return trackSlug;
  }
  return null;
}

// Whether the learner is also enrolled in another course that has started, by
// the course's own start date (same source as the hold's start-day check).
async function inStartedCourseElsewhere(
  svc: ReturnType<typeof createServiceClient>,
  enrolled: string[],
  exceptSlug: string,
): Promise<boolean> {
  const others = enrolled.filter((s) => s !== exceptSlug);
  if (others.length === 0) return false;
  const { data } = await svc.from("track_overrides").select("start_date").in("track_slug", others);
  const dates = ((data ?? []) as { start_date: string | null }[]).map((r) => r.start_date ?? "");
  const fromConfig = others.map(
    (s) => getHomeProgramForTrack(s)?.tracks.find((t) => t.slug === s)?.startDate ?? "",
  );
  return anyCourseStarted([...dates, ...fromConfig]);
}
