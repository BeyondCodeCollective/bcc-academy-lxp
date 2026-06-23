// Before → after paired bars, one row per statement. Extracted from the
// neutral dual-likert visual in the per-survey dashboard so the Outcomes
// dashboard can reuse the exact same look. "Before" reads dim, "now" reads in
// full ink, with the delta called out.

// Before → after: "before" reads dim neutral, "now" reads in cobalt — grey →
// brand color shows the improvement (single-hue, on-brand).
const NOW = "var(--primary)";
const INK_DIM = "#d1d1d6";

export type PairedRow = {
  statement: string;
  before: number;
  now: number;
  delta: number;
  n: number;
};

type Props = {
  title: string;
  beforeLabel: string;
  nowLabel: string;
  /** Top of the rating scale, for bar normalization (e.g. 5). */
  scaleMax: number;
  rows: PairedRow[];
};

export function PairedBarChart({ title, beforeLabel, nowLabel, scaleMax, rows }: Props) {
  return (
    <div className="panel p-5">
      <p className="text-sm font-medium text-ink leading-snug">{title}</p>
      <p className="mt-1 text-[11px] text-ink-faint">
        {beforeLabel} <span className="text-ink-faint">→</span> {nowLabel}
      </p>
      <div className="mt-5 space-y-4">
        {rows.map((row) => {
          const beforePct = scaleMax > 0 ? (row.before / scaleMax) * 100 : 0;
          const nowPct = scaleMax > 0 ? (row.now / scaleMax) * 100 : 0;
          return (
            <div
              key={row.statement}
              className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-2"
            >
              <p className="text-[13px] leading-snug text-ink">{row.statement}</p>
              <p className="shrink-0 whitespace-nowrap text-lg font-semibold tabular-nums text-ink">
                {row.before.toFixed(2)}
                <span className="mx-1.5 font-normal text-ink-faint">→</span>
                {row.now.toFixed(2)}
                <span
                  className={`ml-2 font-sans text-[11px] font-medium tabular-nums ${
                    row.delta >= 0 ? "text-ink" : "text-ink-faint"
                  }`}
                >
                  {row.delta >= 0 ? "+" : ""}
                  {row.delta.toFixed(2)}
                </span>
              </p>
              <div className="col-span-2 space-y-1">
                <Bar label="Before" pct={beforePct} color={INK_DIM} />
                <Bar label="Now" pct={nowPct} color={NOW} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[10px] uppercase tracking-wider text-ink-faint">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden bg-paper-tint">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
