// Matches the per-survey insights page: full-bleed tinted background, back link,
// a header (eyebrow + title + response count), then bar-chart sections — instead
// of the inherited admin row-list, which read as the wrong page entirely.
export default function SurveyInsightsLoading() {
  return (
    <div className="min-h-[100dvh] bg-paper-tint-soft animate-pulse">
      <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-5 py-12 md:py-16">
        {/* Back link */}
        <div className="mb-8 h-3 w-24 rounded bg-ink-faint/10" />

        {/* Header — eyebrow, title, response count */}
        <div className="border-b border-rule pb-4">
          <div className="h-2.5 w-28 rounded bg-ink-faint/10" />
          <div className="mt-2.5 h-8 w-72 max-w-full rounded bg-ink-faint/10" />
          <div className="mt-2.5 h-3 w-32 rounded bg-ink-faint/10" />
        </div>

        {/* Question sections — label + horizontal result bars */}
        <div className="mt-10 space-y-10">
          {Array.from({ length: 3 }).map((_, s) => (
            <div key={s} className="space-y-4">
              <div className="h-3 w-40 rounded bg-ink-faint/10" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-2.5 w-1/2 rounded bg-ink-faint/10" />
                    <div className="h-[3px] w-full rounded-sm bg-ink-faint/10" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
