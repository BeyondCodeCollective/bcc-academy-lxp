"use client";

import { useMemo, useState } from "react";

// A month-grid calendar for a track: sessions (dated from the syllabus) plus
// any MASS / guest-speaker / event / office-hours items. Click a day to see
// what's on it. Type drives the chip color; the title is the label.
export type CalendarEvent = {
  /** ISO date, YYYY-MM-DD */
  date: string;
  type: "session" | "mass" | "speaker" | "event" | "office-hours";
  title: string;
  /** Sessions link to their week page. */
  href?: string;
  time?: string;
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Chip + legend styling per type. Session = neutral, MASS = cobalt,
// speaker = purple, event/office-hours = dashed outline ("other").
const CHIP: Record<CalendarEvent["type"], string> = {
  session: "bg-paper-tint text-ink-soft",
  mass: "bg-cobalt/12 text-cobalt",
  speaker: "bg-[#7C3AED]/14 text-[#7C3AED]",
  event: "border border-dashed border-ink-faint text-ink-soft",
  "office-hours": "border border-dashed border-ink-faint text-ink-soft",
};
const DOT: Record<CalendarEvent["type"], string> = {
  session: "bg-ink-faint",
  mass: "bg-cobalt",
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
}: {
  events: CalendarEvent[];
  /** Today as YYYY-MM-DD, passed from the server so SSR + client agree. */
  todayISO: string;
}) {
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
    const cur = todayISO.slice(0, 7);
    const i = months.findIndex((mo) => `${mo.y}-${String(mo.m + 1).padStart(2, "0")}` === cur);
    return i >= 0 ? i : 0;
  }, [months, todayISO]);

  const [monthIdx, setMonthIdx] = useState(startIdx);
  const [selected, setSelected] = useState<string | null>(null);

  if (months.length === 0) return null;
  const cur = months[Math.min(monthIdx, months.length - 1)];

  const firstDow = new Date(`${ymd(cur.y, cur.m, 1)}T12:00:00`).getDay();
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedEvents = selected ? byDate[selected] ?? [] : [];
  const selectedLabel = selected
    ? new Date(`${selected}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
      })
    : null;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft">
        {([
          ["session", "Session"],
          ["mass", "MASS"],
          ["speaker", "Guest speaker"],
          ["event", "Other event"],
        ] as const).map(([type, label]) => (
          <span key={type} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-[3px] ${DOT[type]}`} />
            {label}
          </span>
        ))}
      </div>

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
            onClick={() => { setMonthIdx((i) => Math.max(0, i - 1)); setSelected(null); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-rule bg-paper-tint text-ink transition-colors hover:border-cobalt disabled:opacity-35 disabled:hover:border-rule"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={monthIdx >= months.length - 1}
            onClick={() => { setMonthIdx((i) => Math.min(months.length - 1, i + 1)); setSelected(null); }}
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
            const isSelected = date === selected;
            const shown = dayEvents.slice(0, 2);
            const extra = dayEvents.length - shown.length;
            return (
              <button
                type="button"
                key={date}
                onClick={() => setSelected(date)}
                className={`flex min-h-[64px] flex-col gap-1 bg-surface-elevated p-1.5 text-left transition-colors hover:bg-paper-tint sm:min-h-[92px] ${
                  isSelected ? "outline outline-2 -outline-offset-2 outline-cobalt" : ""
                }`}
              >
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    isToday
                      ? "inline-flex h-5 w-5 items-center justify-center rounded-md bg-electric-green text-ink"
                      : "text-ink-soft"
                  }`}
                >
                  {day}
                </span>
                {/* Chips on >=sm, dots on mobile */}
                <div className="hidden flex-col gap-1 sm:flex">
                  {shown.map((e, j) => (
                    <span
                      key={j}
                      className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${CHIP[e.type]}`}
                    >
                      {e.title}
                    </span>
                  ))}
                  {extra > 0 && (
                    <span className="px-1 text-[10px] font-semibold text-ink-faint">+{extra} more</span>
                  )}
                </div>
                {dayEvents.length > 0 && (
                  <div className="mt-auto flex gap-0.5 sm:hidden">
                    {dayEvents.slice(0, 4).map((e, j) => (
                      <span key={j} className={`h-1.5 w-1.5 rounded-full ${DOT[e.type]}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected-day panel */}
      <div className="rounded-lg border border-rule bg-paper-tint p-4">
        <h4 className="text-sm font-semibold text-ink">{selectedLabel ?? "Select a day"}</h4>
        {!selected ? (
          <p className="mt-1 text-sm text-ink-faint">Click any date above to see what’s on.</p>
        ) : selectedEvents.length === 0 ? (
          <p className="mt-1 text-sm text-ink-faint">Nothing scheduled this day.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {selectedEvents.map((e, i) => {
              const inner = (
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${DOT[e.type]}`} />
                  <span className="text-sm font-medium text-ink">{e.title}</span>
                  {e.time && <span className="text-xs text-ink-soft">{e.time}</span>}
                </span>
              );
              return (
                <li key={i}>
                  {e.href ? (
                    <a href={e.href} className="hover:underline">{inner}</a>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
