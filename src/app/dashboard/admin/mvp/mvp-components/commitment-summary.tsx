import { CalendarDays, CircleAlert, CircleCheck } from "lucide-react";

// Placeholders only: no achievement or pacing judgments without approved data.
export function CommitmentSummary() {
  return <section aria-label="Commitment summary" className="mb-6">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <article className="panel min-w-0 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Achievement summary</h2>
          <CircleCheck aria-hidden="true" size={20} className="shrink-0 text-primary" />
        </div>
        <p className="mt-4 text-3xl font-semibold text-ink" aria-label="Achievement summary unavailable">—</p>
        <p className="mt-3 text-sm text-ink-soft">Commitment achievement will appear when results and review rules are available.</p>
      </article>
      <article className="panel min-w-0 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Needs staff review</h2>
          <CircleAlert aria-hidden="true" size={20} className="shrink-0 text-ink-soft" />
        </div>
        <p className="mt-4 text-3xl font-semibold text-ink" aria-label="Staff-review count unavailable">—</p>
        <p className="mt-3 text-sm text-ink-soft">Commitments requiring staff review will appear here.</p>
      </article>
      <article className="panel min-w-0 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Next deadline</h2>
          <CalendarDays aria-hidden="true" size={20} className="shrink-0 text-ink-soft" />
        </div>
        <p className="mt-4 text-3xl font-semibold text-ink" aria-label="Next deadline unavailable">—</p>
        <p className="mt-3 text-sm text-ink-soft">The next commitment deadline and owner will appear here.</p>
      </article>
    </div>
    <p className="mt-3 text-xs text-ink-soft">Summary data is not connected yet. A dash means unavailable, not zero.</p>
  </section>;
}
