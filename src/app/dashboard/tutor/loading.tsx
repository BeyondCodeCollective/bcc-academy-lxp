export default function TutorLoading() {
  return (
    <div className="flex h-[calc(100dvh-49px)] sm:h-[calc(100dvh-57px)] flex-col animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <div>
          <div className="h-4 w-20 rounded bg-neutral-200" />
          <div className="mt-2 h-3 w-44 rounded bg-neutral-100" />
        </div>
        <div className="h-7 w-20 rounded-lg bg-neutral-100" />
      </div>

      {/* Welcome message bubble */}
      <div className="flex-1 overflow-hidden px-5 py-6">
        <div className="mx-auto max-w-xl">
          <div className="flex justify-start">
            <div className="max-w-[85%] space-y-2 rounded-2xl bg-neutral-100 px-4 py-3">
              <div className="h-3 w-64 rounded bg-neutral-200" />
              <div className="h-3 w-56 rounded bg-neutral-200" />
              <div className="h-3 w-40 rounded bg-neutral-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-neutral-200 px-5 py-4">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <div className="h-[46px] flex-1 rounded-lg bg-neutral-100" />
          <div className="h-[46px] w-[46px] shrink-0 rounded-lg bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
