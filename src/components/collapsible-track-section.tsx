"use client";

import { useState } from "react";
import Link from "next/link";

type WeekSummary = { week: number; topic: string; icon: string };

type Props = {
  slug: string;
  name: string;
  instructor: string;
  totalWeeks: number;
  sessionsPerWeek: number;
  startDate: string;
  weekSummaries: WeekSummary[];
  started: boolean;
  currentWeek: number;
  defaultOpen?: boolean;
};

export function CollapsibleTrackSection({
  slug,
  name,
  instructor,
  totalWeeks,
  sessionsPerWeek,
  weekSummaries,
  started,
  currentWeek,
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `track-panel-${slug}`;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="group w-full text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-[15px] font-semibold text-ink leading-snug truncate">
              {name}
            </h2>
            {started && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1D59FF] px-2 py-0.5 text-[10px] font-semibold text-white shrink-0">
                <span className="h-1 w-1 rounded-full bg-white/80 animate-pulse" />
                In progress
              </span>
            )}
          </div>

          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className={`shrink-0 text-ink-faint transition-transform duration-200 group-hover:text-ink-soft ${open ? "rotate-180" : ""}`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <p className="mt-0.5 text-[12px] text-ink-faint">
          {totalWeeks}-week {sessionsPerWeek > 1 ? "course" : "coaching"} · {instructor}
        </p>
      </button>

      {/* Animated panel */}
      <div
        id={panelId}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {weekSummaries.map(({ week, topic, icon }) => {
              const isCompleted = started && week < currentWeek;
              const isCurrent = started && week === currentWeek;
              const isFuture = !started || week > currentWeek;

              return (
                <Link
                  key={week}
                  href={`/dashboard/track/${slug}/${week}`}
                  className={`flex flex-col items-center border p-3 text-center transition-all ${
                    isCurrent
                      ? "border-ink bg-white shadow-sm"
                      : isCompleted
                        ? "border-transparent bg-paper-tint hover:bg-paper-tint/60"
                        : "border-rule-soft bg-neutral-50 hover:border-ink-faint"
                  }`}
                >
                  <span className={`text-xl leading-none ${isFuture ? "opacity-25" : ""}`}>
                    {icon}
                  </span>

                  <p className={`mt-2 text-[11px] font-medium leading-tight ${
                    isCurrent ? "text-ink" : isFuture ? "text-ink-faint" : "text-ink-soft"
                  }`}>
                    {topic}
                  </p>

                  <p className={`mt-0.5 text-[10px] tabular-nums ${
                    isFuture ? "text-ink-faint" : isCompleted ? "text-ink-faint" : "text-ink-soft"
                  }`}>
                    {isCompleted ? "✓" : `${week}`}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
