// Aggregates one course's engagement for the admin snapshot. Activity = live
// session attended, lesson watched, work submitted, tutor chat, or browsing
// (activity_events). Server only (service client). Returns null when the
// course has no learners.

import { createServiceClient } from "@/lib/supabase/server";
import type { ProgressDay, HeatLevel } from "@/components/stats/streak-heatmap";
import type { CourseEngagementProps } from "@/components/stats/course-engagement";

const HEATMAP_WEEKS = 12;
const MS_PER_DAY = 86_400_000;

function dayKey(iso: string | Date): string {
  return (typeof iso === "string" ? new Date(iso) : iso).toISOString().slice(0, 10);
}

/** Enrolled-learner and active-learner counts per track, for the course list. */
export type CourseRosterStat = { total: number; active: number };

/**
 * Per-track {total, active} for every course in the list, using the SAME
 * activity signals as getCourseEngagement so the list and the course Overview
 * can never disagree.
 *
 * Two bugs this exists to avoid:
 *  • Counting only `students.last_activity_at` calls a Zoom camp "0 active"
 *    — those learners attend live and never browse the dashboard.
 *  • Scoping learners by `students.program_id` drops anyone enrolled in this
 *    program's track whose own row belongs to another program.
 * Membership comes from `student_tracks` (the enrollment), role from a lookup
 * keyed on the enrolled ids rather than on program.
 */
export async function getCourseRosterStats(
  trackSlugs: string[],
  programIds: string[],
  now: Date = new Date(),
): Promise<Record<string, CourseRosterStat>> {
  const empty: Record<string, CourseRosterStat> = {};
  if (trackSlugs.length === 0 || programIds.length === 0) return empty;

  const svc = createServiceClient();

  const { data: enroll } = await svc
    .from("student_tracks")
    .select("student_id, track_slug")
    .in("track_slug", trackSlugs)
    .in("program_id", programIds);
  const enrollments = enroll ?? [];
  const enrolledIds = Array.from(new Set(enrollments.map((e) => e.student_id)));
  if (enrolledIds.length === 0) return empty;

  // Role by id, NOT by program — an enrolled learner may sit under another
  // program's row and would otherwise vanish from the count.
  const { data: studentRows } = await svc
    .from("students")
    .select("id, role")
    .in("id", enrolledIds);
  const learners = (studentRows ?? []).filter((s) => s.role === "student");
  const learnerIds = learners.map((s) => s.id);
  if (learnerIds.length === 0) return empty;

  const since = new Date(now.getTime() - 7 * MS_PER_DAY).toISOString();
  const [watchedRes, subRes, tutorRes, attRes, eventRes] = await Promise.all([
    svc
      .from("week_progress")
      .select("user_id, track_slug")
      .in("track_slug", trackSlugs)
      .in("user_id", learnerIds)
      .gte("video_watched_at", since),
    svc
      .from("submissions")
      .select("student_id, track_slug")
      .in("track_slug", trackSlugs)
      .in("student_id", learnerIds)
      .gte("submitted_at", since),
    svc
      .from("tutor_messages")
      .select("student_id")
      .in("student_id", learnerIds)
      .gte("created_at", since),
    svc
      .from("attendance")
      .select("student_id, track")
      .in("track", trackSlugs)
      .in("student_id", learnerIds)
      .gte("checked_in_at", since),
    // Browsing/login. NOT students.last_activity_at — that column's only
    // writer was a dropped `void` builder, so it reads NULL for nearly every
    // learner. activity_events is the real log: its insert is awaited.
    // `login` never carries a track_slug and 39% of page_views don't either,
    // so these count as active-anywhere, exactly as last_activity_at did.
    svc
      .from("activity_events")
      .select("user_id")
      .in("user_id", learnerIds)
      .gte("created_at", since),
  ]);

  // Track-scoped signals mark a learner active in THAT track. Tutor chat and
  // browsing aren't track-scoped, so they mark the learner active everywhere
  // they're enrolled — same as the Overview's per-track union.
  const activeInTrack = new Map<string, Set<string>>();
  const mark = (slug: string, id: string) => {
    if (!activeInTrack.has(slug)) activeInTrack.set(slug, new Set());
    activeInTrack.get(slug)!.add(id);
  };
  for (const r of watchedRes.data ?? []) mark(r.track_slug, r.user_id);
  for (const r of subRes.data ?? []) mark(r.track_slug, r.student_id);
  for (const r of attRes.data ?? []) mark(r.track, r.student_id);

  const activeAnywhere = new Set<string>((tutorRes.data ?? []).map((r) => r.student_id));
  for (const r of eventRes.data ?? []) activeAnywhere.add(r.user_id);

  const learnerIdSet = new Set(learnerIds);
  const stats: Record<string, CourseRosterStat> = {};
  for (const slug of trackSlugs) {
    const ids = new Set(
      enrollments.filter((e) => e.track_slug === slug && learnerIdSet.has(e.student_id))
        .map((e) => e.student_id),
    );
    const inTrack = activeInTrack.get(slug) ?? new Set<string>();
    let active = 0;
    for (const id of ids) if (inTrack.has(id) || activeAnywhere.has(id)) active += 1;
    stats[slug] = { total: ids.size, active };
  }
  return stats;
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
    .select("id, role, last_seen_at")
    .in("id", enrolledIds);
  const learners = (studentRows ?? []).filter((s) => s.role === "student") as {
    id: string;
    last_seen_at: string | null;
  }[];
  if (learners.length === 0) return null;
  const learnerIds = learners.map((s) => s.id);

  const [watchedRes, subRes, tutorRes, attRes, eventRes] = await Promise.all([
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
    // Browsing/login, from the real event log. students.last_activity_at is
    // NULL for nearly every learner — its only writer was a dropped `void`
    // builder. Bounded to the heatmap window so this stays a small read.
    svc
      .from("activity_events")
      .select("user_id, created_at")
      .in("user_id", learnerIds)
      .gte("created_at", new Date(now.getTime() - HEATMAP_WEEKS * 7 * MS_PER_DAY).toISOString()),
  ]);

  const watched = watchedRes.data ?? [];
  const subs = subRes.data ?? [];
  const tutor = tutorRes.data ?? [];
  const att = attRes.data ?? [];
  const events = eventRes.data ?? [];

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
  // (for the status buckets), across every engagement signal — browsing now
  // included, because activity_events is a real per-event log rather than the
  // single overwritten timestamp last_activity_at was meant to be.
  //
  // The heatmap counts DISTINCT LEARNERS per day, not events. Counting events
  // would let page_views (dozens per learner per session) drown out one
  // check-in per learner per day, and "when the cohort shows up" is a question
  // about people, not clicks.
  const perDay = new Map<string, Set<string>>();
  const latestByLearner = new Map<string, number>();
  const record = (learnerId: string | null, iso: string | null | undefined) => {
    if (!iso) return;
    const key = dayKey(iso);
    if (!perDay.has(key)) perDay.set(key, new Set());
    if (learnerId) {
      perDay.get(key)!.add(learnerId);
      const t = new Date(iso).getTime();
      latestByLearner.set(learnerId, Math.max(latestByLearner.get(learnerId) ?? 0, t));
    }
  };
  for (const r of watched) record(r.user_id, r.video_watched_at);
  for (const r of subs) record(r.student_id, r.submitted_at);
  for (const r of tutor) record(r.student_id, r.created_at);
  for (const r of att) record(r.student_id, r.checked_in_at);
  for (const r of events) record(r.user_id, r.created_at);

  const weekAgo = now.getTime() - 7 * MS_PER_DAY;
  let active = 0;
  let idle = 0;
  let bounced = 0;
  let neverLoggedIn = 0;
  for (const s of learners) {
    const latest = latestByLearner.get(s.id);
    // last_seen_at is written on every login (auth callback, awaited) and is
    // the only reliable "has ever signed in" flag.
    const loggedIn = !!s.last_seen_at;
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
  // Scale levels to the busiest day so a small cohort still reads. Values are
  // distinct-learner counts, capped by the cohort size.
  const maxDay = Math.max(1, ...Array.from(perDay.values(), (s) => s.size));
  const days: ProgressDay[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(start.getTime() + i * MS_PER_DAY);
    const key = dayKey(d);
    const future = key > todayKey;
    const count = perDay.get(key)?.size ?? 0;
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
