import { createServiceClient } from "@/lib/supabase/server";
import { trackHasStarted } from "@/lib/utils";

// Staff who TAKE a course (the Field Ready staff cohort is all staff, many of
// them admins) get the student view of it once it has started: they land on
// it at login and its pages treat them as learners. Teaching it (an
// instructor_tracks row) keeps the admin view. The admin panel stays one
// click away in the account menu.

type TrackDates = { track_slug: string; start_date: string | null; total_weeks: number | null };

/** True while the course runs: started, and not past its last week. */
export function courseIsRunning(t: TrackDates, now: Date = new Date()): boolean {
  if (!t.start_date || !trackHasStarted({ startDate: t.start_date }, now)) return false;
  if (!t.total_weeks) return true;
  const end = new Date(`${t.start_date}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + t.total_weeks * 7);
  return now < end;
}

async function learnerCourses(userId: string, only?: string): Promise<TrackDates[]> {
  const svc = createServiceClient();
  let enrQ = svc.from("student_tracks").select("track_slug").eq("student_id", userId);
  let teachQ = svc.from("instructor_tracks").select("track_slug").eq("student_id", userId);
  if (only) {
    enrQ = enrQ.eq("track_slug", only);
    teachQ = teachQ.eq("track_slug", only);
  }
  const [{ data: enr }, { data: teach }] = await Promise.all([enrQ, teachQ]);
  const teaching = new Set(((teach ?? []) as { track_slug: string }[]).map((r) => r.track_slug));
  const slugs = ((enr ?? []) as { track_slug: string }[])
    .map((r) => r.track_slug)
    .filter((s) => !teaching.has(s));
  if (slugs.length === 0) return [];
  const { data } = await svc
    .from("track_overrides")
    .select("track_slug, start_date, total_weeks")
    .in("track_slug", slugs);
  return (data ?? []) as TrackDates[];
}

/** Whether this person takes `trackSlug` as a learner and it has started. */
export async function takesCourseAsLearner(userId: string, trackSlug: string): Promise<boolean> {
  const rows = await learnerCourses(userId, trackSlug);
  return rows.some((t) => !!t.start_date && trackHasStarted({ startDate: t.start_date }));
}

/** A running course this person is taking as a learner, or null. */
export async function runningLearnerCourse(userId: string): Promise<string | null> {
  const rows = await learnerCourses(userId);
  return rows.find((t) => courseIsRunning(t))?.track_slug ?? null;
}
