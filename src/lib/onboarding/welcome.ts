import { scheduledSessions, nextSession, type BandTrack } from "@/lib/home-band";
import { COHORT_TIME_ZONE, formatCohortDate } from "@/lib/utils";

export type WelcomeSummary = {
  course: string;
  /** Other enrolled courses beyond the one named. */
  alsoEnrolled: number;
  instructor: string | null;
  /** Whole sentence about timing, e.g. "Your first session is Wednesday, October 14 at 2:00 PM ET." */
  whenLine: string | null;
};

type WelcomeTrack = BandTrack & {
  instructor?: string;
  startDate: string;
  startDateTbd?: boolean;
};

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: COHORT_TIME_ZONE,
  });

/**
 * What a brand-new learner needs to hear before being asked anything: which
 * course they're in and when it happens. Prefers the soonest scheduled session
 * across their courses; falls back to a course start date; says so plainly when
 * the dates aren't set. Pure so it can be tested against a fixed clock.
 */
export function buildWelcome(tracks: WelcomeTrack[], now: Date): WelcomeSummary | null {
  if (tracks.length === 0) return null;

  const sessions = scheduledSessions(tracks);
  const next = nextSession(sessions, now);
  const primary = next
    ? tracks.find((t) => t.slug === next.session.trackSlug) ?? tracks[0]
    : tracks[0];
  const base = {
    course: primary.name,
    alsoEnrolled: tracks.length - 1,
    instructor: primary.instructor?.trim() || null,
  };

  if (next) {
    const { session, live } = next;
    if (live) return { ...base, whenLine: "Your session is happening right now." };
    const firstEver = sessions
      .filter((s) => s.trackSlug === session.trackSlug)
      .every((s) => Date.parse(s.startsAt) > now.getTime());
    const which = firstEver ? "first" : "next";
    return {
      ...base,
      whenLine: `Your ${which} session is ${dayLabel(session.startsAt)} at ${session.timeLabel}.`,
    };
  }

  if (primary.startDateTbd) {
    return { ...base, whenLine: "Dates are still being set. We'll let you know as soon as they are." };
  }
  const start = Date.parse(`${primary.startDate.slice(0, 10)}T12:00:00`);
  if (start > now.getTime()) {
    return {
      ...base,
      whenLine: `Your course starts ${formatCohortDate(primary.startDate, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }, "en-US")}.`,
    };
  }
  return { ...base, whenLine: null };
}
