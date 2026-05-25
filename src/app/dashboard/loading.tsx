export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 animate-pulse">
      <div className="h-8 w-48 rounded bg-ink-faint/10 mb-6" />
      <div className="h-3 w-72 rounded bg-ink-faint/10 mb-8" />
      <div className="space-y-3">
        <div className="h-24 rounded bg-ink-faint/10" />
        <div className="h-24 rounded bg-ink-faint/10" />
        <div className="h-24 rounded bg-ink-faint/10" />
      </div>
    </div>
  );
}
