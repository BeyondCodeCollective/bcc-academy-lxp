"use client";

import { useEffect } from "react";

// Admin-scoped boundary: keeps the admin shell and sends people back to the
// admin home, not the learner dashboard the parent boundary points at.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin-error]", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-faint mb-4">
          Something went wrong
        </p>
        <h1 className="text-2xl font-bold text-ink mb-3">This admin page hit a snag</h1>
        <p className="text-sm text-ink-soft mb-6 leading-relaxed">
          Nothing you saved was lost. Try again, and if it keeps happening, send the
          reference below to the platform team.
        </p>
        {error.digest && (
          <p className="mb-6 font-mono text-xs text-ink-faint">Ref {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-ink-soft"
          >
            Try again
          </button>
          <a
            href="/dashboard/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-rule px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-tint"
          >
            Back to admin
          </a>
        </div>
      </div>
    </div>
  );
}
