// Admin fallback — mirrors the shared admin shell: every top-level admin tab
// (Courses home, People, Student work, Analytics) opens with the AdminTopTabs
// bar, then sectioned panel row-lists. Bones follow the 2026-07-13 home
// redesign: section label rule + divided rows (icon · two-line text · right
// meta), not the old page-title header + fat blocks, which no admin surface
// renders anymore. Distinctive sub-pages (per-survey insights) ship their own.
export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl space-y-6 px-4 sm:px-8 md:px-5 py-8 animate-pulse">
      {/* Top tab bar — Courses / People / Student work / Analytics */}
      <div className="flex items-center gap-x-1 border-b border-rule pb-2.5">
        <div className="h-5 w-20 rounded bg-ink-faint/10" />
        <div className="ml-3 h-5 w-16 rounded bg-ink-faint/10" />
        <div className="ml-3 h-5 w-24 rounded bg-ink-faint/10" />
        <div className="ml-3 hidden h-5 w-20 rounded bg-ink-faint/10 sm:block" />
        <div className="ml-auto h-7 w-20 rounded bg-ink-faint/10" />
      </div>

      {/* Sectioned row lists — label rule, then a panel of divided rows */}
      {[3, 2].map((rows, s) => (
        <section key={s} className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-rule pb-2.5">
            <div className="h-3 w-24 rounded bg-ink-faint/10" />
            <div className="h-3 w-4 rounded bg-ink-faint/10" />
          </div>
          <div className="divide-y divide-rule overflow-hidden panel">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="h-4.5 w-4.5 shrink-0 rounded bg-ink-faint/10" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3.5 w-44 max-w-full rounded bg-ink-faint/10" />
                  <div className="h-3 w-28 rounded bg-ink-faint/10" />
                </div>
                <div className="hidden h-3 w-24 shrink-0 rounded bg-ink-faint/10 sm:block" />
                <div className="h-3 w-16 shrink-0 rounded bg-ink-faint/10" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
