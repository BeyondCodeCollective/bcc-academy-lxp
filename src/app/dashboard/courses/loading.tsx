// Mirrors the Courses catalog: header + program sections, each a label over a
// 1/2/3-column card grid — so the skeleton matches the real 3-column layout
// (the inherited /dashboard skeleton was a 2-column learner-home shell).
export default function CoursesLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 space-y-10 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-8 w-32 rounded bg-paper-tint" />
        <div className="mt-2.5 h-3 w-80 max-w-full rounded bg-paper-tint" />
      </div>

      {/* Program sections */}
      {Array.from({ length: 2 }).map((_, s) => (
        <div key={s} className="space-y-4">
          <div className="h-3 w-40 rounded bg-paper-tint" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="panel p-5 shadow-sm">
                <div className="h-2.5 w-20 rounded bg-paper-tint" />
                <div className="mt-3 h-4 w-3/4 rounded bg-paper-tint" />
                <div className="mt-2 h-3 w-1/2 rounded bg-paper-tint" />
                <div className="mt-5 h-2.5 w-24 rounded bg-paper-tint" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
