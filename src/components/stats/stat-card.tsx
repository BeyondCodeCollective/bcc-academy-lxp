// Hero-number stat. The atom of the BCC stats language: a big value, a small
// uppercase label, optional supporting line and trend chip. Compose several in
// a grid for a dashboard row. Presentational; styled on the editorial tokens.

import type { ReactNode } from "react";

export type StatTrend = {
  dir: "up" | "down";
  /** e.g. "30% this month". */
  text: string;
  /** Whether the direction is good news. Controls the chip tone. */
  good?: boolean;
};

export function StatCard({
  value,
  label,
  hint,
  trend,
  children,
}: {
  value: ReactNode;
  label: string;
  /** Supporting line under the label (e.g. "Longest 23"). */
  hint?: ReactNode;
  trend?: StatTrend;
  /** Optional extra content under the header (bars, split, etc.). */
  children?: ReactNode;
}) {
  return (
    <div className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-3xl font-semibold leading-none text-ink tabular-nums sm:text-4xl">
          {value}
        </p>
        {trend && (
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
              trend.good
                ? "bg-paper-tint-soft text-ink-soft"
                : "bg-paper-tint-soft text-ink-soft"
            }`}
          >
            {trend.dir === "up" ? "↗" : "↘"} {trend.text}
          </span>
        )}
      </div>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </p>
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
