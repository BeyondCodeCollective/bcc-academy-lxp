import type { TrackConfig } from "@/lib/programs/types";

/**
 * How a unit is announced to students.
 *
 * Most units are numbered: "Session 3". A unit carrying an explicit `label` is
 * an EXTRA — a kickoff, an exam day, a make-up class. It shows its label
 * instead of a number, it does not consume a number, and it does not count
 * toward the track's unit total. So a 16-session course with a kickoff unit
 * still reads "16 sessions", and its teaching units still read 1…16, even
 * though internally they occupy week numbers 2…17.
 *
 * Keeping the internal numbers contiguous from 1 is deliberate: `0` already
 * means "not started" in resolveCurrentUnit, and `session_content.week_number`
 * is CHECK-constrained to >= 1.
 */
export type UnitDisplay = {
  /** What to render, e.g. "Session 3" or "Kickoff". */
  text: string;
  /** The student-facing number, or null for an extra. */
  number: number | null;
};

type SummaryLike = { week: number; label?: string };

/** Display info per internal week number. */
export function unitDisplayMap(
  weekSummaries: SummaryLike[],
  unitLabel = "Week",
): Map<number, UnitDisplay> {
  const out = new Map<number, UnitDisplay>();
  let n = 0;
  for (const ws of [...weekSummaries].sort((a, b) => a.week - b.week)) {
    if (ws.label) {
      out.set(ws.week, { text: ws.label, number: null });
    } else {
      n += 1;
      out.set(ws.week, { text: `${unitLabel} ${n}`, number: n });
    }
  }
  return out;
}

/**
 * How many numbered units the track has — what "Duration: N sessions" should
 * say. Falls back to `totalWeeks` for tracks that carry no summaries.
 */
export function numberedUnitCount(weekSummaries: SummaryLike[], totalWeeks: number): number {
  if (weekSummaries.length === 0) return totalWeeks;
  return weekSummaries.filter((ws) => !ws.label).length;
}

/** Convenience for a whole track. */
export function trackUnitDisplay(track: TrackConfig): {
  display: Map<number, UnitDisplay>;
  numbered: number;
} {
  const unitLabel = track.unitLabel ?? "Week";
  return {
    display: unitDisplayMap(track.weekSummaries, unitLabel),
    numbered: numberedUnitCount(track.weekSummaries, track.totalWeeks),
  };
}

/** Fallback-safe single lookup. */
export function unitText(
  display: Map<number, UnitDisplay>,
  week: number,
  unitLabel = "Week",
): string {
  return display.get(week)?.text ?? `${unitLabel} ${week}`;
}
