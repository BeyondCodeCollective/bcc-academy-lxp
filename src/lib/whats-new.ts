import { createServiceClient } from "@/lib/supabase/server";
import type { TrackConfig } from "@/lib/programs/types";

/**
 * "What's New" feed — one consolidated stream that replaces the loose
 * announcement banners on the dashboard home and course overview. It pulls
 * three sources into a single, newest-first list:
 *   - upcoming office hours (pinned on top as "coming up")
 *   - new announcements (track-scoped or program-wide)
 *   - instructor feedback on the student's own work
 *
 * Returns [] when there's nothing — callers render nothing rather than an
 * empty box.
 */

export type FeedItem = {
  key: string;
  kind: "office-hour" | "announcement" | "feedback";
  title: string;
  body?: string;
  href: string;
  external?: boolean;
  whenLabel: string;
  /** ISO datetime used only for sorting (desc). */
  sortAt: string;
  /** Course name — shown when the feed spans multiple courses (home). */
  trackName?: string;
};

function relativeTime(iso: string, now: Date): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dateLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export async function getWhatsNew(opts: {
  userId: string;
  programId: string;
  /** Resolved tracks in scope — one (overview) or all enrolled (home). */
  tracks: TrackConfig[];
  /** Show the course name on each item (multi-course home). */
  includeTrackName?: boolean;
  now: Date;
  limit?: number;
}): Promise<FeedItem[]> {
  const { userId, programId, tracks, includeTrackName, now } = opts;
  const limit = opts.limit ?? 6;
  if (tracks.length === 0) return [];

  const svc = createServiceClient();
  const slugs = tracks.map((t) => t.slug);
  const nameBySlug = new Map(tracks.map((t) => [t.slug, t.name] as const));
  const tn = (slug: string) => (includeTrackName ? nameBySlug.get(slug) : undefined);
  const items: FeedItem[] = [];

  // ── Upcoming office hours (from track config; pinned via future sortAt) ──
  const today = now.toISOString().slice(0, 10);
  for (const track of tracks) {
    const next = (track.officeHours ?? [])
      .filter((oh) => oh.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (next) {
      items.push({
        key: `oh-${track.slug}-${next.date}`,
        kind: "office-hour",
        title: next.title,
        body: `${dateLabel(next.date)} · ${next.time}`,
        href: next.joinUrl ?? `/dashboard/track/${track.slug}`,
        external: !!next.joinUrl,
        whenLabel: "Coming up",
        sortAt: `${next.date}T00:00:00.000Z`,
        trackName: tn(track.slug),
      });
    }
  }

  // ── Announcements (track-scoped or program-wide, not expired) ──
  const { data: anns } = await svc
    .from("announcements")
    .select("id, message, track_slug, created_at")
    .eq("program_id", programId)
    .gt("expires_at", now.toISOString())
    .or(`track_slug.in.(${slugs.join(",")}),track_slug.is.null`)
    .order("created_at", { ascending: false })
    .limit(limit);
  for (const a of anns ?? []) {
    const slug = a.track_slug as string | null;
    items.push({
      key: `ann-${a.id}`,
      kind: "announcement",
      title: "Announcement",
      body: a.message as string,
      href: slug ? `/dashboard/track/${slug}` : "/dashboard",
      whenLabel: relativeTime(a.created_at as string, now),
      sortAt: a.created_at as string,
      trackName: slug ? tn(slug) : undefined,
    });
  }

  // ── Instructor feedback on the student's own submissions/reflections ──
  const [{ data: subs }, { data: refls }] = await Promise.all([
    svc
      .from("submissions")
      .select("id, track_slug, week_number")
      .eq("student_id", userId)
      .in("track_slug", slugs),
    svc
      .from("reflections")
      .select("id, track_slug, week_number")
      .eq("student_id", userId)
      .in("track_slug", slugs),
  ]);
  const workById = new Map<string, { slug: string; week: number }>();
  for (const s of subs ?? [])
    workById.set(s.id as string, { slug: s.track_slug as string, week: s.week_number as number });
  for (const r of refls ?? [])
    workById.set(r.id as string, { slug: r.track_slug as string, week: r.week_number as number });

  const subIds = (subs ?? []).map((s) => s.id as string);
  const reflIds = (refls ?? []).map((r) => r.id as string);
  const fbQueries = [];
  if (subIds.length)
    fbQueries.push(
      svc
        .from("submission_feedback")
        .select("id, submission_id, reflection_id, created_at")
        .in("submission_id", subIds)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
  if (reflIds.length)
    fbQueries.push(
      svc
        .from("submission_feedback")
        .select("id, submission_id, reflection_id, created_at")
        .in("reflection_id", reflIds)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
  const fbResults = await Promise.all(fbQueries);
  // Collapse to the newest feedback per (track, week) so a flurry of comments
  // on one submission shows as a single "new feedback" line, not spam.
  const latestByWeek = new Map<string, { week: number; slug: string; createdAt: string }>();
  for (const res of fbResults) {
    for (const f of res.data ?? []) {
      const workId = (f.submission_id ?? f.reflection_id) as string | null;
      if (!workId) continue;
      const work = workById.get(workId);
      if (!work) continue;
      const k = `${work.slug}-${work.week}`;
      const createdAt = f.created_at as string;
      const existing = latestByWeek.get(k);
      if (!existing || createdAt > existing.createdAt)
        latestByWeek.set(k, { week: work.week, slug: work.slug, createdAt });
    }
  }
  // Real session titles so the item reads "New feedback on Prompt Engineering
  // Basics" rather than a generic "Week 3". One query over the (track, week)
  // pairs we're about to render; falls back to "your Week N work" when a
  // session has no title.
  const fbTitleByKey = new Map<string, string>();
  const fbPairs = [...latestByWeek.values()];
  if (fbPairs.length) {
    const { data: titleRows } = await svc
      .from("session_content")
      .select("track, week_number, title")
      .in("track", [...new Set(fbPairs.map((v) => v.slug))])
      .not("title", "is", null);
    for (const r of titleRows ?? []) {
      if (r.title) fbTitleByKey.set(`${r.track}-${r.week_number}`, r.title as string);
    }
  }

  for (const [k, v] of latestByWeek) {
    const sessionTitle = fbTitleByKey.get(`${v.slug}-${v.week}`);
    items.push({
      key: `fb-${k}`,
      kind: "feedback",
      title: sessionTitle
        ? `New feedback on ${sessionTitle}`
        : `New feedback on your Week ${v.week} work`,
      href: `/dashboard/track/${v.slug}/${v.week}`,
      whenLabel: relativeTime(v.createdAt, now),
      sortAt: v.createdAt,
      trackName: tn(v.slug),
    });
  }

  return items.sort((a, b) => b.sortAt.localeCompare(a.sortAt)).slice(0, limit);
}
