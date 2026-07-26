// Stepped funnel. Each stage is a bar scaled to the first stage, with the
// stage count, its share of the top, and the step-to-step conversion. Pure CSS,
// matches the admin card visual system.

export type FunnelStage = { label: string; count: number };

type Props = {
  title: string;
  stages: FunnelStage[];
  /** Tailwind bg class for the bars. */
  barClass?: string;
  caption?: string;
};

export function FunnelChart({ title, stages, barClass = "bg-ink", caption }: Props) {
  const top = stages[0]?.count ?? 0;

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          {title}
        </p>
        {caption && <p className="text-[11px] tabular-nums text-ink-faint">{caption}</p>}
      </div>
      {top === 0 ? (
        <p className="text-sm text-ink-faint">No data yet.</p>
      ) : (
        <ul className="space-y-3">
          {stages.map((stage, i) => {
            const sharePct = Math.round((stage.count / top) * 100);
            const prev = i > 0 ? stages[i - 1].count : null;
            const stepPct =
              prev && prev > 0 ? Math.round((stage.count / prev) * 100) : null;
            return (
              <li key={stage.label}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-xs font-medium text-ink">{stage.label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                    {stage.count.toLocaleString()}
                    <span className="ml-1 text-ink-faint">· {sharePct}%</span>
                    {stepPct !== null && (
                      <span className="ml-1 text-ink-faint">({stepPct}% of prev)</span>
                    )}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper-tint">
                  <div
                    className={`h-full rounded-full ${barClass} transition-all`}
                    style={{ width: `${Math.max(sharePct, 2)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
