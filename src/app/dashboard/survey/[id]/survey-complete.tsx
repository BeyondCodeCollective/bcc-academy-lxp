"use client";

import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

export function SurveyComplete({ returning = false }: { returning?: boolean } = {}) {
  // When the survey was opened from an onboarding checklist it carries
  // ?return=<checklist>; send the learner back there, not the generic dashboard.
  const returnTo = useSearchParams().get("return");
  const dest = returnTo && returnTo.startsWith("/dashboard/") ? returnTo : "/dashboard";
  const label = dest === "/dashboard" ? "Back to Dashboard" : "Back to checklist";
  // Full navigation on purpose. Survey pages render the dashboard layout in
  // its stripped "minimal" shell (no sidebar, no left padding), decided from
  // the request path on the server. A soft router.push keeps that layout
  // mounted, so the dashboard/admin home appeared inside the survey chrome —
  // logo-only sidebar, content jammed left, tab labels clipped — until a hard
  // reload (2026-08-17). A real navigation re-renders the layout for the new
  // path.
  const leave = () => {
    window.location.assign(dest);
  };

  return (
    <div className="panel p-8 sm:p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-6">
        <Check size={28} className="text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-ink mb-3">
        {returning ? "You've already answered this one." : "Thank you."}
      </h2>
      <p className="text-sm text-ink-soft max-w-sm mx-auto mb-8">
        {returning
          ? "Your answers are saved — there's nothing left to do here. If something has changed and you want to update them, tell your instructor and we'll reopen it."
          : "What you shared helps us shape the program around what you actually need. We appreciate you taking the time."}
      </p>
      <button
        onClick={leave}
        className="inline-flex items-center gap-2 bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-ink/90 transition-colors"
      >
        {label}
      </button>
    </div>
  );
}
