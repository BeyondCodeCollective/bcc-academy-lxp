// Neutral admin fallback — used for the admin home AND its sub-routes (invites,
// programs, surveys, landing, allowlist…). Header + a generic row list: most
// admin pages are lists/tables, so this reads right without the admin-home-only
// "quick-tool strip" that made it look wrong on every sub-page.
export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl space-y-6 px-4 sm:px-5 py-8 animate-pulse">
      {/* Header — title + subtitle, optional action chips */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="h-8 w-40 rounded bg-paper-tint" />
          <div className="mt-2.5 h-3 w-72 max-w-full rounded bg-paper-tint" />
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <div className="h-8 w-28 rounded bg-paper-tint" />
          <div className="h-8 w-16 rounded bg-paper-tint" />
        </div>
      </div>

      {/* Generic row list */}
      <div className="divide-y divide-rule overflow-hidden panel">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-paper-tint" />
            <div className="min-w-0 flex-1">
              <div className="h-3.5 w-40 max-w-full rounded bg-paper-tint" />
              <div className="mt-1.5 h-2.5 w-24 rounded bg-paper-tint" />
            </div>
            <div className="hidden h-2.5 w-20 rounded bg-paper-tint sm:block" />
            <div className="h-2.5 w-16 rounded bg-paper-tint" />
          </div>
        ))}
      </div>
    </div>
  );
}
