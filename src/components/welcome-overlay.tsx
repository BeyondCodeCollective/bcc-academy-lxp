"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "atg-welcome-seen";

interface Props {
  firstName: string;
}

export function WelcomeOverlay({ firstName }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl animate-[fadeIn_0.3s_ease-out]">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-2xl mb-4">
            🏈
          </div>
          <h2 className="text-xl font-bold text-neutral-900">
            Welcome to After The Game, {firstName}!
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Your portal for Cohort 1. Here&apos;s what you&apos;re signed up for.
          </p>
        </div>

        {/* Two tracks */}
        <div className="space-y-3 mb-6">
          {/* MASS */}
          <div className="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-lg">
              🎙️
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900">MASS Wraparound</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                8 weeks &middot; Wednesdays 10–11am ET &middot; Angel Aviles
              </p>
            </div>
          </div>

          {/* Tech+ */}
          <div className="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-lg">
              💻
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900">CompTIA Tech+ Foundations</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                7 weeks &middot; Wed &amp; Fri 10am–12pm ET &middot; Kobie Joyner
              </p>
            </div>
          </div>
        </div>

        {/* Quick tips */}
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

        {/* CTA */}
        <button
          onClick={dismiss}
          className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 active:bg-neutral-700"
        >
          Let&apos;s Go
        </button>
      </div>
    </div>
  );
}
