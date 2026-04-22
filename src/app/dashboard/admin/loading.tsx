export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-7 w-40 rounded bg-neutral-200" />
        <div className="mt-2 h-4 w-64 rounded bg-neutral-100" />
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-2 border-b border-neutral-200 pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-t bg-neutral-100" />
        ))}
      </div>

      {/* Stat cards row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 bg-white p-4"
          >
            <div className="h-3 w-20 rounded bg-neutral-100" />
            <div className="mt-3 h-6 w-12 rounded bg-neutral-200" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-4 h-4 w-32 rounded bg-neutral-200" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-neutral-100" />
              <div className="flex-1">
                <div className="h-3 w-40 rounded bg-neutral-200" />
                <div className="mt-1.5 h-3 w-56 rounded bg-neutral-100" />
              </div>
              <div className="h-6 w-16 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
