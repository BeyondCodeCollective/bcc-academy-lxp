// Aggregates one course's engagement for the admin snapshot. Activity = lesson
// watched, work submitted, tutor chat, or browsing (last_activity_at). Server
// only (service client). Returns null when the course has no learners.

import { createServiceClient } from "@/lib/supabase/server";
import type { ProgressDay, HeatLevel } from "@/components/stats/streak-heatmap";
import type { CourseEngagementProps } from "@/components/stats/course-engagement";

const HEATMAP_WEEKS = 12;
const MS_PER_DAY = 86_400_000;

function dayKey(iso: string | Date): string {
  return (typeof iso === "string" ? new Date(iso) : iso).toISOString().slice(0, 10);
}

/** What a track can actually measure. A camp with no videos and no submissions
 *  would otherwise render two tiles that are structurally pinned at zero. */
export type TrackCapabilities = {
  /** Any week defines a videoUrl, so `video_watched_at` can ever be written. */
  hasVideoContent: boolean;
  submissionsEnabled: boolean;
  /** "Week" or "Day" — labels the per-session attendance breakdown. */
  unitLabel: string;
};

export async function getCourseEngagement(
  courseName: string,
  trackSlug: string,
  programIds: string[],
  capabilities: TrackCapabilities,
  now: Date = new Date(),
): Promise<CourseEngagementProps | null> {
  const svc = createServiceClient();

  // Enrolled learners (students only) in this course, within program scope.
  const { data: enroll } = await svc
    .from("student_tracks")
    .select("student_id")
    .eq("track_slug", trackSlug)
    .in("program_id", programIds);
  const enrolledIds = Array.from(new Set((enroll ?? []).map((r) => r.student_id)));
  if (enrolledIds.length === 0) return null;

  const { data: studentRows } = await svc
    .from("students")
    .select("id, role, last_seen_at, last_activity_at")
    .in("id", enrolledIds);
  const learners = (studentRows ?? []).filter((s) => s.role === "student") as {
    id: string;
    last_seen_at: string | null;
    last_activity_at: string | null;
  }[];
  if (learners.length === 0) return null;
  const learnerIds = learners.map((s) => s.id);

  const [watchedRes, subRes, tutorRes, attRes] = await Promise.all([
    svc
      .from("week_progress")
      .select("user_id, week_number, video_watched_at")
      .eq("track_slug", trackSlug)
      .in("user_id", learnerIds)
      .not("video_watched_at", "is", null),
    svc
      .from("submissions")
      .select("student_id, submitted_at")
      .eq("track_slug", trackSlug)
      .in("student_id", learnerIds)
      .not("submitted_at", "is", null),
    svc
      .from("tutor_messages")
      .select("student_id, created_at")
      .in("student_id", learnerIds),
    // Attendance (live-session joins) is the engagement signal for camps and
    // cohort courses that don't generate video/submission activity. Note the
    // attendance table keys on `track`/`checked_in_at`, not track_slug.
    svc
      .from("attendance")
      .select("student_id, checked_in_at, week_number, session_number")
      .eq("track", trackSlug)
      .in("student_id", learnerIds)
      .not("checked_in_at", "is", null),
  ]);

  const watched = watchedRes.data ?? [];
  const subs = subRes.data ?? [];
  const tutor = tutorRes.data ?? [];
  const att = attRes.data ?? [];

  const lessonsWatched = new Set(
    watched.map((r) => `${r.user_id}-${r.week_number}`),
  ).size;
  const submissions = subs.length;

  // Attendance, per session. A held session is one somebody checked into — the
  // schedule alone can't say whether a session ran. `perfect` counts learners
  // present at every held session: that's the certificate-eligible number, and
  // unlike an overall attendance rate it can't average a drop-off away.
  const sessionKey = (r: { week_number: number; session_number: number }) =>
    `${r.week_number}-${r.session_number}`;
  const heldKeys = Array.from(new Set(att.map(sessionKey))).sort((a, b) => {
    const [aw, as] = a.split("-").map(Number);
    const [bw, bs] = b.split("-").map(Number);
    return aw - bw || as - bs;
  });
  const byLearner = new Map<string, Set<string>>();
  for (const r of att) {
    if (!byLearner.has(r.student_id)) byLearner.set(r.student_id, new Set());
    byLearner.get(r.student_id)!.add(sessionKey(r));
  }
  const attendance = heldKeys.length
    ? {
        sessionsHeld: heldKeys.length,
        perfect: learners.filter((s) => byLearner.get(s.id)?.size === heldKeys.length).length,
        unitLabel: capabilities.unitLabel,
        perSession: heldKeys.map((k) => ({
          unit: Number(k.split("-")[0]),
          session: Number(k.split("-")[1]),
          present: att.filter((r) => sessionKey(r) === k).length,
        })),
      }
    : null;

  // Never hide a metric that has real data behind it — only one the track can
  // never produce.
  const showLessonsWatched = capabilities.hasVideoContent || lessonsWatched > 0;
  const showSubmissions = capabilities.submissionsEnabled || submissions > 0;

  // Per-day cohort activity (for the heatmap) and per-learner latest activity
  // (for the status buckets), across all three engagement signals.
  const perDay = new Map<string, number>();
  const latestByLearner = new Map<string, number>();
  const record = (learnerId: string | null, iso: string | null | undefined) => {
    if (!iso) return;
    perDay.set(dayKey(iso), (perDay.get(dayKey(iso)) ?? 0) + 1);
    if (learnerId) {
      const t = new Date(iso).getTime();
      latestByLearner.set(learnerId, Math.max(latestByLearner.get(learnerId) ?? 0, t));
    }
  };
  for (const r of watched) record(r.user_id, r.video_watched_at);
  for (const r of subs) record(r.student_id, r.submitted_at);
  for (const r of tutor) record(r.student_id, r.created_at);
  for (const r of att) record(r.student_id, r.checked_in_at);
  // Browsing (last_activity_at) also counts toward "active", but not the heatmap
  // (it's a single timestamp, not a per-event log).
  for (const s of learners) {
    if (s.last_activity_at) {
      const t = new Date(s.last_activity_at).getTime();
      latestByLearner.set(s.id, Math.max(latestByLearner.get(s.id) ?? 0, t));
    }
  }

  const weekAgo = now.getTime() - 7 * MS_PER_DAY;
  let active = 0;
  let idle = 0;
  let bounced = 0;
  let neverLoggedIn = 0;
  for (const s of learners) {
    const latest = latestByLearner.get(s.id);
    const loggedIn = !!(s.last_seen_at || s.last_activity_at);
    if (latest && latest >= weekAgo) active += 1;
    else if (latest) idle += 1;
    else if (loggedIn) bounced += 1;
    else neverLoggedIn += 1;
  }

  // 12-week heatmap ending on the Saturday that closes this week.
  const end = new Date(now);
  end.setUTCDate(now.getUTCDate() + (6 - now.getUTCDay()));
  const total = HEATMAP_WEEKS * 7;
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (total - 1));
  const todayKey = dayKey(now);
  // Scale levels to the busiest day so a small cohort still reads.
  const maxDay = Math.max(1, ...perDay.values());
  const days: ProgressDay[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(start.getTime() + i * MS_PER_DAY);
    const key = dayKey(d);
    const future = key > todayKey;
    const count = perDay.get(key) ?? 0;
    const level: HeatLevel = future || count === 0
      ? 0
      : (Math.min(4, Math.ceil((count / maxDay) * 4)) as HeatLevel);
    days.push({ date: key, level, future });
  }

  return {
    courseName,
    totalLearners: learners.length,
    activeThisWeek: active,
    lessonsWatched,
    submissions,
    showLessonsWatched,
    showSubmissions,
    attendance,
    status: { active, idle, bounced, neverLoggedIn },
    days,
  };
}
