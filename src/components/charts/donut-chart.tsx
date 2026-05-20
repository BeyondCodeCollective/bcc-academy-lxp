type Segment = {
  label: string;
  value: number;
  /** Hex color for the segment, e.g. "#E54D2E". */
  color: string;
};

type Props = {
  title: string;
  segments: Segment[];
  /** Optional big number in the center; defaults to total. */
  centerValue?: string | number;
  /** Optional caption below the center number. */
  centerLabel?: string;
};

// SVG donut chart. Renders each segment as a stroked circle arc using
// stroke-dasharray + stroke-dashoffset (no path math required). Sized
// to drop into a 1/2-column grid card alongside other dashboard charts.
export function DonutChart({ title, segments, centerValue, centerLabel }: Props) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const size = 160;
  const strokeWidth = 18;

  // Pre-compute cumulative offsets so each segment starts where the prior ended.
  let cumulative = 0;
  const arcs = segments.map((s) => {
    const length = total > 0 ? (s.value / total) * circumference : 0;
    const offset = -cumulative;
    cumulative += length;
    return { ...s, length, offset };
  });

  const displayCenter = centerValue ?? total.toLocaleString();

  return (
    <div className="border border-rule bg-surface-elevated p-5">
      <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
        {title}
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="relative shrink-0 self-center sm:self-auto" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f5f5f5"
              strokeWidth={strokeWidth}
            />
            {total > 0 &&
              arcs.map((a, i) => (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${a.length} ${circumference - a.length}`}
                  strokeDashoffset={a.offset}
                  strokeLinecap="butt"
                />
              ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-bold tabular-nums text-neutral-900 tracking-tight">
              {displayCenter}
            </p>
            {centerLabel && (
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                {centerLabel}
              </p>
            )}
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-2">
          {segments.map((s) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <li key={s.label} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate text-neutral-700">{s.label}</span>
                </div>
                <span className="shrink-0 tabular-nums text-neutral-500">
                  {s.value.toLocaleString()}
                  <span className="ml-1 text-neutral-300">·</span>
                  <span className="ml-1 text-neutral-400">{pct}%</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
