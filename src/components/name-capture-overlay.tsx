"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck } from "lucide-react";
import { completeOnboarding, completeProfile } from "@/app/dashboard/actions";
import { Field, fieldInput, buttonClass } from "@/components/ui";
import type { WelcomeSummary } from "@/lib/onboarding/welcome";
import { snoozeProfilePrompt } from "@/lib/onboarding/profile-snooze";

/**
 * Blocking one-step name capture for learner accounts created from an email
 * alone (bulk invites, Eventbrite claims). The name feeds the certificate and
 * the Zoom join, so unlike the welcome modal this one has no dismiss — it's a
 * single field pair and it never shows again once saved.
 *
 * When we know the learner's course, a welcome step comes first: they hear what
 * they're enrolled in and when it happens before being asked for anything.
 *
 * A learner who also lacks a ZIP or birthday gets those as optional fields in
 * the same step, so they answer one prompt instead of two back to back. Leaving
 * them blank snoozes the standalone prompt for a week rather than showing it
 * the moment this one closes.
 */
const emptySubscribe = () => () => {};

export function NameCaptureOverlay({
  campMode,
  welcome = null,
  needsZip = false,
  needsDob = false,
}: {
  campMode: boolean;
  welcome?: WelcomeSummary | null;
  needsZip?: boolean;
  needsDob?: boolean;
}) {
  const [step, setStep] = useState<"welcome" | "name">(welcome ? "welcome" : "name");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [zip, setZip] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Portals need the browser — false during SSR, true after hydration.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      setError("Please enter both a first and last name.");
      return;
    }
    const z = zip.replace(/\D/g, "").slice(0, 5);
    if (needsZip && zip.trim() && z.length !== 5) {
      setError("ZIP code should be 5 digits, or leave it blank.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await completeOnboarding({ first_name: first, last_name: last });
      // Optional extras: save what was given; if anything is still missing,
      // snooze the standalone prompt so it doesn't greet them right after.
      const gaveZip = needsZip && z.length === 5;
      const gaveDob = needsDob && !!dob;
      if (gaveZip || gaveDob) {
        await completeProfile({
          zip: gaveZip ? z : undefined,
          date_of_birth: gaveDob ? dob : undefined,
        }).catch(() => {});
      }
      if ((needsZip && !gaveZip) || (needsDob && !gaveDob)) snoozeProfilePrompt();
      setDone(true);
      // Full reload, not router.refresh(): the soft refresh doesn't reliably
      // repaint the top-bar avatar, and a save that produces no visible
      // change reads as a failure. This modal runs once per account — pay
      // the reload.
      window.location.reload();
    } catch {
      setError("Couldn't save right now — please try again.");
      setSaving(false);
    }
  }

  if (!mounted || done) return null;

  if (step === "welcome" && welcome) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
          className="w-full max-w-md animate-[fadeIn_0.3s_ease-out] bg-white shadow-2xl"
        >
          <div className="p-6 sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
              Welcome
            </p>
            <h2 id="welcome-title" className="mt-3 text-2xl font-bold leading-tight text-ink">
              You&apos;re enrolled in {welcome.course}
            </h2>
            {welcome.instructor && (
              <p className="mt-2 text-sm text-ink-soft">Led by {welcome.instructor}</p>
            )}
            {welcome.whenLine && (
              <p className="mt-4 text-base text-ink">{welcome.whenLine}</p>
            )}
            {welcome.alsoEnrolled > 0 && (
              <p className="mt-2 text-sm text-ink-soft">
                You&apos;re also enrolled in {welcome.alsoEnrolled} other{" "}
                {welcome.alsoEnrolled === 1 ? "course" : "courses"}.
              </p>
            )}
            <p className="mt-6 text-sm text-ink-soft">
              First, tell us your name so it&apos;s right in class and on your certificate.
            </p>
            <button
              type="button"
              onClick={() => setStep("name")}
              className={`${buttonClass("primary", "md")} mt-4 w-full`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-capture-title"
        className="w-full max-w-md animate-[fadeIn_0.3s_ease-out] bg-white shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-ink">
              <BadgeCheck size={28} className="text-white" />
            </div>
            <h2 id="name-capture-title" className="text-xl font-bold text-ink">
              {campMode ? "Who's attending camp?" : "What's your name?"}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {campMode
                ? "Enter the camper's first and last name — this is how it will appear in class and on her certificate."
                : "This is how your name will appear in class and on your certificate."}
            </p>
          </div>

          <div className="mb-6 space-y-4">
            <Field label="First name">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={60}
                autoComplete="given-name"
                autoFocus
                className={fieldInput}
              />
            </Field>
            <Field label="Last name">
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={60}
                autoComplete="family-name"
                className={fieldInput}
              />
            </Field>
            {(needsZip || needsDob) && (
              <div className="space-y-4 border-t border-rule pt-4">
                <p className="text-xs text-ink-soft">
                  Optional. We use these for the reports that keep our programs funded and free.
                </p>
                {needsZip && (
                  <Field label="ZIP code (optional)">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      maxLength={10}
                      autoComplete="postal-code"
                      placeholder="e.g. 30318"
                      className={fieldInput}
                    />
                  </Field>
                )}
                {needsDob && (
                  <Field label="Date of birth (optional)">
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      autoComplete="bday"
                      className={fieldInput}
                    />
                  </Field>
                )}
              </div>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`${buttonClass("primary", "md")} w-full`}
          >
            {saving ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
