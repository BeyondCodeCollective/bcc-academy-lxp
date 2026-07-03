export default function TrackOverviewLoading() {
  // Neutral shapes shared by BOTH states this route renders — the pre-launch
  // holding page (hero image → countdown → facts) and the started overview
  // (curriculum hero → intro → facts). No back-link row: the breadcrumb bar
  // lives in the layout and is already visible while this pulses.
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-8 space-y-6 animate-pulse">
      {/* Hero block (holding hero image / curriculum grid panel) */}
      <div className="h-64 sm:h-80 rounded-2xl bg-ink-faint/10" />

      {/* Countdown / intro panel */}
      <div className="h-28 rounded-lg bg-ink-faint/10" />

      {/* Instructor / Length / Cadence facts */}
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 rounded-lg bg-ink-faint/10" />
        <div className="h-20 rounded-lg bg-ink-faint/10" />
        <div className="h-20 rounded-lg bg-ink-faint/10" />
      </div>

      {/* What-happens-next / description panel */}
      <div className="h-36 rounded-lg bg-ink-faint/10" />
    </div>
  );
}
