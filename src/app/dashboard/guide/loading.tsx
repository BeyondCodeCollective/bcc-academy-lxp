export default function GuideLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 animate-pulse">
      <div className="space-y-8">
        {/* Page heading */}
        <div>
          <div className="h-7 w-48 rounded bg-neutral-200" />
          <div className="mt-2 h-3 w-72 rounded bg-neutral-100" />
        </div>

        {/* Guide sections — rounded white cards with icon + title + body */}
        {Array.from({ length: 5 }).map((_, s) => (
          <div
            key={s}
            className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-neutral-200" />
              <div className="h-5 w-2/3 rounded bg-neutral-200" />
            </div>
            <div className="space-y-2 pl-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 rounded bg-neutral-100 ${
                    i === 0 ? "w-full" : i === 3 ? "w-1/2" : "w-5/6"
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
