"use client";

import { useState } from "react";
import { CourseAgenda, type AgendaRow } from "@/components/course-agenda";
import { TrackCalendar, type CalendarEvent } from "@/components/track-calendar";

/**
 * The one schedule, in the viewer's choice of shape: a month Calendar (see the
 * whole term and the break week at a glance) or a List (every session's topic,
 * always visible). Same dates either way — the toggle just picks how to read
 * them, so nothing is duplicated.
 */
export function ScheduleTabs({
  rows,
  events,
  todayISO,
  focusDate,
}: {
  rows: AgendaRow[];
  events: CalendarEvent[];
  todayISO: string;
  focusDate?: string | null;
}) {
  const [view, setView] = useState<"calendar" | "list">("calendar");

  return (
    <section aria-label="Schedule">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[15px] font-semibold text-ink">Schedule</h2>
        <div className="inline-flex rounded-full bg-paper-tint-soft p-0.5">
          {(["calendar", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`min-h-[30px] rounded-full px-3.5 text-[12px] font-semibold transition-colors ${
                view === v
                  ? "bg-surface-elevated text-ink shadow-sm"
                  : "text-ink-faint hover:text-ink-soft"
              }`}
            >
              {v === "calendar" ? "Calendar" : "List"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        {view === "calendar" ? (
          <TrackCalendar events={events} todayISO={todayISO} />
        ) : (
          <CourseAgenda rows={rows} todayISO={todayISO} focusDate={focusDate} />
        )}
      </div>
    </section>
  );
}
