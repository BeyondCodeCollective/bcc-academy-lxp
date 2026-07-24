// Date-range presets + previous-period resolution for compare-to-previous.
//
// We can only honestly compare metrics that carry an event timestamp
// (attendance.checked_in_at, submissions/reflections.submitted_at,
// week_progress.video_watched_at). Current-state counts (total enrollments,
// completions) have no history stored, so they get NO delta — see period-trends.

export type RangePreset = "7d" | "30d" | "90d" | "ytd";

export type Period = { start: Date; end: Date };

export const RANGE_LABELS: Record<RangePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 3 months",
  ytd: "Year to date",
};

export function isRangePreset(v: string | undefined): v is RangePreset {
  return v === "7d" || v === "30d" || v === "90d" || v === "ytd";
}

const DAY = 86_400_000;

/**
 * Resolve a preset into a current window and the equal-length window that
 * immediately precedes it. `now` is injectable for testing.
 */
export function resolveRange(
  preset: RangePreset,
  now: Date = new Date(),
): { current: Period; previous: Period } {
  const end = now;
  let start: Date;
  if (preset === "ytd") {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    start = new Date(end.getTime() - days * DAY);
  }
  const spanMs = end.getTime() - start.getTime();
  const previous: Period = {
    start: new Date(start.getTime() - spanMs),
    end: start,
  };
  return { current: { start, end }, previous };
}

/** Human label for a resolved period, e.g. "Mar 30 – Jun 30, 2026". */
export function formatPeriod(p: Period): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(p.start)} – ${fmt(p.end)}, ${p.end.getFullYear()}`;
}

export type Delta = {
  value: number;
  prev: number;
  /** Percent change vs previous, rounded to one decimal. null when prev is 0. */
  pct: number | null;
  dir: "up" | "down";
};

export function delta(value: number, prev: number): Delta {
  const pct = prev > 0 ? Math.round(((value - prev) / prev) * 1000) / 10 : null;
  return { value, prev, pct, dir: value >= prev ? "up" : "down" };
}
