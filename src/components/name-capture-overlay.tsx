"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck } from "lucide-react";
import { completeOnboarding } from "@/app/dashboard/actions";
import { Field, fieldInput, buttonClass } from "@/components/ui";
import type { WelcomeSummary } from "@/lib/onboarding/welcome";

/**
 * Blocking one-step name capture for learner accounts created from an email
 * alone (bulk invites, Eventbrite claims). The name feeds the certificate and
 * the Zoom join, so unlike the welcome modal this one has no dismiss — it's a
 * single field pair and it never shows again once saved.
 *
 * When we know the learner's course, a welcome step comes first: they hear what
 * they're enrolled in and when it happens before being asked for anything.
 */
const emptySubscribe = () => () => {};

export function NameCaptureOverlay({
  campMode,
  welcome = null,
}: {
  campMode: boolean;
  welcome?: WelcomeSummary | null;
}) {
  const [step, setStep] = useState<"welcome" | "name">(welcome ? "welcome" : "name");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
    setSaving(true);
    setError(null);
    try {
      await completeOnboarding({ first_name: first, last_name: last });
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
