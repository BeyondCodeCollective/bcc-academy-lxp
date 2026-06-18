// Progress & Completion analytics — "are they moving through and finishing?"
//
// Completion rate, time-to-completion, and the drop-off curve (what week do
// learners stop?). All BCC-wide, from existing tables. "Furthest week reached"
// uses any weekly activity (attendance / submission / reflection) as the
// liveness proxy — there's no per-lesson view tracking, so this measures
// "still doing the work", which is the honest signal this platform records.

import { createServiceClient } from "@/lib/supabase/server";
import { getAllPrograms } from "@/lib/programs";
import type { ProgramScope } from "@/lib/programs/scope";
import { getLearnerActivity } from "@/lib/analytics/activity";

export type TrackProgress = {
  slug: string;
  name: string;
  totalWeeks: number;
  enrolled: number;
  completed: number;
  completionRate: number; // 0–100
  /** dropoff[i] = % of enrolled who reached at least week (i+1). */
  dropoff: number[];
};

export type ProgressData = {
  tracks: TrackProgress[];
  totalEnrolled: number;
  totalCompleted: number;
  overallCompletionRate: number; // 0–100
  /** Median days from enrollment to completion, or null if none completed. */
  medianDaysToComplete: number | null;
};

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export async function fetchProgressData(scope: ProgramScope): Promise<ProgressData> {
  const svc = createServiceClient();
  const ids = scope.ids;

  const [enrollRes, completeRes, activity] = await Promise.all([
    svc.from("student_tracks").select("student_id, track_slug, created_at").in("program_id", ids),
    svc.from("track_completions").select("student_id, track_slug, completed_at").in("program_id", ids),
    getLearnerActivity(scope),
  ]);

  const enrollments = enrollRes.data ?? [];
  const completions = completeRes.data ?? [];

  // Track metadata (name + totalWeeks) from program configs.
  const meta = new Map<string, { name: string; totalWeeks: number }>();
  for (const p of getAllPrograms()) {
    for (const t of p.tracks) {
      meta.set(t.slug, { name: t.shortName || t.name, totalWeeks: t.totalWeeks });
    }
  }

  // Furthest week reached per (student, track) across all activity.
  const furthest = new Map<string, number>(); // `${student}|${slug}` → max week
  for (const a of activity) {
    if (a.week == null) continue;
    const key = `${a.student_id}|${a.slug}`;
    furthest.set(key, Math.max(furthest.get(key) ?? 0, a.week));
  }

  // Enrollment dates, for time-to-completion.
  const enrolledAt = new Map<string, string>(); // `${student}|${slug}` → created_at
  const enrolledByTrack = new Map<string, string[]>(); // slug → student_ids
  for (const e of enrollments) {
    const key = `${e.student_id}|${e.track_slug}`;
    if (e.created_at) enrolledAt.set(key, e.created_at);
    const list = enrolledByTrack.get(e.track_slug) ?? [];
    list.push(e.student_id);
    enrolledByTrack.set(e.track_slug, list);
  }

  const completedByTrack = new Map<string, number>();
  for (const c of completions) {
    completedByTrack.set(c.track_slug, (completedByTrack.get(c.track_slug) ?? 0) + 1);
  }

  const tracks: TrackProgress[] = [];
  for (const [slug, students] of enrolledByTrack.entries()) {
    const m = meta.get(slug);
    const totalWeeks = m?.totalWeeks ?? 8;
    const enrolled = students.length;
    const completed = completedByTrack.get(slug) ?? 0;
    const dropoff: number[] = [];
    for (let week = 1; week <= totalWeeks; week++) {
      const reached = students.filter(
        (sid) => (furthest.get(`${sid}|${slug}`) ?? 0) >= week,
      ).length;
      dropoff.push(enrolled > 0 ? Math.round((reached / enrolled) * 100) : 0);
    }
    tracks.push({
      slug,
      name: m?.name ?? slug,
      totalWeeks,
      enrolled,
      completed,
      completionRate: enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0,
      dropoff,
    });
  }
  tracks.sort((a, b) => b.enrolled - a.enrolled);

  // Median time-to-completion across all completions with a known enroll date.
  const days: number[] = [];
  for (const c of completions) {
    const start = enrolledAt.get(`${c.student_id}|${c.track_slug}`);
    if (!start || !c.completed_at) continue;
    const ms = new Date(c.completed_at).getTime() - new Date(start).getTime();
    if (ms >= 0) days.push(ms / 86_400_000);
  }

  const totalEnrolled = enrollments.length;
  const totalCompleted = completions.length;

  return {
    tracks,
    totalEnrolled,
    totalCompleted,
    overallCompletionRate:
      totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0,
    medianDaysToComplete: median(days) === null ? null : Math.round(median(days)!),
  };
}
