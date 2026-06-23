// Single-hue activity heatmap (GitHub-style). Part of the BCC stats kit:
// cobalt --primary at rising opacity for intensity, --highlight (green) used
// only as a filled current-streak ring — never as text. Presentational.

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export type ProgressDay = {
  /** ISO date (yyyy-mm-dd). */
  date: string;
  /** Activity intensity bucket, 0 = nothing that day. */
  level: HeatLevel;
  /** True for any day in the live streak — gets the green ring. */
  current?: boolean;
  /** Future days (after today) render as empty placeholders. */
  future?: boolean;
};

// Cobalt at rising opacity = a calm, single-hue scale (no rainbow).
export const CELL_BG: Record<HeatLevel, string> = {
  0: "var(--paper-tint)",
  1: "color-mix(in srgb, var(--primary) 28%, var(--paper-tint))",
  2: "color-mix(in srgb, var(--primary) 52%, white)",
  3: "color-mix(in srgb, var(--primary) 78%, white)",
  4: "var(--primary)",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function StreakHeatmap({
  days,
  showLegend = true,
  legendStreak = true,
}: {
  /** Chronological, oldest → newest. Length a multiple of 7, each group of
      7 aligned Sun→Sat (one column). */
  days: ProgressDay[];
  showLegend?: boolean;
  /** Show the "current streak" key. Off for cohort-aggregate heatmaps where a
      single learner's streak ring has no meaning. */
  legendStreak?: boolean;
}) {
  const weeks: ProgressDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div>
      <div className="flex items-end gap-2 overflow-x-auto pb-1">
        {/* Weekday rail */}
        <div className="flex flex-col gap-1 pr-1">
          {WEEKDAYS.map((d, i) => (
            <span
              key={d}
              className="h-3.5 text-[9px] leading-[14px] text-ink-faint"
              style={{ visibility: i % 2 === 1 ? "visible" : "hidden" }}
            >
              {d}
            </span>
          ))}
        </div>
        {/* Week columns */}
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => (
                <span
                  key={day.date}
                  title={`${day.date}${day.future ? "" : ` · ${day.level > 0 ? "active" : "no activity"}`}`}
                  className="h-3.5 w-3.5 rounded-[3px]"
                  style={{
                    backgroundColor: day.future ? "transparent" : CELL_BG[day.level],
                    boxShadow: day.current ? "inset 0 0 0 1.5px var(--highlight)" : undefined,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {showLegend && (
        <div className="mt-3 flex items-center justify-between text-[10px] text-ink-faint">
          {legendStreak ? (
            <span className="inline-flex items-center gap-1">
              <span
                className="h-3 w-3 rounded-[3px]"
                style={{ boxShadow: "inset 0 0 0 1.5px var(--highlight)" }}
              />
              Current streak
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1">
            Less
            {([0, 1, 2, 3, 4] as HeatLevel[]).map((l) => (
              <span
                key={l}
                className="h-3 w-3 rounded-[3px]"
                style={{ backgroundColor: CELL_BG[l] }}
              />
            ))}
            More
          </span>
        </div>
      )}
    </div>
  );
}
