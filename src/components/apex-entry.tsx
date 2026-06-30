"use client";

import { useState } from "react";
import { CentralLoginForm } from "@/components/central-login-form";
import { LearnMoreForm } from "@/components/learn-more-form";

type Mode = "choose" | "student" | "new";

/**
 * Homepage entry. Rather than show a sign-in form AND a newsletter form side by
 * side (which made visitors mis-pick), present two buttons and reveal only the
 * form that matches their intent. One decision, then one form.
 */
export function ApexEntry({
  programs,
}: {
  programs: { slug: string; name: string; defaultTrack: string | null }[];
}) {
  const [mode, setMode] = useState<Mode>("choose");

  if (mode !== "choose") {
    const isStudent = mode === "student";
    return (
      <div className="w-full max-w-sm space-y-5">
        <button
          type="button"
          onClick={() => setMode("choose")}
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.15em] text-neutral-400 transition-colors hover:text-white"
        >
          <span aria-hidden>&larr;</span> Back
        </button>

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-electric-green">
            {isStudent ? "I'm a student" : "New here?"}
          </p>
          <p className="mt-1 font-display text-xl font-bold text-white">
            {isStudent ? "Sign in to your dashboard" : "Sign up for our newsletter"}
          </p>
          <p className="mt-1 text-sm text-neutral-300">
            {isStudent
              ? "Enter your email — we'll send you a sign-in link."
              : "Programs, events, and ways to get involved."}
          </p>
        </div>

        {isStudent ? (
          <CentralLoginForm compact programs={programs} />
        ) : (
          <LearnMoreForm />
        )}
      </div>
    );
  }

  return (
    <div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => setMode("student")}
        className="group flex flex-col gap-1.5 rounded-2xl border border-white/20 bg-white/5 p-6 text-left backdrop-blur transition-colors hover:border-electric-green"
      >
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-electric-green">
          I&apos;m a student
        </span>
        <span className="font-display text-lg font-bold text-white">Sign in</span>
        <span className="inline-flex items-center text-sm text-neutral-300 transition-colors group-hover:text-white">
          Get to your dashboard
          <span className="ml-2 transition-transform group-hover:translate-x-1" aria-hidden>
            &rarr;
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => setMode("new")}
        className="group flex flex-col gap-1.5 rounded-2xl border border-white/20 bg-white/5 p-6 text-left backdrop-blur transition-colors hover:border-electric-green"
      >
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-electric-green">
          I&apos;m new here
        </span>
        <span className="font-display text-lg font-bold text-white">Get started</span>
        <span className="inline-flex items-center text-sm text-neutral-300 transition-colors group-hover:text-white">
          Programs &amp; newsletter
          <span className="ml-2 transition-transform group-hover:translate-x-1" aria-hidden>
            &rarr;
          </span>
        </span>
      </button>
    </div>
  );
}
