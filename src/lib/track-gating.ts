import type { TrackConfig } from "@/lib/programs/types";

// ─── Sequential gating ─────────────────────────────────────────────────────────
//
// Opt-in, self-paced only. Cohort (weekly) tracks gate by date and are never
// touched here. A week counts as "complete" using the same bar the week page
// renders: video watched, plus homework submitted when that week has
// submissions enabled.

export function isSequentialGated(track: TrackConfig): boolean {
  return !!track.selfPaced && !!track.sequentialGating;
}

function weekSubmissionsEnabled(track: TrackConfig, weekNum: number): boolean {
  const wc = track.weeks.find((w) => w.week === weekNum);
  return track.submissionsEnabled !== false && wc?.submissionsEnabled !== false;
}

export function isWeekComplete(
  track: TrackConfig,
  weekNum: number,
  watched: Set<number>,
  submitted: Set<number>,
): boolean {
  const videoWatched = watched.has(weekNum);
  if (!weekSubmissionsEnabled(track, weekNum)) return videoWatched;
  return videoWatched && submitted.has(weekNum);
}

/**
 * Highest week the student may open. Week 1 is always unlocked; each later
 * week unlocks only once the one before it is complete. Stops at the first
 * incomplete week.
 */
export function highestUnlockedWeek(
  track: TrackConfig,
  watched: Set<number>,
  submitted: Set<number>,
): number {
  let through = 1;
  for (let w = 1; w < track.totalWeeks; w++) {
    if (isWeekComplete(track, w, watched, submitted)) through = w + 1;
    else break;
  }
  return through;
}

// ─── Up Next / To-Do items ──────────────────────────────────────────────────────

export type UpNextItem = {
  /** Stable React key */
  key: string;
  label: string;
  href: string;
  /** Opens in a new tab (office-hours join links) */
  external?: boolean;
  /** Secondary line: date/time or week topic */
  meta?: string;
  /** Course name — set when the feed spans multiple courses (home page) */
  trackName?: string;
};

/**
 * The week a student should act on next: for self-paced tracks, the first
 * incomplete week (0 if all done or not started); for cohort tracks, the
 * current calendar week.
 */
export function actionWeek(
  track: TrackConfig,
  started: boolean,
  currentWeek: number,
  watched: Set<number>,
  submitted: Set<number>,
): number {
  if (!started) return 0;
  if (track.selfPaced) {
    for (let w = 1; w <= track.totalWeeks; w++) {
      if (!isWeekComplete(track, w, watched, submitted)) return w;
    }
    return 0;
  }
  return currentWeek;
}

/**
 * Pending tasks for one track — watch / submit / reflect on the action week,
 * plus the next upcoming office hour. Returns [] when there's nothing to do,
 * so the caller renders nothing rather than an empty box.
 */
export function buildUpNextItems(
  track: TrackConfig,
  opts: {
    actionWeek: number;
    watched: Set<number>;
    submitted: Set<number>;
    reflected: Set<number>;
    now: Date;
    includeTrackName?: boolean;
  },
): UpNextItem[] {
  const items: UpNextItem[] = [];
  const tn = opts.includeTrackName ? track.name : undefined;
  const w = opts.actionWeek;

  if (w > 0) {
    const wc = track.weeks.find((x) => x.week === w);
    const href = `/dashboard/track/${track.slug}/${w}`;
    if (wc?.videoUrl && !opts.watched.has(w)) {
      items.push({
        key: `${track.slug}-watch-${w}`,
        label: `Watch the Week ${w} recording`,
        href,
        meta: wc.title,
        trackName: tn,
      });
    }
    if (weekSubmissionsEnabled(track, w) && !opts.submitted.has(w)) {
      items.push({
        key: `${track.slug}-submit-${w}`,
        label: `Submit Week ${w} homework`,
        href,
        trackName: tn,
      });
    }
    const reflPrompts = wc?.reflectionPrompts ?? track.defaultReflectionPrompts ?? [];
    if (track.reflectionsEnabled !== false && reflPrompts.length > 0 && !opts.reflected.has(w)) {
      items.push({
        key: `${track.slug}-reflect-${w}`,
        label: `Reflect on Week ${w}`,
        href,
        trackName: tn,
      });
    }
  }

  const today = opts.now.toISOString().slice(0, 10);
  const nextOh = (track.officeHours ?? [])
    .filter((oh) => oh.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (nextOh) {
    const display = new Date(`${nextOh.date}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    items.push({
      key: `${track.slug}-oh-${nextOh.date}`,
      label: `Office hours — ${nextOh.title}`,
      href: nextOh.joinUrl ?? `/dashboard/track/${track.slug}`,
      external: !!nextOh.joinUrl,
      meta: `${display} · ${nextOh.time}`,
      trackName: tn,
    });
  }

  return items;
}
