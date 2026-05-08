export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 sm:space-y-10 px-4 sm:px-5 py-8 animate-pulse">
      <div>
        <div className="h-7 w-48 rounded bg-neutral-200" />
        <div className="mt-2 h-4 w-72 rounded bg-neutral-100" />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="h-4 w-24 rounded bg-neutral-200" />
            <div className="mt-1 h-3 w-16 rounded bg-neutral-100" />
          </div>
          <div className="h-7 w-10 rounded bg-neutral-200" />
        </div>
        <div className="h-2 w-full rounded-full bg-neutral-100" />
      </div>

      <div>
        <div className="h-5 w-36 rounded bg-neutral-200 mb-4" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center rounded-xl border border-neutral-100 bg-neutral-50 p-3 sm:p-5"
            >
              <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-neutral-200" />
              <div className="mt-2 h-3 w-16 rounded bg-neutral-200" />
              <div className="mt-1 h-2 w-10 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

