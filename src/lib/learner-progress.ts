// Builds the learner "My progress" card data from real activity. Activity = any
// day the learner watched a lesson, submitted work, or chatted with the tutor.
// Server-only (service client). Returns null when there's nothing to show yet so
// the home page can skip the card for brand-new accounts.

import { createServiceClient } from "@/lib/supabase/server";
import type { ProgressDay, HeatLevel } from "@/components/stats/streak-heatmap";
import type { MyProgressCardProps } from "@/components/my-progress-card";

const HEATMAP_WEEKS = 12;
const MS_PER_DAY = 86_400_000;

/** yyyy-mm-dd in UTC — matches how the heatmap keys days. */
function dayKey(iso: string | Date): string {
  return (typeof iso === "string" ? new Date(iso) : iso).toISOString().slice(0, 10);
}

function relativeLabel(iso: string | null, now: Date): string {
  if (!iso) return "Never";
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / MS_PER_DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  return `${Math.floor(days / 7)} weeks ago`;
}

export async function getLearnerProgress(
  userId: string,
  trackSlugs: string[],
  now: Date = new Date(),
): Promise<MyProgressCardProps | null> {
  if (trackSlugs.length === 0) return null;
  const svc = createServiceClient();

  const [watchedRes, submittedRes, tutorRes, studentRes] = await Promise.all([
    svc
      .from("week_progress")
      .select("track_slug, week_number, video_watched_at")
      .eq("user_id", userId)
      .in("track_slug", trackSlugs)
      .not("video_watched_at", "is", null),
    svc
      .from("submissions")
      .select("submitted_at")
      .eq("student_id", userId)
      .in("track_slug", trackSlugs)
      .not("submitted_at", "is", null),
    svc
      .from("tutor_messages")
      .select("created_at")
      .eq("student_id", userId),
    svc
      .from("students")
      .select("last_activity_at, last_seen_at")
      .eq("id", userId)
      .maybeSingle<{ last_activity_at: string | null; last_seen_at: string | null }>(),
  ]);

  const watched = watchedRes.data ?? [];
  const lessonsWatched = new Set(
    watched.map((r) => `${r.track_slug}-${r.week_number}`),
  ).size;

  // Per-day activity counts across all three signals.
  const perDay = new Map<string, number>();
  const bump = (iso: string | null | undefined) => {
    if (!iso) return;
    const k = dayKey(iso);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  };
  for (const r of watched) bump(r.video_watched_at);
  for (const r of submittedRes.data ?? []) bump(r.submitted_at);
  for (const r of tutorRes.data ?? []) bump(r.created_at);

  const lastActivity =
    studentRes.data?.last_activity_at ?? studentRes.data?.last_seen_at ?? null;

  // Nothing logged at all → no card. (last_activity alone isn't "progress".)
  if (perDay.size === 0 && lessonsWatched === 0) return null;

  // ── Streaks ──────────────────────────────────────────────────────────────
  const activeKeys = new Set(perDay.keys());
  const todayKey = dayKey(now);
  const yesterday = new Date(now.getTime() - MS_PER_DAY);

  // Current streak: walk back from today (or yesterday, so a missed-but-not-yet
  // -broken day doesn't zero it) while days remain active.
  let dayStreak = 0;
  {
    const cursor = activeKeys.has(todayKey) ? new Date(now) : yesterday;
    while (activeKeys.has(dayKey(cursor))) {
      dayStreak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }

  // Longest streak: scan all active days in order.
  let longestStreak = 0;
  {
    const sorted = Array.from(activeKeys).sort();
    let run = 0;
    let prev: number | null = null;
    for (const k of sorted) {
      const t = new Date(k).getTime();
      if (prev !== null && t - prev === MS_PER_DAY) run += 1;
      else run = 1;
      longestStreak = Math.max(longestStreak, run);
      prev = t;
    }
  }

  // ── Heatmap: 12 weeks ending on the Saturday that closes this week ─────────
  const end = new Date(now);
  end.setUTCDate(now.getUTCDate() + (6 - now.getUTCDay()));
  const total = HEATMAP_WEEKS * 7;
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (total - 1));

  const days: ProgressDay[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(start.getTime() + i * MS_PER_DAY);
    const key = dayKey(d);
    const future = key > todayKey;
    const count = perDay.get(key) ?? 0;
    const level: HeatLevel = future
      ? 0
      : count === 0
        ? 0
        : count >= 4
          ? 4
          : (count as HeatLevel);
    // A day is part of the live streak if it's active and within dayStreak of today.
    const daysAgo = Math.round((new Date(todayKey).getTime() - new Date(key).getTime()) / MS_PER_DAY);
    const current = !future && count > 0 && daysAgo >= 0 && daysAgo < dayStreak;
    days.push({ date: key, level, future, current });
  }

  return {
    lessonsWatched,
    dayStreak,
    longestStreak,
    lastActiveLabel: relativeLabel(lastActivity, now),
    days,
  };
}
