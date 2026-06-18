// Lightweight multi-series line chart (SVG polyline). Built for the completion
// drop-off / survival curve — x = week, y = % of enrolled still active. Single
// series gets an area fill; multiple series overlay with a legend. No charting
// dependency, matches the admin card visual system.

export type LineSeries = {
  label: string;
  /** Hex color, e.g. "#1D59FF". */
  color: string;
  /** One y-value per x label. */
  points: number[];
};

type Props = {
  title: string;
  xLabels: string[];
  series: LineSeries[];
  /** Y-axis max; defaults to 100 (percentages). */
  yMax?: number;
  /** Suffix on axis labels, e.g. "%". */
  yUnit?: string;
  caption?: string;
};

const W = 520;
const H = 180;
const PAD_L = 30;
const PAD_B = 22;
const PAD_T = 8;
const PAD_R = 8;

export function LineChart({
  title,
  xLabels,
  series,
  yMax = 100,
  yUnit = "%",
  caption,
}: Props) {
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const n = xLabels.length;
  const xAt = (i: number) => PAD_L + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v: number) => PAD_T + plotH - (Math.min(v, yMax) / yMax) * plotH;
  const single = series.length === 1;

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          {title}
        </p>
        {caption && <p className="text-[11px] tabular-nums text-ink-faint">{caption}</p>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        {/* horizontal gridlines + y labels at 0/50/100% of yMax */}
        {[0, 0.5, 1].map((f) => {
          const y = PAD_T + plotH - f * plotH;
          return (
            <g key={f}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#ececec" strokeWidth={1} />
              <text x={PAD_L - 6} y={y + 3} textAnchor="end" className="fill-ink-faint" fontSize={9}>
                {Math.round(f * yMax)}
                {yUnit}
              </text>
            </g>
          );
        })}

        {series.map((s) => {
          const path = s.points.map((p, i) => `${xAt(i)},${yAt(p)}`).join(" ");
          return (
            <g key={s.label}>
              {single && (
                <polygon
                  points={`${PAD_L},${PAD_T + plotH} ${path} ${xAt(n - 1)},${PAD_T + plotH}`}
                  fill={s.color}
                  opacity={0.08}
                />
              )}
              <polyline
                points={path}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.points.map((p, i) => (
                <circle key={i} cx={xAt(i)} cy={yAt(p)} r={2.5} fill={s.color} />
              ))}
            </g>
          );
        })}

        {/* x labels */}
        {xLabels.map((lbl, i) => (
          <text
            key={i}
            x={xAt(i)}
            y={H - 6}
            textAnchor="middle"
            className="fill-ink-faint"
            fontSize={9}
          >
            {lbl}
          </text>
        ))}
      </svg>

      {!single && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {series.map((s) => (
            <li key={s.label} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
