"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { sendCohortInvites, sendTestInvite, type SendInvitesResult } from "./actions";

type TrackRow = {
  slug: string;
  name: string;
  invited: number;
  sent: number;
  opened: number;
};

export function InvitesPanel({ tracks }: { tracks: TrackRow[] }) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SendInvitesResult>>({});
  const [testEmail, setTestEmail] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<Record<string, SendInvitesResult>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const sendTest = (slug: string) => {
    const email = (testEmail[slug] ?? "").trim();
    if (!email) return;
    setTesting(slug);
    startTransition(async () => {
      const r = await sendTestInvite(slug, email);
      setTestResult((prev) => ({ ...prev, [slug]: r }));
      setTesting(null);
    });
  };

  const send = (slug: string, name: string, invited: number) => {
    if (
      !window.confirm(
        `Send one-click login invites to all ${invited} allowlisted students for "${name}"?\n\nAlready-sent students are skipped; failures are retried.`,
      )
    )
      return;
    setActive(slug);
    startTransition(async () => {
      const r = await sendCohortInvites(slug);
      setResults((prev) => ({ ...prev, [slug]: r }));
      setActive(null);
    });
  };

  if (tracks.length === 0) {
    return (
      <div className="panel px-6 py-10 text-center">
        <p className="text-sm font-medium text-ink">No allowlisted students yet</p>
        <p className="mt-1.5 text-xs text-ink-soft">
          Add students to a track&apos;s signup allowlist first, then come back to invite them.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-rule overflow-hidden panel">
      {tracks.map((t) => {
        const r = results[t.slug];
        const busy = pending && active === t.slug;
        const tr = testResult[t.slug];
        const testBusy = pending && testing === t.slug;
        return (
          <div key={t.slug} className="px-4 py-4 space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.name}</p>
                <p className="text-xs text-ink-faint tabular-nums">
                  {t.invited} allowlisted · {t.sent} invited · {t.opened} opened
                </p>
                {r && (
                  <p
                    className={`mt-1 text-xs tabular-nums ${
                      r.ok ? "text-ink-soft" : "text-primary"
                    }`}
                  >
                    {r.ok
                      ? `Sent ${r.sent} · ${r.failed} failed${
                          r.remaining
                            ? ` · ${r.remaining} remaining — click again to continue`
                            : ""
                        }`
                      : `Error: ${r.error}`}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => send(t.slug, t.name, t.invited)}
                disabled={busy}
                className={buttonClass("primary", "sm")}
              >
                {busy
                  ? "Sending…"
                  : r?.remaining
                    ? `Send remaining (${r.remaining})`
                    : r || t.sent > 0
                      ? "Resend / retry"
                      : "Send invites"}
              </button>
            </div>

            {/* Single-recipient test send — preview the live email without
                touching the cohort. */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="email"
                inputMode="email"
                placeholder="your@email.com — send a test"
                value={testEmail[t.slug] ?? ""}
                onChange={(e) =>
                  setTestEmail((prev) => ({ ...prev, [t.slug]: e.target.value }))
                }
                className="min-w-0 flex-1 rounded-lg border border-rule bg-paper-tint-soft px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-ink"
              />
              <button
                type="button"
                onClick={() => sendTest(t.slug)}
                disabled={testBusy || !(testEmail[t.slug] ?? "").trim()}
                className={buttonClass("ghost", "sm")}
              >
                {testBusy ? "Sending…" : "Send test"}
              </button>
              {tr && (
                <span
                  className={`text-xs ${tr.ok ? "text-ink-soft" : "text-primary"}`}
                >
                  {tr.ok ? "Test sent ✓" : `Error: ${tr.error}`}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
