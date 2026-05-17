"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { markWelcomeSeen } from "@/app/dashboard/actions";
import { BookOpen, X } from "lucide-react";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";

interface Props {
  program: ProgramConfig;
  visibleTracks: TrackConfig[];
}

export function OnboardingForm({ program, visibleTracks }: Props) {
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Focus the close button on mount so screen readers / keyboard users land
  // in the dialog; Escape closes; click outside the panel closes.
  useEffect(() => {
    if (!mounted) return;
    closeBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleDismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted]);

  async function handleFinish() {
    if (saving) return;
    setSaving(true);
    try {
      await markWelcomeSeen();
    } catch {
      // Non-critical — dashboard will still load
    }
  }

  // Dismiss without acknowledging: closes the modal locally but doesn't
  // persist welcome_seen_at — next visit will show it again. This is
  // intentional; adult learners shouldn't be modal-trapped.
  function handleDismiss() {
    setDismissed(true);
  }

  if (!mounted || dismissed) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[90svh] animate-[fadeIn_0.3s_ease-out]"
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss welcome"
          className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 transition-colors"
        >
          <X size={18} />
        </button>
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 mb-4">
              <BookOpen size={28} className="text-white" />
            </div>
            <h2 id="onboarding-title" className="text-xl font-bold text-neutral-900">
              Welcome to {program.name}
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              Here&apos;s what you&apos;re signed up for.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {visibleTracks.map((track) => (
              <div
                key={track.slug}
                className="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-lg">
                  {track.weekSummaries[0]?.icon ?? "📚"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">{track.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {track.type === "single-event"
                      ? `Single event · ${track.sessionTimes[0] ?? ""} · ${track.instructor}`
                      : `${track.totalWeeks} weeks · ${track.sessionTimes.join(" & ")} · ${track.instructor}`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 mb-6 text-xs text-neutral-600">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
              <span>Tap any week card to see details, objectives, and join your session</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
              <span>Visit <strong>Resources</strong> for instructor contacts and study materials</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
              <span>Session recordings appear on each week&apos;s page after class</span>
            </div>
          </div>

          <button
            onClick={handleFinish}
            disabled={saving}
            className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 active:bg-neutral-700 disabled:opacity-50"
          >
            {saving ? <Spinner /> : "Let's Go"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Saving...
    </span>
  );
}
