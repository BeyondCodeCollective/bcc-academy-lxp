"use client";

// Shared analytics vocabulary. Every analytics sub-tab (Attendance, Survey
// insights, Engagement, Progress) composes these so the four read as one system
// instead of four screens built at different times: one section-heading style,
// one range/period bar, one filter-control style.

import type { ReactNode } from "react";
import { RANGE_LABELS, type RangePreset } from "@/lib/analytics/period";

/** Uppercase section heading used above every stat group, chart, and table. */
export function SectionLabel({
  children,
  hint,
}: {
  children: ReactNode;
  /** Right-aligned muted note (e.g. a date range, a count, "vs previous"). */
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
        {children}
      </h3>
      {hint != null && <span className="text-xs text-ink-faint">{hint}</span>}
    </div>
  );
}

/** Preset time-range switcher + resolved-period caption. Used wherever a view
 *  is time-scoped (Engagement, Attendance). Current-state views (Progress)
 *  don't take one — a range implies a delta we can't honestly compute. */
export function RangeBar({
  preset,
  onPreset,
  periodLabel,
}: {
  preset: RangePreset;
  onPreset: (p: RangePreset) => void;
  /** e.g. "Apr 26 – Jul 25, 2026 · vs previous period". */
  periodLabel?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-rule bg-white p-0.5">
        {(Object.keys(RANGE_LABELS) as RangePreset[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPreset(p)}
            aria-pressed={preset === p}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              preset === p ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            {RANGE_LABELS[p]}
          </button>
        ))}
      </div>
      {periodLabel != null && (
        <span className="text-xs text-ink-faint">{periodLabel}</span>
      )}
    </div>
  );
}

/** Consistent styling for the categorical filter dropdowns (cohort, track). */
export const ANALYTICS_SELECT_CLASS =
  "rounded-lg border border-rule bg-white px-2.5 py-1.5 text-sm text-ink focus:border-ink-faint focus:outline-none";
