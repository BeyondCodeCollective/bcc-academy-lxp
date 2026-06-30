"use client";

import { useState } from "react";
import { CentralLoginForm } from "@/components/central-login-form";
import { LearnMoreForm } from "@/components/learn-more-form";

/**
 * Homepage entry. Sign-in is the default and primary action (the portal's main
 * job); newcomers reach the newsletter via a plain text link — the familiar
 * "sign in / create account" pattern, not a toggle people have to decode.
 */
export function ApexEntry({
  programs,
}: {
  programs: { slug: string; name: string; defaultTrack: string | null }[];
}) {
  const [mode, setMode] = useState<"signin" | "join">("signin");

  const headingCls =
    "font-display text-[clamp(1.75rem,4.5vw,3.25rem)] font-bold uppercase leading-[0.9] tracking-tight";

  if (mode === "join") {
    return (
      <div className="w-full max-w-sm space-y-5">
        <h2 className={headingCls}>
          Stay in
          <br />
          the loop.
        </h2>
        <p className="text-sm text-white/55">
          Programs, events, and ways to get involved — straight to your inbox.
        </p>
        <LearnMoreForm />
        <button
          type="button"
          onClick={() => setMode("signin")}
          className="text-sm text-white/45 outline-none transition-colors hover:text-white focus-visible:text-white"
        >
          <span aria-hidden>&larr;</span> Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-5">
      <h2 className={headingCls}>
        Continue
        <br />
        learning.
      </h2>
      <CentralLoginForm compact programs={programs} />

      <div className="space-y-4 pt-1">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" aria-hidden />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            New to BCC?
          </span>
          <span className="h-px flex-1 bg-white/10" aria-hidden />
        </div>
        <button
          type="button"
          onClick={() => setMode("join")}
          className="w-full border border-white/20 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white/80 outline-none transition-colors hover:border-white/45 hover:bg-white/[0.04] hover:text-white focus-visible:border-white/45 focus-visible:text-white"
        >
          Join our newsletter &rarr;
        </button>
      </div>
    </div>
  );
}
