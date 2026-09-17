"use client";

import { useLinkStatus } from "next/link";

// Renders a small spinner inside its parent Link only while the route
// transition is pending.
//
// Next's own guidance for slow networks (linking-and-navigating docs, "Slow
// networks"): when prefetching hasn't finished, the loading.tsx fallback does
// NOT appear on click, so the page sits inert until the server responds and
// the click reads as ignored. Admin tab links have it worse — they only change
// ?tab= on the same route, so the loading boundary never re-opens at all.
export function LinkPending({
  tone = "ink",
  className = "",
}: {
  /** "inverse" for spinners on dark surfaces. */
  tone?: "ink" | "inverse";
  className?: string;
}) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  const ring =
    tone === "inverse"
      ? "border-white/30 border-t-white/90"
      : "border-ink/20 border-t-ink/70";
  return (
    <span
      aria-hidden
      className={`ml-2 inline-block h-3 w-3 shrink-0 animate-spin rounded-full border ${ring} ${className}`}
    />
  );
}
