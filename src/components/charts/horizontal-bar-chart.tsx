type Datum = {
  label: string;
  value: number;
};

type Props = {
  title: string;
  data: Datum[];
  /** Tailwind color class for the bars (e.g. "bg-[#E54D2E]"). */
  barClass?: string;
  /** Optional max value override — defaults to the largest datum. */
  max?: number;
  /** Optional label suffix in the value column (e.g. "students"). */
  unit?: string;
  /** Optional override for the top-right caption. Defaults to the sum of
   *  data values labelled "total" — but that's misleading when one person
   *  can appear in multiple rows. Pass { value, label } to show e.g.
   *  "170 unique" instead. */
  totalCaption?: { value: number; label: string };
};

// Pure-CSS horizontal bar chart. No SVG dependency — each bar is a div
// whose width is a percentage of the max value. Sorted descending by
// caller. Designed to match the admin card visual system.
export function HorizontalBarChart({ title, data, barClass = "bg-[#E54D2E]", max, unit, totalCaption }: Props) {
  const maxValue = max ?? Math.max(...data.map((d) => d.value), 1);
  const caption = totalCaption ?? {
    value: data.reduce((sum, d) => sum + d.value, 0),
    label: "total",
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
          {title}
        </p>
        <p className="text-[11px] tabular-nums text-neutral-400">
          {caption.value.toLocaleString()} {caption.label}
        </p>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-neutral-400">No data yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {data.map((d) => {
            const pct = (d.value / maxValue) * 100;
            return (
              <li key={d.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="mb-1 truncate text-xs font-medium text-neutral-700">
                    {d.label}
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-full rounded-full ${barClass} transition-all`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900">
                  {d.value.toLocaleString()}
                  {unit && (
                    <span className="ml-1 text-[10px] font-normal text-neutral-400">
                      {unit}
                    </span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
