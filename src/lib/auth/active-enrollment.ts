import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";
import { getEnrolledTracks } from "@/lib/enrollment";

const isStarted = (t: TrackConfig): boolean =>
  !t.startDateTbd && Date.now() >= new Date(t.startDate).getTime();

export type LearnerAccess = {
  enrolled: TrackConfig[];
  /** At least one enrolled course has started — a full-access learner. */
  hasActiveCourse: boolean;
  /** Enrolled, but EVERY course is not-yet-started — confine to the holding
   *  page (an event registrant before their course begins). */
  pendingOnly: boolean;
  /** A not-yet-started track to route a pending learner to. */
  pendingSlug: string | null;
};

/**
 * Classifies a learner's access from their enrolled tracks. A "pending" learner
 * (registered for a course that hasn't started) must be confined to their
 * holding page — they should not reach program content (Workshops, Resources,
 * AI Tutor) until their course actually begins. Admins/staff are exempt at the
 * call site.
 */
export async function getLearnerAccess(
  supabase: SupabaseClient,
  userId: string,
  program: ProgramConfig,
): Promise<LearnerAccess> {
  const enrolled = await getEnrolledTracks(supabase, userId, program);
  const hasActiveCourse = enrolled.some(isStarted);
  const pending = enrolled.find((t) => !isStarted(t));
  return {
    enrolled,
    hasActiveCourse,
    pendingOnly: enrolled.length > 0 && !hasActiveCourse,
    pendingSlug: pending?.slug ?? null,
  };
}
