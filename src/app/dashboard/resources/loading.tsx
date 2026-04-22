export default function ResourcesLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-7 w-36 rounded bg-neutral-200" />
        <div className="mt-2 h-4 w-72 rounded bg-neutral-100" />
      </div>

      {/* Section heading */}
      <div className="mb-4 h-4 w-28 rounded bg-neutral-200" />

      {/* Resource cards */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4"
          >
            <div className="h-10 w-10 shrink-0 rounded-lg bg-neutral-100" />
            <div className="flex-1">
              <div className="h-4 w-44 rounded bg-neutral-200" />
              <div className="mt-2 h-3 w-full rounded bg-neutral-100" />
              <div className="mt-1.5 h-3 w-4/6 rounded bg-neutral-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
