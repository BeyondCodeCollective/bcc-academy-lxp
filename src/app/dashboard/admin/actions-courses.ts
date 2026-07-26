"use server";

import { requireCapability } from "./actions-shared";
import { getProgram } from "@/lib/programs/server";
import { resolveProgramScope } from "@/lib/programs/scope";
import { fetchProgressData } from "@/lib/analytics/progress";
import { getLearnerActivity } from "@/lib/analytics/activity";
import { getAllPrograms } from "@/lib/programs";

// Courses & Progress analytics — the "are they moving through and finishing?"
// view, laid out like Circle's Courses page but built from our tables. Reuses
// fetchProgressData for the headline + per-course table, then assembles the
// completion distribution and per-student table from the activity union.

export type PopularCourse = {
  slug: string;
  name: string;
  enrolled: number;
  started: number;
  completed: number;
  completionRate: number;
};

export type ActiveStudent = {
  name: string;
  email: string;
  lessons: number;
  started: number;
  completed: number;
  /** Average progress across the learner's enrolled courses, 0–100. */
  completionPct: number;
  lastActive: string | null;
};

export type CoursesAnalytics = {
  programName: string;
  totalEnrolled: number;
  totalCompleted: number;
  overallCompletionRate: number;
  /** Enrolled (student,course) pairs bucketed by progress. */
  distribution: { label: string; value: number }[];
  popularCourses: PopularCourse[];
  activeStudents: ActiveStudent[];
};

export async function getCoursesAnalytics(
  courseSlug?: string,
): Promise<CoursesAnalytics> {
  const { svc } = await requireCapability("view_insights");
  const program = await getProgram();
  const scope = await resolveProgramScope(program.slug);
  const ids = scope.ids;

  const empty: CoursesAnalytics = {
    programName: program.name,
    totalEnrolled: 0,
    totalCompleted: 0,
    overallCompletionRate: 0,
    distribution: [],
    popularCourses: [],
    activeStudents: [],
  };
  if (ids.length === 0) return empty;

  const [progress, activity, enrollRes, completeRes, studentRes, videoRes] =
    await Promise.all([
      fetchProgressData(scope),
      getLearnerActivity(scope),
      svc.from("student_tracks").select("student_id, track_slug").in("program_id", ids),
      svc.from("track_completions").select("student_id, track_slug").in("program_id", ids),
      svc
        .from("students")
        .select("id, first_name, last_name, email")
        .in("program_id", ids)
        .eq("role", "student")
        .eq("is_test", false)
        .eq("is_staff", false),
      svc.from("week_progress").select("user_id").in("program_id", ids).not("video_watched_at", "is", null),
    ]);

  // Track metadata (totalWeeks) for progress fractions.
  const weeksBySlug = new Map<string, number>();
  const nameBySlug = new Map<string, string>();
  for (const p of getAllPrograms()) {
    for (const t of p.tracks) {
      weeksBySlug.set(t.slug, t.totalWeeks);
      nameBySlug.set(t.slug, t.shortName || t.name);
    }
  }

  // Enrolled (student,course) pairs, de-duped. Scoped to one course when the
  // shared Analytics scope is set, so distribution + active students below all
  // reflect just that course.
  const enrolledPairs = new Set<string>();
  for (const e of (enrollRes.data ?? []) as { student_id: string; track_slug: string }[]) {
    if (courseSlug && e.track_slug !== courseSlug) continue;
    enrolledPairs.add(`${e.student_id}|${e.track_slug}`);
  }
  // Completed pairs (100% by definition).
  const completedPairs = new Set<string>();
  for (const c of (completeRes.data ?? []) as { student_id: string; track_slug: string }[]) {
    completedPairs.add(`${c.student_id}|${c.track_slug}`);
  }
  // Furthest week + last-active timestamp per (student,course) from the union.
  const furthest = new Map<string, number>();
  const lastActive = new Map<string, string>();
  const startedTracks = new Map<string, Set<string>>(); // student → set of active slugs
  for (const a of activity) {
    const key = `${a.student_id}|${a.slug}`;
    if (a.week != null) furthest.set(key, Math.max(furthest.get(key) ?? 0, a.week));
    if (a.at && (a.at > (lastActive.get(a.student_id) ?? ""))) lastActive.set(a.student_id, a.at);
    let set = startedTracks.get(a.student_id);
    if (!set) { set = new Set(); startedTracks.set(a.student_id, set); }
    set.add(a.slug);
  }

  // Progress fraction (0–100) for an enrolled pair: 100 if completed, else
  // furthest week ÷ course length. Clamped so partial data never reads >100.
  const fractionFor = (key: string, slug: string): number => {
    if (completedPairs.has(key)) return 100;
    const weeks = weeksBySlug.get(slug) ?? 8;
    const reached = furthest.get(key) ?? 0;
    return Math.min(100, Math.round((reached / weeks) * 100));
  };

  // Completion distribution across enrolled pairs.
  const buckets = { "0%": 0, "1–25%": 0, "26–75%": 0, "76–99%": 0, "100%": 0 };
  for (const key of enrolledPairs) {
    const slug = key.split("|")[1];
    const f = fractionFor(key, slug);
    if (f === 0) buckets["0%"]++;
    else if (f <= 25) buckets["1–25%"]++;
    else if (f <= 75) buckets["26–75%"]++;
    else if (f < 100) buckets["76–99%"]++;
    else buckets["100%"]++;
  }
  const distribution = Object.entries(buckets).map(([label, value]) => ({ label, value }));

  // Popular courses: reuse the reconciled TrackProgress, add "started" (enrolled
  // learners with any activity in that course) from the activity union.
  const startedByTrack = new Map<string, number>();
  for (const key of enrolledPairs) {
    const [sid, slug] = key.split("|");
    if (startedTracks.get(sid)?.has(slug)) {
      startedByTrack.set(slug, (startedByTrack.get(slug) ?? 0) + 1);
    }
  }
  // Scope the per-track rollup + totals to the selected course when set.
  const scopedTracks = courseSlug
    ? progress.tracks.filter((t) => t.slug === courseSlug)
    : progress.tracks;
  const popularCourses: PopularCourse[] = scopedTracks
    .map((t) => ({
      slug: t.slug,
      name: t.name,
      enrolled: t.enrolled,
      started: startedByTrack.get(t.slug) ?? 0,
      completed: t.completed,
      completionRate: t.completionRate,
    }))
    .slice(0, 10);

  // Per-student rollup for the Active students table. Only learners with any
  // activity — the point is the active roster, not the full enrollment list.
  const lessonsByStudent = new Map<string, number>();
  for (const r of (videoRes.data ?? []) as { user_id: string }[]) {
    lessonsByStudent.set(r.user_id, (lessonsByStudent.get(r.user_id) ?? 0) + 1);
  }
  const enrolledBySid = new Map<string, string[]>();
  for (const key of enrolledPairs) {
    const [sid, slug] = key.split("|");
    (enrolledBySid.get(sid) ?? enrolledBySid.set(sid, []).get(sid)!).push(slug);
  }
  const students = (studentRes.data ?? []) as {
    id: string; first_name: string | null; last_name: string | null; email: string;
  }[];
  const activeStudents: ActiveStudent[] = students
    .filter(
      (s) =>
        (enrolledBySid.get(s.id)?.length ?? 0) > 0 &&
        (startedTracks.get(s.id)?.size ?? 0) > 0,
    )
    .map((s) => {
      const slugs = enrolledBySid.get(s.id) ?? [];
      const fracs = slugs.map((slug) => fractionFor(`${s.id}|${slug}`, slug));
      const completionPct = fracs.length
        ? Math.round(fracs.reduce((a, b) => a + b, 0) / fracs.length)
        : 0;
      return {
        name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim(),
        email: s.email,
        lessons: lessonsByStudent.get(s.id) ?? 0,
        started: startedTracks.get(s.id)?.size ?? 0,
        completed: slugs.filter((slug) => completedPairs.has(`${s.id}|${slug}`)).length,
        completionPct,
        lastActive: lastActive.get(s.id)?.slice(0, 10) ?? null,
      };
    })
    .sort((a, b) => b.lessons + b.started - (a.lessons + a.started))
    .slice(0, 50);

  // Totals: the one course's figures when scoped, else program-wide.
  const scopedTotals = courseSlug
    ? {
        totalEnrolled: scopedTracks.reduce((n, t) => n + t.enrolled, 0),
        totalCompleted: scopedTracks.reduce((n, t) => n + t.completed, 0),
        overallCompletionRate: scopedTracks[0]?.completionRate ?? 0,
      }
    : {
        totalEnrolled: progress.totalEnrolled,
        totalCompleted: progress.totalCompleted,
        overallCompletionRate: progress.overallCompletionRate,
      };

  return {
    programName: program.name,
    totalEnrolled: scopedTotals.totalEnrolled,
    totalCompleted: scopedTotals.totalCompleted,
    overallCompletionRate: scopedTotals.overallCompletionRate,
    distribution,
    popularCourses,
    activeStudents,
  };
}
