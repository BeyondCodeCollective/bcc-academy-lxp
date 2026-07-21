"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { MapPin } from "lucide-react";
import { completeProfile } from "@/app/dashboard/actions";
import { Field, fieldInput, buttonClass } from "@/components/ui";

/**
 * One-time learner profile capture for ZIP + birthday. These feed grant
 * reporting and were historically only collected in some intake surveys, so
 * learners who joined another way never had them. Shown once, when either field
 * is missing (gated in the dashboard layout); never to staff, and never to the
 * Forte Bahamas program, where a US ZIP doesn't apply.
 *
 * Unlike the name overlay this is dismissible — a learner mid-session shouldn't
 * be hard-blocked over a demographic field — but it re-appears next login until
 * filled, and the "why" is stated plainly.
 */
const emptySubscribe = () => () => {};

export function ProfileCaptureOverlay({
  needsZip,
  needsDob,
}: {
  needsZip: boolean;
  needsDob: boolean;
}) {
  const [zip, setZip] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (dismissed) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [dismissed]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const z = zip.replace(/\D/g, "").slice(0, 5);
    if (needsZip && !/^\d{5}$/.test(z)) {
      setError("Please enter a 5-digit ZIP code.");
      return;
    }
    if (needsDob && !dob) {
      setError("Please enter your date of birth.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await completeProfile({
        zip: needsZip ? z : undefined,
        date_of_birth: needsDob ? dob : undefined,
      });
      window.location.reload();
    } catch {
      setError("Couldn't save right now — please try again.");
      setSaving(false);
    }
  }

  if (!mounted || dismissed) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-capture-title"
        className="w-full max-w-md animate-[fadeIn_0.3s_ease-out] bg-white shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-ink">
              <MapPin size={28} className="text-white" />
            </div>
            <h2 id="profile-capture-title" className="text-xl font-bold text-ink">
              A couple quick details
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              We use this for the reports that keep our programs funded and free.
              It only takes a moment.
            </p>
          </div>

          <div className="mb-6 space-y-4">
            {needsZip && (
              <Field label="ZIP code">
                <input
                  type="text"
                  inputMode="numeric"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  maxLength={10}
                  autoComplete="postal-code"
                  autoFocus
                  placeholder="e.g. 30318"
                  className={fieldInput}
                />
              </Field>
            )}
            {needsDob && (
              <Field label="Date of birth">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  autoComplete="bday"
                  className={fieldInput}
                />
              </Field>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`${buttonClass("primary", "md")} w-full`}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="mt-2 w-full py-1 text-center text-xs text-ink-soft transition-colors hover:text-ink"
          >
            Not now
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
