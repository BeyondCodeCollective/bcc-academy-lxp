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
    "font-display text-[clamp(2.25rem,5vw,3.25rem)] font-bold uppercase leading-[0.86] tracking-tight";

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
        Welcome
        <br />
        back.
      </h2>
      <CentralLoginForm compact programs={programs} />
      <p className="border-t border-white/10 pt-5 text-sm text-white/50">
        New to BCC?{" "}
        <button
          type="button"
          onClick={() => setMode("join")}
          className="font-semibold text-electric-green underline-offset-4 outline-none transition-colors hover:underline focus-visible:underline"
        >
          Join our newsletter &rarr;
        </button>
      </p>
    </div>
  );
}
