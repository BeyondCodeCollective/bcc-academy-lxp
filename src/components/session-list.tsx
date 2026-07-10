"use client";

import { useState } from "react";
import Link from "next/link";

export type SessionRow = {
  week: number;
  /** "Session 3", or an extra's name like "Kickoff". */
  label: string;
  title: string;
  /** "Tue Jul 14" — empty when the track has no dated units. */
  dateLabel: string;
  /** Null when the unit is locked. */
  href: string | null;
  isCurrent: boolean;
  isPast: boolean;
  /** "Opens Tue, Jul 14" / "Coming soon" / "Locked". */
  lockedLabel: string | null;
};

/**
 * The syllabus, as a list you can read in one pass.
 *
 * This replaced a horizontal card carousel that duplicated the sidebar — which
 * already lists every session, numbered and linked — and that showed four of
 * seventeen units at a time. A list gives dates, names and what's next without
 * scrolling sideways, and degrades to the same shape on a 3-day camp.
 */
export function SessionList({
  rows,
  unitLabelPlural,
  initialCount = 4,
}: {
  rows: SessionRow[];
  /** "sessions", "weeks", "days" — for the expand control. */
  unitLabelPlural: string;
  initialCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  // Open on the current unit rather than the top, so a learner mid-course sees
  // where they are without expanding.
  const currentIndex = rows.findIndex((r) => r.isCurrent);
  const collapsedRows =
    currentIndex > initialCount - 1
      ? rows.slice(currentIndex - 1, currentIndex - 1 + initialCount)
      : rows.slice(0, initialCount);
  const shown = expanded ? rows : collapsedRows;
  const hidden = rows.length - shown.length;

  return (
    <section aria-label="Sessions" className="panel px-4 sm:px-5">
      <ol className="divide-y divide-rule">
        {shown.map((r) => {
          const inner = (
            <>
              <span className="w-[74px] shrink-0 font-mono text-[11.5px] tabular-nums text-ink-faint">
                {r.dateLabel}
              </span>
              <span
                className={`w-[66px] shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.11em] ${
                  r.isCurrent ? "text-primary" : "text-ink-faint"
                }`}
              >
                {r.label}
              </span>
              <span
                className={`min-w-0 truncate text-[13.3px] ${
                  r.isCurrent ? "font-semibold text-ink" : r.isPast ? "text-ink-faint" : "text-ink"
                }`}
              >
                {r.title}
              </span>
              {r.lockedLabel && (
                <span className="ml-auto shrink-0 text-[10.5px] text-ink-faint">
                  {r.lockedLabel}
                </span>
              )}
            </>
          );
          return (
            <li key={r.week}>
              {r.href ? (
                <Link
                  href={r.href}
                  className="flex min-h-[44px] items-center gap-3 py-2.5 transition-colors hover:bg-paper-tint-soft"
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex min-h-[44px] items-center gap-3 py-2.5">{inner}</div>
              )}
            </li>
          );
        })}
      </ol>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="min-h-[44px] w-full text-left text-[12.6px] font-semibold text-primary"
        >
          All {rows.length} {unitLabelPlural} →
        </button>
      )}
      {expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="min-h-[44px] w-full text-left text-[12.6px] font-semibold text-ink-faint"
        >
          Show less
        </button>
      )}
    </section>
  );
}
