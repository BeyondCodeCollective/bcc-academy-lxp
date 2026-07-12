"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="mx-auto max-w-md text-center">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-faint mb-4">
          Something went wrong
        </p>
        <h1 className="text-2xl font-bold text-ink mb-3">
          We hit a snag
        </h1>
        <p className="text-sm text-ink-soft mb-6 leading-relaxed">
          The page couldn&apos;t load. This is usually temporary — try again
          in a moment.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-ink-soft"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
