import "server-only";

import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { getHomeProgramForTrack, getTrackBySlug } from "@/lib/programs";

/**
 * Track completion — the one row the ladder turns on.
 *
 * `track_completions` already existed, carrying a certificate id, written by
 * `grantCompletion` when an admin decides someone is done. That stance is
 * deliberate and it stays: for anything ending in a certificate, completion is
 * a judgment, not an inference.
 *
 * It cannot be the only path once strangers are walking in. A free async phase
 * that thousands finish has no admin fast enough to keep up, and an unrecorded
 * completion means the next phase never opens — the ladder silently stops
 * being a ladder. So a track may opt in to recording its own completion
 * (`selfCompletable`), and nothing else may.
 */

/** Has this student finished this track? Program-agnostic on purpose: a
 *  completion is a completion, and scoping the read by the *current* program
 *  would hide it the moment a learner is viewed from another program's host. */
export const hasCompletedTrack = cache(
  async (trackSlug: string, studentId?: string): Promise<boolean> => {
    const userId = studentId ?? (await getSessionContext())?.userId;
    if (!userId) return false;

    const svc = createServiceClient();
    const { data, error } = await svc
      .from("track_completions")
      .select("id")
      .eq("student_id", userId)
      .eq("track_slug", trackSlug)
      .limit(1)
      .maybeSingle();

    // A read failure must not be reported as "not complete" silently — that
    // would lock someone out of a phase they finished. Log and fail open:
    // being shown content you already earned is the better error.
    if (error) {
      console.error("[completion] read failed", trackSlug, error.message);
      return true;
    }
    return Boolean(data);
  },
);

/** Every completed track slug for a student, for the phases view. */
export async function completedTrackSlugs(studentId?: string): Promise<Set<string>> {
  const userId = studentId ?? (await getSessionContext())?.userId;
  if (!userId) return new Set();

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("track_completions")
    .select("track_slug")
    .eq("student_id", userId);
  if (error) {
    console.error("[completion] list failed", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.track_slug as string));
}

export type CompletionResult =
  | { recorded: true; certificateId: string | null }
  | { recorded: false; reason: "not-self-completable" | "no-session" | "no-program" | "error" };

/**
 * Record that the signed-in learner finished a track they are allowed to
 * finish on their own.
 *
 * Refuses unless the track's config says `selfCompletable`. That check is the
 * whole security model here: a learner can call this action with any slug, and
 * every slug that ends in a real certificate says no.
 */
export async function recordOwnCompletion(trackSlug: string): Promise<CompletionResult> {
  const ctx = await getSessionContext();
  const userId = ctx?.userId;
  if (!userId) return { recorded: false, reason: "no-session" };

  const program = getHomeProgramForTrack(trackSlug);
  const track = program ? getTrackBySlug(program, trackSlug) : undefined;
  if (!track?.selfCompletable) return { recorded: false, reason: "not-self-completable" };

  const svc = createServiceClient();
  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", program!.slug)
    .maybeSingle<{ id: string }>();
  if (!programRow) return { recorded: false, reason: "no-program" };

  // Upsert, not insert: finishing twice is a thing people do, and the second
  // pass must not throw on the unique constraint or wipe the first
  // completion's date.
  const { data, error } = await svc
    .from("track_completions")
    .upsert(
      { student_id: userId, track_slug: trackSlug, program_id: programRow.id },
      { onConflict: "student_id,track_slug,program_id", ignoreDuplicates: false },
    )
    .select("certificate_id")
    .maybeSingle<{ certificate_id: string }>();

  if (error) {
    console.error("[completion] write failed", trackSlug, error.message);
    return { recorded: false, reason: "error" };
  }
  return { recorded: true, certificateId: data?.certificate_id ?? null };
}
