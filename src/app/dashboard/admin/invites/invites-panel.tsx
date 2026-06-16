"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { sendCohortInvites, type SendInvitesResult } from "./actions";

type TrackRow = {
  slug: string;
  invited: number;
  sent: number;
  opened: number;
};

export function InvitesPanel({ tracks }: { tracks: TrackRow[] }) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SendInvitesResult>>({});

  const send = (slug: string, invited: number) => {
    if (
      !window.confirm(
        `Send one-click login invites to all ${invited} allowlisted students for "${slug}"?\n\nAlready-sent students are skipped; failures are retried.`,
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
        <p className="text-[15px] font-medium text-ink">No allowlisted students yet</p>
        <p className="mt-1.5 text-[13px] text-ink-soft">
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
        return (
          <div key={t.slug} className="flex flex-wrap items-center gap-4 px-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">{t.slug}</p>
              <p className="text-[12px] text-ink-faint tabular-nums">
                {t.invited} allowlisted · {t.sent} invited · {t.opened} opened
              </p>
              {r && (
                <p
                  className={`mt-1 text-[12px] tabular-nums ${
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
              onClick={() => send(t.slug, t.invited)}
              disabled={busy}
              className={buttonClass("dark", "sm")}
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
        );
      })}
    </div>
  );
}
