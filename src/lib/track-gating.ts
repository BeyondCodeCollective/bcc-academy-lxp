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
