export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 animate-pulse">
      {/* Welcome header */}
      <div className="h-9 w-64 rounded bg-ink-faint/10" />
      <div className="mt-3 h-3 w-80 max-w-full rounded bg-ink-faint/10" />

      {/* Your courses */}
      <div className="mt-10 h-5 w-32 rounded bg-ink-faint/10" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="h-40 rounded-lg bg-ink-faint/10" />
        <div className="h-40 rounded-lg bg-ink-faint/10" />
      </div>

      {/* Utilities */}
      <div className="mt-14 grid gap-3 border-t border-rule pt-6 sm:grid-cols-2 sm:gap-4">
        <div className="h-16 rounded-lg bg-ink-faint/10" />
        <div className="h-16 rounded-lg bg-ink-faint/10" />
      </div>
    </div>
  );
}
