export default function SurveyLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl py-4 animate-pulse">
      {/* Title block */}
      <div className="mb-4 px-4 sm:px-5">
        <div className="h-7 w-64 rounded bg-neutral-200" />
        <div className="mt-2 h-4 w-80 rounded bg-neutral-100" />
      </div>

      {/* Progress bar */}
      <div className="mb-6 px-4 sm:px-5">
        <div className="h-2 w-full rounded-full bg-neutral-100" />
      </div>

      {/* Question card */}
      <div className="mx-4 sm:mx-5 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="h-3 w-20 rounded bg-neutral-100" />
        <div className="mt-3 h-5 w-5/6 rounded bg-neutral-200" />
        <div className="mt-2 h-5 w-3/6 rounded bg-neutral-200" />

        {/* Answer options */}
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3"
            >
              <div className="h-5 w-5 rounded-full bg-neutral-100" />
              <div className="h-3 w-48 rounded bg-neutral-100" />
            </div>
          ))}
        </div>

        {/* Footer buttons */}
        <div className="mt-6 flex justify-between">
          <div className="h-10 w-20 rounded-lg bg-neutral-100" />
          <div className="h-10 w-24 rounded-lg bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
