import { getEveryProgramConfig } from "@/lib/programs";
import { surveyNotOpenYet } from "@/lib/onboarding/survey-timing";

/**
 * The timed survey a course page should hand its learners to, if one is open.
 *
 * Only surveys that are required, name this course in appliesToTracks AND carry
 * an opensAt qualify: that is the "end of session" shape (Catalyst Labs post).
 * The dashboard home already redirects to these, but learners in a single
 * course rarely load the home; they sit on the course page. Pre-surveys and
 * other untimed instruments keep their existing dashboard-only behavior.
 */
export function openTimedSurveyForTrack(trackSlug: string, now: number = Date.now()): string | null {
  for (const p of getEveryProgramConfig()) {
    for (const s of p.surveys ?? []) {
      if (s.required && s.opensAt && s.appliesToTracks?.includes(trackSlug) && !surveyNotOpenYet(s, now)) {
        return s.id;
      }
    }
  }
  return null;
}
