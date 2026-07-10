"use client";

import { useState } from "react";
import { CalendarBlank, CaretDown } from "@phosphor-icons/react";
import { TrackCalendar, type CalendarEvent } from "@/components/track-calendar";

/**
 * The month grid, behind a one-line summary.
 *
 * A full calendar is the right answer to "when is the break week?" and the
 * wrong answer to "what's next" — it was taking a screenful to say something
 * the summary says in a sentence. Opens on demand.
 */
export function CourseCalendarPanel({
  events,
  todayISO,
  summary,
}: {
  events: CalendarEvent[];
  todayISO: string;
  /** "16 sessions, Tuesdays & Thursdays · no class Aug 3–7" */
  summary: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section aria-label="Calendar" className="panel px-4 py-3 sm:px-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center gap-3 text-left"
      >
        <CalendarBlank size={16} className="shrink-0 text-ink-faint" aria-hidden />
        <span className="min-w-0 flex-1 text-[13px] text-ink-soft">{summary}</span>
        <span className="shrink-0 text-[12.5px] font-semibold text-primary">
          {open ? "Hide" : "View calendar"}
        </span>
        <CaretDown
          size={13}
          aria-hidden
          className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="pt-3 pb-1">
          <TrackCalendar events={events} todayISO={todayISO} />
        </div>
      )}
    </section>
  );
}
