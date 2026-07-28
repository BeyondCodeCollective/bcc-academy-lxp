"use client";

import { useState } from "react";
import { LIKERT_SCALE_COLORS } from "./palette";

/**
 * Diverging stacked bars for a block of Likert statements.
 *
 * Replaces a wall of identical histograms. The old survey page drew one heavy
 * black bar plus a repeated 1–5 axis and a count strip for EVERY statement —
 * thirty-five times on the Security+ pre-survey. Nothing was ranked, so the
 * finding (cryptography at 2.93, tech confidence at 4.87) looked exactly like
 * everything else and a reader scrolled past it.
 *
 * Three decisions do the work:
 *
 *  · DIVERGING, centred on neutral. Agreement is polarity data. Disagreement
 *    grows left of centre, agreement right, so "which way" is legible without
 *    reading a single number.
 *  · SORTED, weakest first. The statement that needs attention is at the top of
 *    its block instead of buried at position 24.
 *  · THE AXIS ONCE. The scale is stated per block, not per row.
 *
 * Rows share one centre line, so bars are comparable across statements — the
 * thing the old layout made impossible.
 */

export type LikertRow = {
  statement: string;
  /** Count per scale point, low → high. Length should match the scale. */
  counts: number[];
  mean: number;
  n: number;
};

function pct(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

export function LikertDiverging({
  rows,
  scaleLow,
  scaleHigh,
  /** Sort weakest first — the default, because that's the actionable end. */
  sort = true,
}: {
  rows: LikertRow[];
  scaleLow: string;
  scaleHigh: string;
  sort?: boolean;
}) {
  const [showTable, setShowTable] = useState(false);
  if (rows.length === 0) return null;

  const ordered = sort ? [...rows].sort((a, b) => a.mean - b.mean) : rows;
  const mid = Math.floor(LIKERT_SCALE_COLORS.length / 2); // index of neutral

  // One shared scale for every row: the widest disagree side and the widest
  // agree side across the block. Without this, each row would normalise to
  // itself and two bars of equal length would mean different things.
  let maxLeft = 0;
  let maxRight = 0;
  for (const r of ordered) {
    const total = r.counts.reduce((a, b) => a + b, 0) || 1;
    const left = r.counts.slice(0, mid).reduce((a, b) => a + b, 0) + r.counts[mid] / 2;
    const right = r.counts.slice(mid + 1).reduce((a, b) => a + b, 0) + r.counts[mid] / 2;
    maxLeft = Math.max(maxLeft, pct(left, total));
    maxRight = Math.max(maxRight, pct(right, total));
  }
  const span = Math.max(maxLeft, maxRight, 1);

  return (
    <div className="space-y-3">
      {/* The scale, stated once for the whole block. */}
      <div className="flex items-center justify-between text-micro text-ink-faint">
        <span>{scaleLow}</span>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="underline underline-offset-2 transition-colors hover:text-ink-soft"
        >
          {showTable ? "Hide counts" : "Show counts"}
        </button>
        <span>{scaleHigh}</span>
      </div>

      {/* Rows breathe more than the gap between a statement and its own bar,
         so each bar reads as belonging to the line above it rather than
         floating between two. */}
      <div className="space-y-3.5">
        {ordered.map((row) => {
          const total = row.counts.reduce((a, b) => a + b, 0) || 1;
          const leftShare =
            row.counts.slice(0, mid).reduce((a, b) => a + b, 0) + row.counts[mid] / 2;
          // Where this row's centre sits, so every bar shares one centre line.
          const leftPct = pct(leftShare, total);
          return (
            <div key={row.statement} className="group">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 flex-1 text-xs leading-snug text-ink">
                  {row.statement}
                </p>
                {/* The mean sits WITH its statement, not stranded at the far
                   edge of the page with a chart in between. */}
                <span className="shrink-0 text-xs font-semibold tabular-nums text-ink">
                  {row.mean.toFixed(2)}
                </span>
              </div>

              {/* Widths are percentages of the ROW, not of a shrink-to-fit
                 absolute box — inside one, every percentage resolves against an
                 indeterminate width and the bars collapse to nothing. A leading
                 spacer slides each bar so all rows share one centre line. */}
              <div className="relative mt-1 flex h-3.5 items-stretch" title={`n=${row.n}`}>
                <span
                  aria-hidden
                  style={{ width: `${Math.max(0, 50 - (leftPct / span) * 50)}%` }}
                />
                {row.counts.map((count, i) => {
                  if (count === 0) return null;
                  const w = (pct(count, total) / span) * 50;
                  return (
                    <span
                      key={i}
                      // 2px surface gap between segments (marks spec), so
                      // adjacent fills never blend into one another.
                      className="h-full first:rounded-l-[3px] last:rounded-r-[3px]"
                      style={{
                        width: `${w}%`,
                        backgroundColor: LIKERT_SCALE_COLORS[i],
                        marginRight: 2,
                      }}
                    />
                  );
                })}
                {/* Neutral centre line — the axis every row is read against. */}
                <div
                  className="pointer-events-none absolute inset-y-0 w-px bg-rule"
                  style={{ left: "50%" }}
                  aria-hidden
                />
              </div>

              {showTable && (
                <p className="mt-1 text-micro tabular-nums text-ink-faint">
                  {row.counts.map((c, i) => `${i + 1}: ${c}`).join("  ·  ")}
                  {"  ·  n="}
                  {row.n}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend — identity is never colour-alone. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-micro text-ink-faint">
        {["1", "2", "3", "4", "5"].map((label, i) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-[2px]"
              style={{ backgroundColor: LIKERT_SCALE_COLORS[i] }}
              aria-hidden
            />
            {label}
          </span>
        ))}
        <span className="ml-auto">sorted weakest first</span>
      </div>
    </div>
  );
}
