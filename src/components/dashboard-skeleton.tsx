function TrackSkeleton({ weeks = 8 }: { weeks?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="h-5 w-40 rounded bg-neutral-200" />
        <div className="h-5 w-14 rounded-full bg-neutral-100" />
      </div>
      <div className="h-3 w-52 rounded bg-neutral-100 mb-4" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: weeks }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center border border-neutral-100 bg-neutral-50 p-3 sm:p-5"
          >
            <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-neutral-200" />
            <div className="mt-2 h-3 w-16 rounded bg-neutral-200" />
            <div className="mt-1 h-2 w-10 rounded bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 sm:space-y-10 px-4 sm:px-5 py-8 animate-pulse">
      {/* Welcome heading + cohort */}
      <div>
        <div className="h-7 w-48 rounded bg-neutral-200" />
        <div className="mt-2 h-4 w-32 rounded bg-neutral-100" />
      </div>

      {/* Progress bar */}
      <div className="border border-rule bg-surface-elevated p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="h-4 w-24 rounded bg-neutral-200" />
            <div className="mt-1 h-3 w-16 rounded bg-neutral-100" />
          </div>
          <div className="h-7 w-10 rounded bg-neutral-200" />
        </div>
        <div className="h-2 w-full rounded-full bg-neutral-100" />
      </div>

      {/* Track grids — two tracks matches ATG (MASS + Tech+) */}
      <TrackSkeleton weeks={8} />
      <TrackSkeleton weeks={8} />
    </div>
  );
}

