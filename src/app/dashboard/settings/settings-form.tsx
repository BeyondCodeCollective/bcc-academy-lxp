"use client";

import { useState, useTransition } from "react";
import { Link as LinkIcon, Check } from "@phosphor-icons/react";
import { Panel } from "@/components/ui";
import { updateNotificationPreferences } from "./actions";

type Prefs = { announcements: boolean; feedback: boolean };

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
          checked ? "bg-primary" : "bg-rule"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsForm({
  initialPrefs,
  calendarUrl,
}: {
  initialPrefs: Prefs;
  calendarUrl: string;
}) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const save = (next: Prefs) => {
    setPrefs(next); // optimistic
    startTransition(async () => {
      try {
        await updateNotificationPreferences(next);
      } catch {
        setPrefs((p) => ({ ...p })); // best-effort; leave UI as-is on failure
      }
    });
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          Email notifications
        </h2>
        <Panel className="px-4">
          <div className="divide-y divide-rule-soft">
            <Toggle
              label="New announcements"
              description="Get an email when your instructor posts an announcement to one of your courses."
              checked={prefs.announcements}
              onChange={(v) => save({ ...prefs, announcements: v })}
            />
            <Toggle
              label="Instructor feedback on my work"
              description="Get an email when an instructor leaves feedback on a submission or reflection."
              checked={prefs.feedback}
              onChange={(v) => save({ ...prefs, feedback: v })}
            />
          </div>
        </Panel>
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          Calendar subscription
        </h2>
        <Panel className="space-y-3 p-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            Subscribe in Google Calendar, Apple Calendar, or Outlook to see your
            weekly sessions and office hours alongside everything else. Your
            calendar refreshes automatically — paste this link as a new
            subscription (not a one-time import).
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-rule bg-neutral-50 px-3 py-2 text-xs text-ink-soft">
              {calendarUrl}
            </code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(calendarUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  // Clipboard API can fail in non-secure contexts.
                }
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rule bg-surface-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
            >
              {copied ? (
                <>
                  <Check size={14} weight="bold" aria-hidden /> Copied
                </>
              ) : (
                <>
                  <LinkIcon size={14} weight="bold" aria-hidden /> Copy link
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-ink-faint">
            This link is private to you — anyone with it can see your schedule, so
            don&apos;t share it.
          </p>
        </Panel>
      </section>
    </div>
  );
}
