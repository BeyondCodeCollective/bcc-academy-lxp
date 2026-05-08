export default function ResourcesLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-12 md:py-16 animate-pulse">
      {/* Eyebrow + Heading */}
      <header className="mb-12 md:mb-14">
        <div className="h-3 w-20 rounded bg-rule mb-3" />
        <div className="h-10 md:h-12 w-3/4 rounded bg-paper-tint" />
        <div className="mt-5 h-4 w-full max-w-2xl rounded bg-rule-soft" />
        <div className="mt-2 h-4 w-2/3 max-w-xl rounded bg-rule-soft" />
      </header>

      {/* Three sections — each: eyebrow + ledger rows */}
      <div className="space-y-12">
        {Array.from({ length: 3 }).map((_, s) => (
          <section key={s}>
            <div className="h-3 w-24 rounded bg-rule mb-4" />
            <div className="border-y border-rule">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-6 px-1 py-4 ${
                    i > 0 ? "border-t border-rule-soft" : ""
                  }`}
                >
                  <div className="h-3 w-5 rounded bg-rule mx-2" />
                  <div className="h-4 w-1/2 rounded bg-paper-tint" />
                  <div className="h-3 w-20 rounded bg-rule-soft" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
