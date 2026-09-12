import { CalendarPlus } from "@phosphor-icons/react/dist/ssr";
import type { TrackConfig } from "@/lib/programs/types";
import { buildGoogleCalendarUrl } from "@/lib/gcal";
import { buttonClass } from "@/components/ui";

/**
 * Sits above a course that hasn't started yet, instead of replacing it.
 *
 * It carries the reassurance the old full-page countdown existed for — a seat
 * is saved, and a way to put the start on your calendar — while the syllabus,
 * instructor and schedule stay visible underneath. The start date itself lives
 * in the Schedule section below, highlighted as the first entry, so it isn't
 * repeated here. Sessions are still locked; their cards say when each one
 * opens, so "why can't I click this" answers itself rather than bouncing the
 * learner somewhere.
 *
 * Not rendered for a TBD start date: there is nothing to promise, so those
 * tracks keep the holding page.
 */
export function PreStartBanner({ track }: { track: TrackConfig }) {
  if (track.startDateTbd || !track.startDate) return null;

  // See holding-view: the event must link back to the classroom.
  const courseUrl = `https://bccacademy.io/dashboard/track/${track.slug}`;
  const calendarUrl = buildGoogleCalendarUrl({
    title: track.name,
    date: track.startDate,
    details: `Your spot for ${track.name}. Join class here: ${courseUrl}\n\nSign in with the same email this account uses and your session will be waiting.`,
    location: courseUrl,
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
        <p className="text-[14.5px] font-semibold leading-snug text-ink">
          Your seat is saved
        </p>
        <p className="mt-0.5 text-xs text-ink-faint">
          Sessions open when the course begins — see Schedule below for the date.
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
