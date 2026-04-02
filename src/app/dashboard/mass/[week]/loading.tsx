export default function MassWeekLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 animate-pulse">
      {/* Back link */}
      <div className="h-4 w-32 rounded bg-neutral-200 mb-5" />

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-neutral-200" />
        <div className="flex-1">
          <div className="h-3 w-40 rounded bg-neutral-200" />
          <div className="mt-2 h-6 w-64 rounded bg-neutral-200" />
        </div>
      </div>

      {/* Session card */}
      <div className="mb-6 rounded-xl border-2 border-neutral-200 bg-white p-4 sm:p-6">
        <div className="h-3 w-16 rounded bg-neutral-200 mb-4" />
        <div className="flex items-center gap-3.5">
          <div className="h-8 w-8 rounded-full bg-neutral-200" />
          <div className="flex-1">
            <div className="h-4 w-48 rounded bg-neutral-200" />
            <div className="mt-1.5 h-3 w-36 rounded bg-neutral-100" />
          </div>
          <div className="h-10 w-28 rounded-lg bg-neutral-200" />
        </div>
      </div>

      {/* Description */}
      <div className="mb-6 space-y-2 px-1">
        <div className="h-3 w-full rounded bg-neutral-100" />
        <div className="h-3 w-5/6 rounded bg-neutral-100" />
        <div className="h-3 w-4/6 rounded bg-neutral-100" />
      </div>

      {/* Objectives */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="h-3 w-32 rounded bg-neutral-200 mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 w-full rounded bg-neutral-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
