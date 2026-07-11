export default function TrackOverviewLoading() {
  // Mirrors the CURRENT course overview (#696): text header (eyebrow → title
  // → meta line), the what's-next panel, then the schedule calendar. The old
  // skeleton still drew the deleted layout — a giant hero and three fact
  // tiles — so every course click flashed a page that no longer exists.
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-8 space-y-8 animate-pulse">
      {/* Header: eyebrow / course title / instructor · length */}
      <div>
        <div className="h-3 w-28 rounded bg-ink-faint/10" />
        <div className="mt-2.5 h-8 w-72 max-w-full rounded bg-ink-faint/10" />
        <div className="mt-2.5 h-3.5 w-44 rounded bg-ink-faint/10" />
      </div>

      {/* Next-up / pre-start panel */}
      <div className="h-24 rounded-xl bg-ink-faint/10" />

      {/* Schedule header + calendar */}
      <div>
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-ink-faint/10" />
          <div className="h-8 w-36 rounded-full bg-ink-faint/10" />
        </div>
        <div className="mt-3 h-80 rounded-lg bg-ink-faint/10" />
      </div>
    </div>
  );
}
