"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { submitExitHours } from "@/app/dashboard/track/exit-survey-actions";
import { buttonClass } from "@/components/ui";
import { HOURS_PROMPT, MAX_HOURS_LENGTH } from "@/lib/exit-survey";

// Sits below the name and profile capture overlays (z-[9999]) so those always
// win and the two never fight over the screen.
export function ExitHoursPopup({
  trackSlug,
  weekNumber,
}: {
  trackSlug: string;
  weekNumber: number;
}) {
  const skipKey = `exit-hours-skip:${trackSlug}:${weekNumber}`;
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(skipKey) !== "1";
    } catch {
      return true;
    }
  });
  const [hours, setHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  function skip() {
    try {
      sessionStorage.setItem(skipKey, "1");
    } catch {
      /* private mode: the popup just returns on the next visit */
    }
    setOpen(false);
  }

  async function save() {
    if (!hours.trim()) {
      setError("Enter a number of hours, or skip for now.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await submitExitHours(trackSlug, weekNumber, hours);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="exit-hours-q" className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6">
        <p id="exit-hours-q" className="text-base font-semibold text-ink">
          {HOURS_PROMPT}
        </p>
        <input
          type="text"
          inputMode="decimal"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          maxLength={MAX_HOURS_LENGTH}
          placeholder="e.g. 3"
          autoFocus
          className="mt-4 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-ink"
        />
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={skip} className={buttonClass("ghost", "sm")}>
            Not now
          </button>
          <button type="button" onClick={save} disabled={saving} className={buttonClass("primary", "sm")}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
