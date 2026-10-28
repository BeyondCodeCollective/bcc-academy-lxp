import { CalendarCheck, CircleAlert, Users } from "lucide-react";

// Frontend-only cards: do not infer totals or flags from incomplete evidence.
// The containing client component owns the Learners-only status selection.
export function LearnerSummary({ needsCheckInSelected, onNeedsCheckIn }: {
  needsCheckInSelected: boolean;
  onNeedsCheckIn: () => void;
}) {
  return <section aria-label="Learner summary" className="mt-6">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <article className="panel min-w-0 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-primary">Total Enrolled</h2>
          <Users aria-hidden="true" size={20} className="shrink-0 text-primary" />
        </div>
        <p className="mt-4 text-3xl font-semibold text-ink" aria-label="Count unavailable">—</p>
        <p className="mt-3 text-sm text-ink-soft">Distinct learners enrolled in the selected scope.</p>
      </article>
      <article className="panel min-w-0 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-primary">Sessions Held</h2>
          <CalendarCheck aria-hidden="true" size={20} className="shrink-0 text-primary" />
        </div>
        <p className="mt-4 text-3xl font-semibold text-ink" aria-label="Count unavailable">—</p>
        <p className="mt-3 text-sm text-ink-soft">Verified held sessions to date across selected courses.</p>
      </article>
      <button type="button" aria-pressed={needsCheckInSelected} onClick={onNeedsCheckIn}
        className={`panel min-w-0 p-5 text-left transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6 ${needsCheckInSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : ""}`}>
        <span className="flex items-start justify-between gap-3">
          <span className="text-sm font-semibold text-ink">Needs Check-In</span>
          <CircleAlert aria-hidden="true" size={20} className="shrink-0 text-amber-700" />
        </span>
        <span className="mt-4 block text-3xl font-semibold text-ink" aria-label="Count unavailable">—</span>
        <span className="mt-3 block text-sm text-ink-soft">Learners with verified follow-up flags.</span>
        <span className="mt-3 block text-xs font-semibold text-primary">{needsCheckInSelected ? "Selected · click to show all statuses" : "Select Needs Check-in status"}</span>
      </button>
    </div>
    <p className="mt-3 text-xs text-ink-soft">Summary counts are not connected yet. A dash means unavailable, not zero.</p>
  </section>;
}
