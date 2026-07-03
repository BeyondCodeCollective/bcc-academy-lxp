export default function TrackWeekLoading() {
  // Mirrors the day/week page: header (number + title + subtitle), the
  // session/Zoom block, then materials. No back/nav row — the breadcrumb bar
  // (with the Day prev/next pills) lives in the layout and stays visible
  // while this pulses. Padding matches the real page (pt-4 pb-8) so content
  // doesn't jump when it swaps in.
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 pt-4 pb-8 space-y-6 animate-pulse">
      {/* Day number + title + instructor/subtitle line */}
      <div className="space-y-3">
        <div className="h-10 w-2/3 rounded bg-ink-faint/10" />
        <div className="h-3 w-1/2 rounded bg-ink-faint/10" />
      </div>

      {/* Live session / video panel */}
      <div className="aspect-video w-full rounded-lg bg-ink-faint/10" />

      {/* Today's materials */}
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-ink-faint/10" />
        <div className="h-12 w-full rounded-lg bg-ink-faint/10" />
        <div className="h-12 w-full rounded-lg bg-ink-faint/10" />
      </div>
    </div>
  );
}
