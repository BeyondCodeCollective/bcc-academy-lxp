import { CalendarPlus } from "@phosphor-icons/react/dist/ssr";
import type { TrackConfig } from "@/lib/programs/types";
import { buildGoogleCalendarUrl } from "@/lib/gcal";
import { COHORT_TIME_ZONE, formatCohortDate } from "@/lib/utils";
import { buttonClass } from "@/components/ui";

/**
 * Sits above a course that hasn't started yet, instead of replacing it.
 *
 * It carries the two things the old full-page countdown existed for — when the
 * cohort begins, and a way to put that on your calendar — while the syllabus,
 * instructor and schedule stay visible underneath. Sessions are still locked;
 * their cards say when each one opens, so "why can't I click this" answers
 * itself rather than bouncing the learner somewhere.
 *
 * Not rendered for a TBD start date: there is nothing to promise, so those
 * tracks keep the holding page.
 */
export function PreStartBanner({ track }: { track: TrackConfig }) {
  if (track.startDateTbd || !track.startDate) return null;

  const dateLabel = formatCohortDate(
    track.startDate,
    { weekday: "long", month: "long", day: "numeric" },
    "en-US",
  );
  // Show the cohort's timezone, not the viewer's — nobody should have to convert.
  const timeLabel = track.kickoffTimeUtc
    ? new Date(track.kickoffTimeUtc).toLocaleTimeString("en-US", {
        timeZone: COHORT_TIME_ZONE,
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : null;

  const calendarUrl = buildGoogleCalendarUrl({
    title: track.name,
    date: track.startDate,
    details: `Your spot for ${track.name}. We'll see you there!`,
    ...(track.kickoffTimeUtc
      ? {
          startUtc: track.kickoffTimeUtc,
          endUtc: new Date(Date.parse(track.kickoffTimeUtc) + 3_600_000).toISOString(),
        }
      : {}),
  });

  return (
    <section
      aria-label="Course start"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 border border-rule border-l-[3px] border-l-primary bg-surface-elevated px-4 py-3.5 rounded-xl"
    >
      <div className="min-w-[190px] flex-1">
        <p className="text-[14.5px] font-semibold leading-snug text-ink tabular-nums">
          Starts {dateLabel}
          {timeLabel ? ` · ${timeLabel}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-ink-faint">
          Sessions open when the course begins. Your seat is saved.
        </p>
      </div>
      <a
        href={calendarUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${buttonClass("primary", "sm")} shrink-0`}
      >
        <CalendarPlus size={15} weight="bold" aria-hidden />
        Add to calendar
      </a>
    </section>
  );
}
