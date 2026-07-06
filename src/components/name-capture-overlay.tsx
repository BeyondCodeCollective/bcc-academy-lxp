"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck } from "lucide-react";
import { completeOnboarding } from "@/app/dashboard/actions";
import { Field, fieldInput, buttonClass } from "@/components/ui";

/**
 * Blocking one-step name capture for learner accounts created from an email
 * alone (bulk invites, Eventbrite claims). The name feeds the certificate and
 * the Zoom join, so unlike the welcome modal this one has no dismiss — it's a
 * single field pair and it never shows again once saved.
 */
const emptySubscribe = () => () => {};

export function NameCaptureOverlay({ campMode }: { campMode: boolean }) {
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
