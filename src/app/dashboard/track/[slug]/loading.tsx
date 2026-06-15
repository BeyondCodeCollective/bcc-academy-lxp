export default function TrackOverviewLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-8 space-y-8 animate-pulse">
      {/* Back / All courses row */}
      <div className="h-3 w-24 rounded bg-ink-faint/10" />

      {/* Hero panel (curriculum grid) */}
      <div className="h-56 rounded-lg bg-ink-faint/10" />

      {/* Eyebrow + title + description */}
      <div className="space-y-3">
        <div className="h-3 w-40 rounded bg-ink-faint/10" />
        <div className="h-9 w-3/4 rounded bg-ink-faint/10" />
        <div className="h-3 w-full rounded bg-ink-faint/10" />
        <div className="h-3 w-5/6 rounded bg-ink-faint/10" />
      </div>

      {/* Primary CTA */}
      <div className="h-11 w-56 rounded-lg bg-ink-faint/10" />

      {/* Instructor / Duration / Cadence */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="h-20 rounded-lg bg-ink-faint/10" />
        <div className="h-20 rounded-lg bg-ink-faint/10" />
        <div className="h-20 rounded-lg bg-ink-faint/10" />
      </div>
    </div>
  );
}
