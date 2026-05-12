export default function StartLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-12 md:py-16 animate-pulse">
      {/* Eyebrow + heading + lede */}
      <header className="mb-12 md:mb-14">
        <div className="h-3 w-24 rounded bg-rule mb-3" />
        <div className="h-10 md:h-12 w-3/4 rounded bg-paper-tint" />
        <div className="mt-2 h-10 md:h-12 w-2/3 rounded bg-paper-tint" />
        <div className="mt-5 h-4 w-full max-w-2xl rounded bg-rule-soft" />
        <div className="mt-2 h-4 w-5/6 max-w-2xl rounded bg-rule-soft" />
      </header>

      <div className="space-y-12">
        {/* Cohort facts — 2-col dl */}
        <section>
          <div className="h-3 w-20 rounded bg-rule mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 w-16 rounded bg-rule mb-2" />
                <div className="h-4 w-3/4 rounded bg-paper-tint" />
              </div>
            ))}
          </div>
        </section>

        {/* Weekly rhythm — paragraph + ledger of tracks */}
        <section>
          <div className="h-3 w-28 rounded bg-rule mb-4" />
          <div className="h-4 w-full max-w-xl rounded bg-rule-soft mb-2" />
          <div className="h-4 w-4/5 max-w-xl rounded bg-rule-soft mb-5" />
          <div className="border-y border-rule">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`grid grid-cols-[auto_1fr_auto] items-baseline gap-x-6 px-1 py-3 ${
                  i > 0 ? "border-t border-rule-soft" : ""
                }`}
              >
                <div className="h-3 w-5 rounded bg-rule mx-2" />
                <div className="h-4 w-1/2 rounded bg-paper-tint" />
                <div className="h-3 w-16 rounded bg-rule-soft" />
              </div>
            ))}
          </div>
        </section>

        {/* How to use the platform — ledger rows */}
        <section>
          <div className="h-3 w-44 rounded bg-rule mb-4" />
          <div className="border-y border-rule">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`grid grid-cols-[auto_1fr_auto] items-baseline gap-x-6 px-1 py-4 ${
                  i > 0 ? "border-t border-rule-soft" : ""
                }`}
              >
                <div className="h-4 w-20 rounded bg-paper-tint" />
                <div className="space-y-2">
                  <div className="h-3 w-full max-w-md rounded bg-rule-soft" />
                  <div className="h-3 w-2/3 max-w-sm rounded bg-rule-soft" />
                </div>
                <div className="h-3 w-3 rounded bg-rule" />
              </div>
            ))}
          </div>
        </section>

        {/* What we expect — numbered list */}
        <section>
          <div className="h-3 w-40 rounded bg-rule mb-4" />
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex gap-3">
                <div className="h-4 w-5 shrink-0 rounded bg-rule" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full max-w-lg rounded bg-rule-soft" />
                  <div className="h-4 w-3/4 max-w-md rounded bg-rule-soft" />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Stuck or need help — short paragraph */}
        <section>
          <div className="h-3 w-32 rounded bg-rule mb-4" />
          <div className="space-y-2">
            <div className="h-4 w-full max-w-xl rounded bg-rule-soft" />
            <div className="h-4 w-3/4 max-w-lg rounded bg-rule-soft" />
          </div>
        </section>

        {/* CTA pill */}
        <div className="pt-4">
          <div className="h-10 w-56 rounded-full bg-paper-tint" />
        </div>
      </div>
    </div>
  );
}
