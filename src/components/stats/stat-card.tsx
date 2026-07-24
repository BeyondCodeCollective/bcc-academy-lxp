// Hero-number stat. The atom of the BCC stats language: a big value, a small
// uppercase label, optional supporting line and trend chip. Compose several in
// a grid for a dashboard row. Presentational; styled on the editorial tokens.

import type { ReactNode } from "react";
import { InfoDot } from "./info-dot";

export type StatTrend = {
  dir: "up" | "down";
  /** e.g. "30% this month". */
  text: string;
  /** Whether the direction is good news. Controls the chip tone. */
  good?: boolean;
  /** Prior-period value, shown as a faint "vs 286" beside the delta. */
  vs?: ReactNode;
};

// Semantic delta tones, matching the risk literals used across the analytics
// surfaces (#10B981 emerald / #F59E0B amber). Good news is green, bad is amber.
const TREND_TONE = {
  good: "bg-[#10B981]/12 text-[#0f7a54]",
  bad: "bg-[#F59E0B]/14 text-[#a8620a]",
};

export function StatCard({
  value,
  label,
  hint,
  trend,
  info,
  children,
}: {
  value: ReactNode;
  label: string;
  /** Supporting line under the label (e.g. "Longest 23"). */
  hint?: ReactNode;
  trend?: StatTrend;
  /** One-line definition revealed by an "(i)" beside the label. */
  info?: string;
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
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${
              trend.good ? TREND_TONE.good : TREND_TONE.bad
            }`}
          >
            {trend.dir === "up" ? "↗" : "↘"} {trend.text}
            {trend.vs != null && (
              <span className="font-medium text-ink-faint">vs {trend.vs}</span>
            )}
          </span>
        )}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
        {info && <InfoDot text={info} />}
      </p>
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
