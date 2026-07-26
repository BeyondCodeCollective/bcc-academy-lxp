import type { ReactNode } from "react";

/**
 * Shared page header — ONE title treatment for every page across the app, so
 * surfaces read as one product instead of one-offs. Optional eyebrow above,
 * subtitle below, and an actions slot on the right (buttons, links).
 *
 * Change the treatment here and every page updates — that's the point.
 */
export function PageHeader({
  eyebrow,
  badge,
  index,
  title,
  subtitle,
  actions,
  noWrap,
}: {
  eyebrow?: string;
  /** Optional status pill rendered beside the eyebrow (e.g. "This Week"). */
  badge?: ReactNode;
  /** Optional large number anchoring the header as a graphic (e.g. a week number). */
  index?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Keep actions pinned top-right (let the title text wrap) instead of dropping
   *  the action group below the title when the row runs out of room. */
  noWrap?: boolean;
}) {
  const hasEyebrow = !!eyebrow || !!badge;
  return (
    <header
      className={`flex items-start justify-between gap-4 ${noWrap ? "flex-nowrap" : "flex-wrap"}`}
    >
      <div className="flex min-w-0 items-start gap-4 sm:gap-5">
        {index && (
          <span
            aria-hidden
            className="shrink-0 text-[2.6rem] font-extrabold leading-[0.85] tracking-[-0.04em] tabular-nums text-ink sm:text-6xl"
            style={{ fontFamily: "var(--font-archivo), sans-serif" }}
          >
            {index}
          </span>
        )}
        <div className="min-w-0">
          {hasEyebrow && (
            <div className="flex items-center gap-2.5">
              {eyebrow && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                  {eyebrow}
                </p>
              )}
              {badge}
            </div>
          )}
          <h1
            className={`text-2xl font-bold tracking-tight text-ink${hasEyebrow ? " mt-1.5" : ""}`}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Shared section header — uppercase label with an optional count, matching the
 * page header's eyebrow treatment. Wrap any grouped block (a card grid, a list)
 * so every section across the app uses the same label rhythm.
 */
export function Section({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-rule pb-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          {label}
        </h2>
        {count !== undefined && (
          <span className="text-xs tabular-nums text-ink-faint">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}
