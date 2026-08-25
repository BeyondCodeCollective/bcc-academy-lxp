import { createServiceClient } from "@/lib/supabase/server";
import { getHomeProgramForTrack } from "@/lib/programs";
import { trackHasStarted } from "@/lib/utils";
import { getEnforcedOnboardingChecklist, getOnboardingStatus } from "./checklists";

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
  for (const row of (data ?? []) as { track_slug: string }[]) {
    if (!getEnforcedOnboardingChecklist(row.track_slug)) continue;
    const status = await getOnboardingStatus(svc, studentId, row.track_slug);
    if (!status) continue;
    if (!status.allComplete) return row.track_slug;
    // All items done — held only until start day. Start date from the track's
    // own record (track_overrides is THE course record), falling back to the
    // TS config; no date anywhere = treat as not started (hold, conservative).
    const { data: ov } = await svc
      .from("track_overrides")
      .select("start_date")
      .eq("track_slug", row.track_slug)
      .maybeSingle<{ start_date: string | null }>();
    const startDate =
      ov?.start_date ||
      getHomeProgramForTrack(row.track_slug)?.tracks.find((t) => t.slug === row.track_slug)
        ?.startDate ||
      "";
    if (!startDate || !trackHasStarted({ startDate })) return row.track_slug;
  }
  return null;
}
