import { zonedTimeToUtc } from "@/lib/ical";
import {
  COHORT_TIME_ZONE,
  easternDayKey,
  formatCohortDate,
  formatCohortTime,
} from "@/lib/utils";
import { trackUnitDisplay, unitText } from "@/lib/programs/unit-display";
import type { TrackConfig } from "@/lib/programs/types";

/**
 * The single "what do I do next" the course panel answers, computed fresh on
 * every render (the page is force-dynamic, so this re-evaluates each load).
 *
 * `live`     — a session is happening right now (join it).
 * `today`    — a session meets later today (join when it opens).
 * `upcoming` — the next future session (open it to prep / review).
 *
 * Candidates span the course AND anything wrapped around it (MASS meets on a
 * day the course doesn't), so a Wednesday coaching session can't go invisible
 * just because the technical track has nothing that day.
 */
export type TouchpointKind = "live" | "today" | "upcoming";

export type Touchpoint = {
  kind: TouchpointKind;
  href: string;
  /** "Session 3" | "Kickoff" | "MASS coaching" */
  unitLabel: string;
  title: string;
  isMass: boolean;
  /** the session's ET calendar day (YYYY-MM-DD) — highlights the agenda row */
  date: string;
  /** "6:30 PM ET", or null when the session carries no time */
  timeLabel: string | null;
  /** subtitle: "Happening now" / "Today · Tuesday, July 21" / "Thursday, July 23" */
  whenLabel: string;
};

type Candidate = {
  date: string;
  start: Date | null;
  end: Date | null;
  href: string;
  unitLabel: string;
  title: string;
  isMass: boolean;
  timeLabel: string | null;
};

function isMassSlug(slug: string): boolean {
  return slug === "mass" || slug.startsWith("mass-");
}

/** Flatten a track's dated sessions into touchpoint candidates. */
export function touchpointCandidates(
  track: TrackConfig,
  titleByWeek?: Map<number, string>,
): Candidate[] {
  const { display } = trackUnitDisplay(track);
  const unit = track.unitLabel || "Week";
  const mass = isMassSlug(track.slug);

  return track.weekSummaries
    .filter((ws) => ws.date)
    .map((ws): Candidate => {
      const date = ws.date!.slice(0, 10);
      const start = ws.time ? zonedTimeToUtc(date, ws.time, COHORT_TIME_ZONE) : null;
      const end = start
        ? new Date(start.getTime() + (ws.durationMinutes ?? 60) * 60_000)
        : null;
      return {
        date,
        start,
        end,
        href: `/dashboard/track/${track.slug}/${ws.week}`,
        unitLabel: mass ? "MASS coaching" : unitText(display, ws.week, unit),
        title: titleByWeek?.get(ws.week) ?? ws.topic,
        isMass: mass,
        timeLabel: ws.time ? formatCohortTime(ws.time) : null,
      };
    });
}

function toTouchpoint(kind: TouchpointKind, c: Candidate): Touchpoint {
  const dateLabel = formatCohortDate(
    c.date,
    { weekday: "long", month: "long", day: "numeric" },
    "en-US",
  );
  const whenLabel =
    kind === "live" ? "Happening now" : kind === "today" ? `Today · ${dateLabel}` : dateLabel;
  return {
    kind,
    href: c.href,
    unitLabel: c.unitLabel,
    title: c.title,
    isMass: c.isMass,
    date: c.date,
    timeLabel: c.timeLabel,
    whenLabel,
  };
}

/** Live > today > next-upcoming. Null once nothing remains (course is over). */
export function resolveTouchpoint(candidates: Candidate[], now: Date): Touchpoint | null {
  const byStart = (a: Candidate, b: Candidate) =>
    (a.start?.getTime() ?? Date.parse(`${a.date}T23:59:59Z`)) -
    (b.start?.getTime() ?? Date.parse(`${b.date}T23:59:59Z`));

  const live = candidates
    .filter((c) => c.start && c.end && c.start <= now && now < c.end)
    .sort(byStart)[0];
  if (live) return toTouchpoint("live", live);

  const todayKey = easternDayKey(now);
  const today = candidates
    .filter((c) => c.date === todayKey && (!c.start || now < c.start))
    .sort(byStart)[0];
  if (today) return toTouchpoint("today", today);

  const upcoming = candidates
    .filter((c) => (c.start ? c.start > now : c.date > todayKey))
    .sort(byStart)[0];
  if (upcoming) return toTouchpoint("upcoming", upcoming);

  return null;
}
