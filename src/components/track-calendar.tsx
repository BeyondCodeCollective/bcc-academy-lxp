"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, LockSimple } from "@phosphor-icons/react/dist/ssr";

// A month-grid calendar for a track: sessions (dated from the syllabus) plus
// any MASS / guest-speaker / event / office-hours items. Chips link straight
// to their session; the focus session's cell is the page's one dark field.
export type CalendarEvent = {
  /** ISO date, YYYY-MM-DD */
  date: string;
  type: "session" | "mass" | "speaker" | "event" | "office-hours";
  title: string;
  /** Sessions link to their week page. */
  href?: string;
  time?: string;
};

/** The one session the page is about — rendered as the field, at cell size.
 *  Live/today/next once the course runs; the first session, locked, before. */
export type CalendarFocus = {
  /** ISO date, YYYY-MM-DD */
  date: string;
  /** "Live now" | "Today" | "Up next" | "Starts" */
  kicker: string;
  title: string;
  time?: string | null;
  /** Session page. Absent = locked (pre-start). */
  href?: string;
  /** "Join now" | "Join session" */
  cta: string;
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Chip + legend styling per type. Session = neutral, MASS = cobalt,
// speaker = purple, event/office-hours = dashed outline ("other").
const CHIP: Record<CalendarEvent["type"], string> = {
  // Program accent, not neutral grey — a session chip has to read as "there's
  // something on this date" from across the room.
  session: "bg-primary/12 font-semibold text-primary",
  mass: "bg-cobalt/12 text-cobalt",
  speaker: "bg-[#7C3AED]/14 text-[#7C3AED]",
  event: "border border-dashed border-ink-faint text-ink-soft",
  "office-hours": "border border-dashed border-ink-faint text-ink-soft",
};
// Filled = your own sessions; a ring = things around them. `mass` was solid
// cobalt, which in this theme is the same blue as `primary` — two identical
// squares in the legend, labeled differently.
const DOT: Record<CalendarEvent["type"], string> = {
  session: "bg-primary",
  mass: "border-[1.5px] border-cobalt",
  speaker: "bg-[#7C3AED]",
  event: "border border-ink-faint",
  "office-hours": "border border-ink-faint",
};

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function TrackCalendar({
  events,
  todayISO,
  focus,
}: {
  events: CalendarEvent[];
  /** Today as YYYY-MM-DD, passed from the server so SSR + client agree. */
  todayISO: string;
  /** THIS course's live/next (or first, pre-start) session. Its cell becomes
   *  the field — the page's one dark object — carrying the Join button. The
   *  calendar carries the whole program's schedule, so without it the accent
   *  would land on whichever course happened to meet soonest. */
  focus?: CalendarFocus | null;
}) {
  const focusDate = focus?.date ?? null;
  // Contiguous list of months from the first event to the last, so empty
  // months in between are still reachable with the arrows.
  const months = useMemo(() => {
    if (events.length === 0) return [] as { y: number; m: number }[];
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    const [y0, m0] = sorted[0].date.split("-").map(Number);
    const [y1, m1] = sorted[sorted.length - 1].date.split("-").map(Number);
    const out: { y: number; m: number }[] = [];
    let y = y0;
    let m = m0 - 1;
    while (y < y1 || (y === y1 && m <= m1 - 1)) {
      out.push({ y, m });
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    return out;
  }, [events]);

  const byDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) (map[e.date] ||= []).push(e);
    return map;
  }, [events]);

  const startIdx = useMemo(() => {
    // The focused session's month when there is one — landing on the current
    // month with the selected day three months away is its own confusion.
    const cur = (focusDate ?? todayISO).slice(0, 7);
    const i = months.findIndex((mo) => `${mo.y}-${String(mo.m + 1).padStart(2, "0")}` === cur);
    return i >= 0 ? i : 0;
  }, [months, todayISO, focusDate]);

  const [monthIdx, setMonthIdx] = useState(startIdx);

  if (months.length === 0) return null;
  const cur = months[Math.min(monthIdx, months.length - 1)];

  const firstDow = new Date(`${ymd(cur.y, cur.m, 1)}T12:00:00`).getDay();
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-ink">
          {MONTHS[cur.m]} {cur.y}
        </h3>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Previous month"
            disabled={monthIdx === 0}
            onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-rule bg-paper-tint text-ink transition-colors hover:border-cobalt disabled:opacity-35 disabled:hover:border-rule"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={monthIdx >= months.length - 1}
            onClick={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-rule bg-paper-tint text-ink transition-colors hover:border-cobalt disabled:opacity-35 disabled:hover:border-rule"
          >
            ›
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-hidden rounded-lg border border-rule">
        <div className="grid grid-cols-7 bg-rule gap-px">
          {DOW.map((d) => (
            <div key={d} className="bg-paper-tint py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} className="min-h-[64px] bg-paper-tint/40 sm:min-h-[92px]" />;
            const date = ymd(cur.y, cur.m, day);
            const dayEvents = byDate[date] ?? [];
            const isToday = date === todayISO;
            const isPast = date < todayISO;

            // The field, at cell size. One per page; nothing else on the
            // course home is dark. Locked before day one — the date is
            // visible and filled, it just can't be opened yet.
            if (focus && date === focus.date) {
              const inner = (
                <>
                  <span className="text-xs font-bold tabular-nums text-white">{day}</span>
                  <span className="hidden text-[11px] font-bold uppercase tracking-[0.1em] text-white/60 sm:block">
                    {focus.kicker}
                  </span>
                  <span className="hidden text-[12px] font-semibold leading-snug text-white sm:block">
                    {focus.title}
                  </span>
                  {focus.time && (
                    <span className="hidden text-[11px] text-white/70 sm:block">{focus.time}</span>
                  )}
                  <span className="mt-auto hidden sm:block">
                    {focus.href ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-paper px-2.5 py-1.5 text-[11px] font-bold text-ink">
                        {focus.cta}
                        <ArrowRight size={11} weight="bold" aria-hidden />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                        <LockSimple size={11} weight="bold" aria-hidden />
                        Opens on the day
                      </span>
                    )}
                  </span>
                  {/* Phones: a bright dot so the filled cell still reads. */}
                  <span className="mt-auto h-1.5 w-1.5 rounded-full bg-highlight sm:hidden" />
                </>
              );
              const cls =
                "stage-surface stage-grid relative isolate flex min-h-[64px] flex-col gap-1 overflow-hidden p-1.5 text-left sm:min-h-[92px]";
              return focus.href ? (
                <Link key={date} href={focus.href} className={`${cls} transition-opacity hover:opacity-95`}>
                  <span className="relative flex flex-1 flex-col gap-1">{inner}</span>
                </Link>
              ) : (
                <div key={date} className={cls} aria-label={`${focus.title} — opens on the day`}>
                  <span className="relative flex flex-1 flex-col gap-1">{inner}</span>
                </div>
              );
            }

            return (
              <div
                key={date}
                className="flex min-h-[64px] flex-col gap-1 bg-surface-elevated p-1.5 text-left sm:min-h-[92px]"
              >
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    isToday
                      ? "inline-flex h-5 w-5 items-center justify-center rounded-md bg-electric-green text-ink"
                      : isPast
                        ? "text-ink-faint"
                        : "text-ink-soft"
                  }`}
                >
                  {day}
                </span>
                {/* Chips on >=sm, dots on mobile. A chip with a page is a link
                    straight to it — no intermediate "selected day" step. */}
                <div className="hidden flex-col gap-1 sm:flex">
                  {dayEvents.slice(0, 2).map((e, j) => {
                    const chip = `block truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${CHIP[e.type]} ${
                      isPast ? "opacity-60" : ""
                    }`;
                    return e.href ? (
                      <Link key={j} href={e.href} className={`${chip} hover:underline`} title={e.title}>
                        {e.title}
                      </Link>
                    ) : (
                      <span key={j} className={chip} title={e.title}>
                        {e.title}
                      </span>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <span className="px-1 text-[10px] font-semibold text-ink-faint">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
                {dayEvents.length > 0 && (
                  <div className="mt-auto flex gap-0.5 sm:hidden">
                    {dayEvents.slice(0, 4).map((e, j) => (
                      <span key={j} className={`h-1.5 w-1.5 rounded-full ${DOT[e.type]}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend — under the grid, where a key belongs. Above it, it was the
          first thing on the page after the "Schedule" heading, explaining
          colors the reader had not seen yet. Only the event types this
          program actually has; a single type needs no key at all (a GOSA
          learner shouldn't see "MASS"). */}
      {(() => {
        const present = new Set(
          events.map((e) => (e.type === "office-hours" ? "event" : e.type)),
        );
        const entries = ([
          ["session", "Session"],
          ["mass", "MASS"],
          ["speaker", "Guest speaker"],
          ["event", "Other event"],
        ] as const).filter(([type]) => present.has(type));
        if (entries.length < 2) return null;
        return (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft">
            {entries.map(([type, label]) => (
              <span key={type} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-[3px] ${DOT[type]}`} />
                {label}
              </span>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
