// Hero-number stat. The atom of the BCC stats language: a big value, a small
// uppercase label, optional supporting line and trend chip. Compose several in
// a grid for a dashboard row. Presentational; styled on the editorial tokens.

import type { ReactNode } from "react";
import Link from "next/link";
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

// Semantic delta tones from the shared status tokens. Good news is green,
// bad is amber.
const TREND_TONE = {
  good: "bg-success/12 text-success-text",
  bad: "bg-warning/14 text-warning-text",
};

export function StatCard({
  value,
  label,
  hint,
  trend,
  info,
  children,
  onClick,
  ariaExpanded,
  disabled,
  href,
  download,
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
  /** Makes the whole card a button (e.g. a tile that reveals a list). */
  onClick?: () => void;
  ariaExpanded?: boolean;
  disabled?: boolean;
  /** Makes the whole card a link (hover reveals a ↗). Wins over onClick. */
  href?: string;
  /** Native download link (e.g. a CSV route) instead of client nav. */
  download?: boolean;
}) {
  const body = (
    <>
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
      {/* Tracking narrows on phones: at 0.16em an eleven-letter label
         ("RESPONDENTS") is wider than a third-width card at 390px and spills
         across the card border. */}
      <p className="mt-2 flex min-w-0 items-center gap-1.5 text-micro font-semibold uppercase tracking-[0.08em] text-ink-faint sm:tracking-[0.16em]">
        {label}
        {info && <InfoDot text={info} />}
      </p>
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </>
  );

  if (href) {
    const linkClass =
      "group relative block panel p-5 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-sm sm:p-6";
    const inner = (
      <>
        <span className="absolute right-4 top-4 text-ink-faint opacity-0 transition group-hover:text-primary group-hover:opacity-100">
          ↗
        </span>
        {body}
      </>
    );
    return download ? (
      <a href={href} className={linkClass}>{inner}</a>
    ) : (
      <Link href={href} className={linkClass}>{inner}</Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-expanded={ariaExpanded}
        className="panel p-5 text-left transition enabled:hover:border-ink-faint enabled:hover:shadow-sm disabled:opacity-70 sm:p-6"
      >
        {body}
      </button>
    );
  }
  return <div className="panel p-5 sm:p-6">{body}</div>;
}
