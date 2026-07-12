"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard-error]", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-faint mb-4">
          Something went wrong
        </p>
        <h1 className="text-2xl font-bold text-ink mb-3">
          We hit a snag
        </h1>
        <p className="text-sm text-ink-soft mb-6 leading-relaxed">
          This page couldn&apos;t load. Try again — it&apos;s usually
          temporary.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-ink-soft"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-rule px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-tint"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}