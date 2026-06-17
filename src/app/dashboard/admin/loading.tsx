// Neutral admin fallback — used for the admin home AND every admin tab/sub-route
// (overview, survey Insights, invites, programs, landing, surveys…). Kept
// deliberately layout-agnostic (header + generic blocks) — an earlier
// course-style row-list (colored dots + week/student columns) read as "courses"
// on the survey-insights tab and other pages. Distinctive pages (per-survey
// insights, courses) ship their own matching skeleton.
export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl space-y-6 px-4 sm:px-5 py-8 animate-pulse">
      {/* Header — title + subtitle, optional action chips on the right */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="h-8 w-40 rounded bg-ink-faint/10" />
          <div className="mt-2.5 h-3 w-72 max-w-full rounded bg-ink-faint/10" />
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <div className="h-8 w-28 rounded bg-ink-faint/10" />
          <div className="h-8 w-16 rounded bg-ink-faint/10" />
        </div>
      </div>

      {/* Generic stacked content blocks — works for lists, ledgers, and forms */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-ink-faint/10" />
        ))}
      </div>
    </div>
  );
}
