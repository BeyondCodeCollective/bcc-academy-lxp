"use server";

/**
 * What the session stage writes back to the platform.
 *
 * The stage is a client component with a lot of local state — which beat,
 * which votes, which tab — and almost none of that is worth keeping. Two
 * things are: the sentence the learner writes at the end, and the fact that
 * they finished. Both go through the platform's existing reflection and
 * week-progress paths rather than a store of their own, so the sentence shows
 * up in the normal reflection view, counts toward the track progress map, and
 * reaches a facilitator the way every other reflection does.
 */

import { submitReflection, markVideoWatched } from "@/app/dashboard/track/actions";

/**
 * Save the four-second call.
 *
 * Keyed by the track's own reflection prompt, because `reflections.responses`
 * is a map of prompt text to answer — key it anything else and the answer is
 * stored but never rendered, which is worse than not saving it.
 */
export async function saveFourSecondCall(
  trackSlug: string,
  weekNumber: number,
  prompt: string,
  sentence: string,
) {
  const text = sentence.trim();
  if (!text) return { success: false as const };
  await submitReflection(trackSlug, weekNumber, { [prompt]: text });
  return { success: true as const };
}

/**
 * Mark the session done.
 *
 * `markVideoWatched` is the platform's "I sat through the session" signal —
 * self-reported completion, which is exactly what finishing the stage is.
 * Reusing it means the track page, the progress map and sequential gating all
 * see this session the same way they see every other one.
 */
export async function markSessionComplete(trackSlug: string, weekNumber: number) {
  await markVideoWatched(trackSlug, weekNumber);
  return { success: true as const };
}
