"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { sendTestInvite } from "./invites/actions";
import type { PendingPerson } from "@/lib/people-hub";

type Props = {
  pending: PendingPerson[];
  /** track slug → display name. */
  trackNames: Record<string, string>;
};

// People who are allowlisted or invited for the program but don't have an
// account yet — the front of the pipeline, shown above the roster so admins see
// everyone at every stage in one place. Per-row Send invite / Resend.
export function PendingPeopleSection({ pending, trackNames }: Props) {
  const [, startTransition] = useTransition();
  const [state, setState] = useState<Record<string, "sending" | "sent" | "error">>({});

  if (pending.length === 0) return null;

  const send = (email: string, trackSlug: string) => {
    if (!trackSlug) return;
    setState((m) => ({ ...m, [email]: "sending" }));
    startTransition(async () => {
      const r = await sendTestInvite(trackSlug, email);
      setState((m) => ({ ...m, [email]: r.ok ? "sent" : "error" }));
    });
  };

  return (
    <section className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
        Pending — invited or allowlisted, no account yet ({pending.length})
      </p>
      <div className="divide-y divide-rule-soft overflow-hidden panel">
        {pending.map((p) => {
          const st = state[p.email];
          const trackSlug = p.trackSlugs[0];
          const trackLabel = p.trackSlugs.map((s) => trackNames[s] ?? s).join(", ");
          return (
            <div key={p.email} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{p.email}</p>
                {trackLabel && (
                  <p className="truncate text-[11px] text-ink-faint">{trackLabel}</p>
                )}
              </div>
              <StatusPill status={p.status} />
              <button
                type="button"
                onClick={() => send(p.email, trackSlug)}
                disabled={st === "sending" || !trackSlug}
                className={buttonClass("secondary", "sm")}
              >
                {st === "sending"
                  ? "Sending…"
                  : st === "sent"
                    ? "Sent ✓"
                    : st === "error"
                      ? "Retry"
                      : p.inviteSent
                        ? "Resend"
                        : "Send invite"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function StatusPill({
  status,
}: {
  status: "active" | "joined" | "invited" | "allowlisted";
}) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-emerald-50 text-emerald-700" },
    joined: { label: "Joined", cls: "bg-blue-50 text-blue-700" },
    invited: { label: "Invited", cls: "bg-amber-50 text-amber-700" },
    allowlisted: { label: "Allowlisted", cls: "bg-paper-tint text-ink-soft" },
  };
  const s = map[status];
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
