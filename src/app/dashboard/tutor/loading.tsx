export default function TutorLoading() {
  return (
    <div className="flex h-[calc(100dvh-var(--nav-height,49px))] flex-col animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rule px-5 py-4">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-ink-faint/10" />
          <div className="h-3 w-40 rounded bg-ink-faint/10" />
        </div>
        <div className="h-7 w-20 rounded bg-ink-faint/10" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="h-16 w-3/4 rounded-lg bg-ink-faint/10" />
          <div className="ml-auto h-12 w-1/2 rounded-lg bg-ink-faint/10" />
          <div className="h-20 w-5/6 rounded-lg bg-ink-faint/10" />
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-rule px-5 py-4">
        <div className="mx-auto h-10 max-w-xl rounded-lg bg-ink-faint/10" />
      </div>
    </div>
  );
}
