import { CalendarPlus } from "@phosphor-icons/react/dist/ssr";
import type { TrackConfig } from "@/lib/programs/types";
import { buildGoogleCalendarUrl } from "@/lib/gcal";
import { formatCohortDate } from "@/lib/utils";
import { buttonClass } from "@/components/ui";

/**
 * Course home header — one line of identity, no dark object.
 *
 * The page used to open on a field (CourseHero) that named the next session,
 * then a highlighted day panel that named it again, then a calendar cell that
 * named it a third time. The field now lives in exactly one place: the
 * next-session CELL of the month grid (TrackCalendar). Up here is only what
 * the calendar can't say — which course, who teaches it, where you are in it.
 *
 * Before day one the right-hand slot carries the seat-saved reassurance and
 * Add to calendar (formerly PreStartBanner). The start date itself is the
 * locked cell in the grid, so it isn't repeated as a sentence.
 */
export function CourseHeader({
  eyebrow,
  title,
  meta,
  preStart,
  track,
}: {
  eyebrow: string;
  title: string;
  meta: string;
  preStart: boolean;
  track: TrackConfig;
}) {
  const calendarUrl =
    preStart && track.startDate
      ? buildGoogleCalendarUrl({
          title: track.name,
          date: track.startDate,
          details: `Your spot for ${track.name}. Join class here: https://bccacademy.io/dashboard/track/${track.slug}\n\nSign in with the same email this account uses and your session will be waiting.`,
          location: `https://bccacademy.io/dashboard/track/${track.slug}`,
          ...(track.kickoffTimeUtc
            ? {
                startUtc: track.kickoffTimeUtc,
                endUtc: new Date(Date.parse(track.kickoffTimeUtc) + 3_600_000).toISOString(),
              }
            : {}),
        })
      : null;

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {preStart ? `${eyebrow} · your seat is saved` : eyebrow}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="text-[13.5px] text-ink-soft">{meta}</p>
      </div>

      {calendarUrl && (
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("primary", "md")}
          >
            <CalendarPlus size={16} weight="bold" aria-hidden />
            Add to calendar
          </a>
          <span className="text-xs text-ink-faint">
            Starts{" "}
            {formatCohortDate(
              track.startDate!.slice(0, 10),
              { weekday: "short", month: "short", day: "numeric" },
              "en-US",
            )}
          </span>
        </div>
      )}
    </header>
  );
}
