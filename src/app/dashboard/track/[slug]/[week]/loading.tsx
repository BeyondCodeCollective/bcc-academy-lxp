export default function TrackWeekLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 space-y-6 animate-pulse">
      {/* Back to course + week nav */}
      <div className="flex items-center justify-between gap-3">
        <div className="h-3 w-48 rounded bg-ink-faint/10" />
        <div className="h-8 w-40 rounded-lg bg-ink-faint/10" />
      </div>

      {/* Week index + title */}
      <div className="space-y-3">
        <div className="h-10 w-2/3 rounded bg-ink-faint/10" />
        <div className="h-3 w-1/2 rounded bg-ink-faint/10" />
      </div>

      {/* Video / session panel */}
      <div className="aspect-video w-full rounded-lg bg-ink-faint/10" />

      {/* Description */}
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-ink-faint/10" />
        <div className="h-3 w-5/6 rounded bg-ink-faint/10" />
      </div>
    </div>
  );
}
