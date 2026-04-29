export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-5 py-8 animate-pulse">
      {/* "Admin Panel" title */}
      <div className="mb-6 h-8 w-36 rounded bg-neutral-200" />

      {/* Mobile tab bar (visible < md) */}
      <div className="mb-6 flex gap-1 rounded-lg bg-neutral-100 p-1 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-11 flex-1 rounded-md bg-neutral-200" />
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:gap-6">
        {/* Desktop sidebar (hidden on mobile) */}
        <div className="hidden md:flex md:w-52 md:shrink-0 md:flex-col md:gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-neutral-100" />
          ))}
        </div>

        {/* Content area */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Card 1 */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="mb-4 h-4 w-32 rounded bg-neutral-200" />
            <div className="space-y-3">
              <div className="h-9 w-full rounded-lg bg-neutral-100" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-9 rounded-lg bg-neutral-100" />
                <div className="h-9 rounded-lg bg-neutral-100" />
              </div>
              <div className="h-9 w-32 rounded-lg bg-neutral-200" />
            </div>
          </div>

          {/* Card 2 — quick stats */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="mb-4 h-4 w-24 rounded bg-neutral-200" />
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-7 w-10 rounded bg-neutral-200" />
                  <div className="h-3 w-20 rounded bg-neutral-100" />
                </div>
              ))}
            </div>
          </div>

          {/* Card 3 — survey rows */}
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-4 w-36 rounded bg-neutral-200" />
                  <div className="h-3 w-20 rounded bg-neutral-100" />
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
