// Narrative section header — the one editorial element of the admin system.
// A micro eyebrow, a sentence-style headline that states the finding
// ("15 learners need a check-in"), and a supporting line. Sections that have
// nothing to SAY use the plain uppercase Section label instead; this is for
// leading with the story the numbers tell.

import type { ReactNode } from "react";

export function SectionHeadline({
  eyebrow,
  headline,
  sub,
  actions,
}: {
  eyebrow: string;
  headline: string;
  sub?: string;
  /** Right-aligned controls (export buttons, view toggles). */
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">
          {headline}
        </h2>
        {sub && <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
  );
}
