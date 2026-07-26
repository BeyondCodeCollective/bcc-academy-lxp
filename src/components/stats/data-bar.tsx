// Ranked single-hue bar list. The BCC answer to Flow's "Desktop usage"
// breakdown: each row is a cobalt bar whose width encodes its share and whose
// opacity steps down by rank, so the eye reads the ranking before the numbers.
// Presentational.

import type { ReactNode } from "react";
import { COBALT_RAMP } from "./palette";

export type DataBarItem = {
  label: string;
  /** Raw count shown on the right. */
  value: number | string;
  /** 0–100. Bar width. If omitted, computed from value vs the max. */
  pct?: number;
  /** Optional leading icon/glyph. */
  icon?: ReactNode;
};

// Rank → shared cobalt ramp, reversed: top item is full strength, the tail fades.
function fillFor(rank: number): string {
  return COBALT_RAMP[Math.max(0, COBALT_RAMP.length - 1 - rank)];
}

export function DataBar({ items }: { items: DataBarItem[] }) {
  const max = Math.max(
    1,
    ...items.map((i) =>
      typeof i.value === "number" ? i.value : 0,
    ),
  );

  return (
    <div className="space-y-2.5">
      {items.map((item, rank) => {
        const pct =
          item.pct ??
          (typeof item.value === "number" ? (item.value / max) * 100 : 0);
        // Floor the visible width so tiny shares still read as a sliver.
        const width = Math.max(pct, 4);
        return (
          <div key={item.label} className="flex items-center gap-3">
            {item.icon && (
              <span className="shrink-0 text-ink-faint">{item.icon}</span>
            )}
            <div className="min-w-0 flex-1">
              <div
                className="h-7 rounded-md"
                style={{ width: `${width}%`, backgroundColor: fillFor(rank) }}
              />
            </div>
            <div className="flex w-[42%] shrink-0 items-baseline gap-2">
              <span className="text-sm font-medium text-ink tabular-nums">
                {typeof item.value === "number"
                  ? item.value.toLocaleString()
                  : item.value}
              </span>
              <span className="truncate text-xs uppercase tracking-wide text-ink-faint">
                {item.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
