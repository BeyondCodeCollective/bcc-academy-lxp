// Semantic status language — ONE chip, dot, and threshold legend for every
// "how is it going" signal (attendance health, engagement risk, save states).
// Tones map to the --success/--warning/--danger/--inactive tokens; sequential
// distributions use COBALT_RAMP instead, never these.

export type StatusTone = "success" | "warning" | "danger" | "inactive";

/** Tinted chip classes per tone: soft fill + readable text. */
export const TONE_CHIP: Record<StatusTone, string> = {
  success: "bg-success/10 text-success-text",
  warning: "bg-warning/12 text-warning-text",
  danger: "bg-danger/10 text-danger-text",
  inactive: "bg-inactive/15 text-inactive-text",
};

/** Solid dot/marker classes per tone (legend keys, list markers). */
export const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  inactive: "bg-inactive",
};

/** Small tinted status chip — factual labels ("On track", "Check in"). */
export function StatusChip({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE_CHIP[tone]}`}
    >
      {children}
    </span>
  );
}

/** Threshold legend row — the same key everywhere a tone encodes a cutoff,
 *  so "green means 80%+" is learned once and holds across pages. */
export function ThresholdLegend({
  items,
}: {
  items: { tone: StatusTone; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-soft">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-[3px] ${TONE_DOT[item.tone]}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
