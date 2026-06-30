"use client";

import { useState } from "react";
import { CentralLoginForm } from "@/components/central-login-form";
import { LearnMoreForm } from "@/components/learn-more-form";

/**
 * Homepage entry. A segmented toggle picks intent (sign in vs. join the list)
 * and only the matching form shows — no two competing forms, no redirect.
 */
export function ApexEntry({
  programs,
}: {
  programs: { slug: string; name: string; defaultTrack: string | null }[];
}) {
  const [tab, setTab] = useState<"signin" | "join">("signin");

  const seg = (active: boolean) =>
    `rounded-full px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-electric-green ${
      active ? "bg-electric-green text-true-black" : "text-white/45 hover:text-white"
    }`;

  return (
    <div className="w-full max-w-sm">
      <div
        role="tablist"
        aria-label="Sign in or join"
        className="mb-9 inline-flex rounded-full border border-white/12 bg-white/[0.03] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "signin"}
          onClick={() => setTab("signin")}
          className={seg(tab === "signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "join"}
          onClick={() => setTab("join")}
          className={seg(tab === "join")}
        >
          New here
        </button>
      </div>

      {tab === "signin" ? (
        <div className="space-y-5">
          <div>
            <h2 className="font-display text-4xl font-bold uppercase leading-[0.9] tracking-tight sm:text-5xl">
              Welcome back.
            </h2>
            <p className="mt-2 text-sm text-white/55">
              Sign in to pick up right where you left off.
            </p>
          </div>
          <CentralLoginForm compact programs={programs} />
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h2 className="font-display text-4xl font-bold uppercase leading-[0.9] tracking-tight sm:text-5xl">
              Stay in the loop.
            </h2>
            <p className="mt-2 text-sm text-white/55">
              Programs, events, and ways to get involved — straight to your inbox.
            </p>
          </div>
          <LearnMoreForm />
        </div>
      )}
    </div>
  );
}
