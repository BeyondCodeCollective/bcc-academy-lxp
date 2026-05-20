"use client";

import { useState, useEffect } from "react";
import { X, Monitor } from "lucide-react";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";

interface Props {
  firstName: string;
  program: ProgramConfig;
  visibleTracks?: TrackConfig[];
}

export function WelcomeOverlay({ firstName, program, visibleTracks }: Props) {
  const tracks = visibleTracks ?? program.tracks;
  const storageKey = `${program.slug}-welcome-seen`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setVisible(true);
    }
  }, [storageKey]);

  function dismiss() {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!visible) return null;
  if (tracks.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md bg-white p-6 sm:p-8 shadow-2xl animate-[fadeIn_0.3s_ease-out]">
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center bg-neutral-900 mb-4">
            <Monitor size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">
            Welcome to {program.name}, {firstName}!
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Here&apos;s what you&apos;re signed up for.
          </p>
        </div>

        {/* Tracks */}
        <div className="space-y-3 mb-6">
          {tracks.map((track) => (
            <div key={track.slug} className="flex gap-3 border border-rule bg-surface-soft p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-neutral-900 text-lg">
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

        {/* Quick tips */}
        <div className="space-y-2 mb-6 text-xs text-neutral-600">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 bg-neutral-400" />
            <span>Tap any week card to see details, objectives, and join your session</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 bg-neutral-400" />
            <span>Visit <strong>Resources</strong> for instructor contacts and study materials</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 bg-neutral-400" />
            <span>Session recordings appear on each week&apos;s page after class</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={dismiss}
          className="w-full bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 active:bg-neutral-700"
        >
          Let&apos;s Go
        </button>
      </div>
    </div>
  );
}
