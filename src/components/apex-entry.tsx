"use client";

import { useState } from "react";
import { CentralLoginForm } from "@/components/central-login-form";
import { LearnMoreForm } from "@/components/learn-more-form";

/**
 * Homepage entry. Editorial underline tabs pick intent (sign in vs. join the
 * list); only the matching form shows — no two competing forms, no redirect.
 */
export function ApexEntry({
  programs,
}: {
  programs: { slug: string; name: string; defaultTrack: string | null }[];
}) {
  const [tab, setTab] = useState<"signin" | "join">("signin");

  const tabCls = (active: boolean) =>
    `-mb-px border-b-2 pb-3 text-sm font-bold uppercase tracking-[0.14em] outline-none transition-colors focus-visible:text-white ${
      active
        ? "border-electric-green text-white"
        : "border-transparent text-white/35 hover:text-white/70"
    }`;

  return (
    <div className="w-full max-w-sm">
      <div role="tablist" aria-label="Sign in or join" className="mb-9 flex gap-8 border-b border-white/10">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "signin"}
          onClick={() => setTab("signin")}
          className={tabCls(tab === "signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "join"}
          onClick={() => setTab("join")}
          className={tabCls(tab === "join")}
        >
          New here
        </button>
      </div>

      {tab === "signin" ? (
        <div className="space-y-5">
          <h2 className="font-display text-[clamp(2.25rem,5vw,3.25rem)] font-bold uppercase leading-[0.86] tracking-tight">
            Welcome
            <br />
            back.
          </h2>
          <CentralLoginForm compact programs={programs} />
        </div>
      ) : (
        <div className="space-y-5">
          <h2 className="font-display text-[clamp(2.25rem,5vw,3.25rem)] font-bold uppercase leading-[0.86] tracking-tight">
            Stay in
            <br />
            the loop.
          </h2>
          <p className="text-sm text-white/55">
            Programs, events, and ways to get involved — straight to your inbox.
          </p>
          <LearnMoreForm />
        </div>
      )}
    </div>
  );
}
