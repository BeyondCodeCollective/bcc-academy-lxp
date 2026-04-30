"use client";

import { useState } from "react";
import { completeOnboarding, markWelcomeSeen } from "@/app/dashboard/actions";
import { User, BookOpen, ChevronRight } from "lucide-react";
import type { ProgramConfig, TrackConfig } from "@/lib/programs/types";

interface Props {
  program: ProgramConfig;
  visibleTracks: TrackConfig[];
  hasPendingSurveys?: boolean;
  profileDone?: boolean;
}

export function OnboardingForm({
  program,
  visibleTracks,
  hasPendingSurveys = false,
  profileDone = false,
}: Props) {
  const hasTracks = visibleTracks.length > 0;
  const totalSteps = 1 + (hasTracks ? 1 : 0);

  const [step, setStep] = useState(profileDone ? 2 : 1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const profileComplete = firstName.trim() && lastName.trim();

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profileComplete) return;

    setSaving(true);
    setError("");

    try {
      await completeOnboarding({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      if (hasPendingSurveys) {
        window.location.reload();
        return;
      }
      if (totalSteps > 1) {
        setStep(2);
      } else {
        await markWelcomeSeen();
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish() {
    setSaving(true);
    try {
      await markWelcomeSeen();
    } catch {
      // Non-critical — dashboard will still load
    }
  }

  const currentStepLabel = step === 1 ? "profile" : "orientation";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[90svh] animate-[fadeIn_0.3s_ease-out]">
        <div className="p-6 sm:p-8">
          {/* Progress dots */}
          {totalSteps > 1 && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i + 1 === step
                      ? "w-6 bg-neutral-900"
                      : i + 1 < step
                        ? "w-1.5 bg-neutral-400"
                        : "w-1.5 bg-neutral-200"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Step 1: Profile */}
          {currentStepLabel === "profile" && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 mb-4">
                  <User size={28} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-neutral-900">
                  Let&apos;s get to know you
                </h2>
                <p className="mt-2 text-sm text-neutral-500">
                  What should we call you?
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ob-first" className="mb-1.5 block text-xs font-medium text-neutral-600">
                      First Name
                    </label>
                    <input
                      id="ob-first"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoComplete="off"
                      placeholder="First"
                      className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="ob-last" className="mb-1.5 block text-xs font-medium text-neutral-600">
                      Last Name
                    </label>
                    <input
                      id="ob-last"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      autoComplete="off"
                      placeholder="Last"
                      className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={!profileComplete || saving}
                  className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 active:bg-neutral-700 disabled:opacity-50 mt-2"
                >
                  {saving ? <Spinner /> : totalSteps > 1 ? (
                    <span className="flex items-center justify-center gap-1">
                      Continue <ChevronRight size={16} />
                    </span>
                  ) : "Continue"}
                </button>
              </form>
            </>
          )}

          {/* Step 2: Program Orientation */}
          {currentStepLabel === "orientation" && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 mb-4">
                  <BookOpen size={28} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-neutral-900">
                  Welcome to {program.name}, {firstName}!
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

              <div className="flex gap-3">
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 active:bg-neutral-700 disabled:opacity-50"
                >
                  {saving ? <Spinner /> : "Let's Go"}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
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
