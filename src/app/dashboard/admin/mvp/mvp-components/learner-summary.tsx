import { CalendarCheck, CircleAlert, Users } from "lucide-react";

export type LearnerSummaryData = { totalEnrolled: number; sessionsHeld: number | null; sessionsHeldUnavailableReason: string | null; asOf: string };

// Counts come from the full authorized matching roster, never the visible page.
// The containing client component owns the Learners-only status selection.
export function LearnerSummary({ needsCheckInSelected, onNeedsCheckIn, summary, state = "disconnected" }: {
  needsCheckInSelected: boolean;
  onNeedsCheckIn: () => void;
  summary?: LearnerSummaryData;
  state?: "disconnected" | "loading" | "error" | "ready";
}) {
  const count = (value: number | null | undefined) => state === "ready" && typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString("en-US") : null;
  const enrolled = count(summary?.totalEnrolled);
  const sessions = count(summary?.sessionsHeldUnavailableReason ? null : summary?.sessionsHeld);
  return <section aria-label="Learner summary" className="mt-6">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <article className="panel min-w-0 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-primary">Total Enrolled</h2>
          <Users aria-hidden="true" size={20} className="shrink-0 text-primary" />
        </div>
        <p className="mt-4 text-3xl font-semibold text-ink" aria-label={enrolled === null ? "Count unavailable" : undefined}>{enrolled ?? "—"}</p>
        <p className="mt-3 text-sm text-ink-soft">Distinct learners enrolled in the selected scope.</p>
      </article>
      <article className="panel min-w-0 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-primary">Sessions Held</h2>
          <CalendarCheck aria-hidden="true" size={20} className="shrink-0 text-primary" />
        </div>
        <p className="mt-4 text-3xl font-semibold text-ink" aria-label={sessions === null ? "Count unavailable" : undefined}>{sessions ?? "—"}</p>
        <p className="mt-3 text-sm text-ink-soft">Verified required sessions held, counted once per matching program/course.</p>
        {state === "ready" && sessions === null && <p className="mt-2 text-xs text-ink-soft">{summary?.sessionsHeldUnavailableReason || "Verified session counts are unavailable."}</p>}
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
    <p role="status" className="mt-3 text-xs text-ink-soft">{state === "loading" ? "Updating summary counts…" : state === "error" ? "Summary counts are unavailable. Retry loading learners below." : state === "ready" ? "Totals reflect all matching learners and courses, not just this page. Needs Check-In count is not connected yet." : "Summary counts are not connected yet."} A dash means unavailable, not zero.</p>
  </section>;
}
