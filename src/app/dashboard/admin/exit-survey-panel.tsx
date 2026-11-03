"use client";

import { useState } from "react";
import Link from "next/link";
import { saveTrackOverview } from "./actions";

/** Turns the per-session exit survey on or off for one course. */
export function ExitSurveyPanel({
  trackSlug,
  programSlug,
  initialEnabled,
}: {
  trackSlug: string;
  programSlug: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState("");

  async function toggle(next: boolean) {
    setEnabled(next);
    setError("");
    try {
      await saveTrackOverview(trackSlug, { exit_survey_enabled: next }, programSlug);
    } catch (e) {
      setEnabled(!next);
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  }

  return (
    <div className="panel-form p-4 sm:p-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          <span className="block text-sm font-medium text-ink">Exit survey after each session</span>
          <span className="mt-0.5 block text-xs text-ink-faint">
            A 1 to 5 rating and &ldquo;What was unclear?&rdquo; under each session&apos;s video, plus a
            hours question before each Monday session after week 1.
          </span>
        </span>
      </label>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {enabled && (
        <Link
          href={`/dashboard/admin/exit-surveys?track=${encodeURIComponent(trackSlug)}`}
          className="mt-3 inline-block text-sm text-ink underline"
        >
          View results
        </Link>
      )}
    </div>
  );
}
