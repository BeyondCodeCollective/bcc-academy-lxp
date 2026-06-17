// Neutral fallback skeleton — used for /dashboard AND any sub-route that doesn't
// ship its own loading.tsx (resources, workshops, surveys, assessment, help…).
// Deliberately layout-agnostic (header + stacked blocks) so it never flashes the
// "wrong" layout — the old version showed a 2-column learner-home grid on every
// page. Routes with a distinctive layout (courses, track, week) keep their own
// matching skeleton.
export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 space-y-6 animate-pulse">
      {/* Header — title + subtitle, with optional action chips on the right */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="h-8 w-44 rounded bg-ink-faint/10" />
          <div className="mt-2.5 h-3 w-72 max-w-full rounded bg-ink-faint/10" />
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <div className="h-8 w-24 rounded bg-ink-faint/10" />
          <div className="h-8 w-20 rounded bg-ink-faint/10" />
        </div>
      </div>

      {/* Generic stacked content blocks — works for lists, forms, and details */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-ink-faint/10" />
        ))}
      </div>
    </div>
  );
}
