import { isLearner } from "@/lib/analytics/engagement";

type Person = { role?: string | null; is_test?: boolean | null; is_staff?: boolean | null };
type TrackOverridesClient = {
  from: (table: "track_overrides") => {
    select: (cols: "track_slug") => {
      eq: (col: "staff_cohort", v: true) => PromiseLike<{ data: { track_slug: string }[] | null; error: unknown }>;
    };
  };
};

/**
 * Slugs of courses whose learners are staff (track_overrides.staff_cohort).
 * Code-defined configs never set this, so the DB is the only source of truth.
 */
export async function getStaffCohortSlugs(svc: unknown): Promise<Set<string>> {
  const { data } = await (svc as TrackOverridesClient)
    .from("track_overrides")
    .select("track_slug")
    .eq("staff_cohort", true);
  return new Set((data ?? []).map((r) => r.track_slug));
}

/**
 * Does this person count as a learner on THIS course? On a staff cohort every
 * non-test enrollee does; everywhere else the standard isLearner rule applies.
 */
export function isLearnerOnCourse(person: Person, trackSlug: string, staffCohortSlugs: Set<string>): boolean {
  return staffCohortSlugs.has(trackSlug) ? !person.is_test : isLearner(person);
}
