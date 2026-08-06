"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash as Trash2 } from "@phosphor-icons/react";
import { CircleNotch as Loader2 } from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui";
import { sendTestInvite, sendCohortInvites } from "./invites/actions";
import { removePendingPerson, restorePendingPerson } from "./allowlist/actions";
import { UndoBar } from "@/components/undo-bar";
import type { PendingPerson } from "@/lib/people-hub";

type Props = {
  pending: PendingPerson[];
  /** track slug → display name. */
  trackNames: Record<string, string>;
  /** Render as bare rows (no section header/panel) for embedding inside the
   *  roster list, so pending people read as part of ONE list. */
  inline?: boolean;
};

// People who are allowlisted or invited for the program but don't have an
// account yet — the front of the pipeline, shown above the roster so admins see
// everyone at every stage in one place. Per-row Send invite / Resend.
export function PendingPeopleSection({ pending, trackNames, inline = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<Record<string, "sending" | "sent" | "error">>({});
  const [removing, setRemoving] = useState<Record<string, boolean>>({});
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ email: string; trackSlugs: string[] } | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [allResult, setAllResult] = useState<string | null>(null);

  if (pending.length === 0) return null;

  // Distinct courses represented in the pending list — "Send all invites"
  // sends one cohort batch per course (idempotent: skips already-invited).
  const allTracks = [...new Set(pending.flatMap((p) => p.trackSlugs))].filter(Boolean);

  const sendAll = () => {
    if (allTracks.length === 0) return;
    if (
      !window.confirm(
        "Send invites to everyone on the allowlist who hasn't been invited yet?",
      )
    ) {
      return;
    }
    setSendingAll(true);
    setAllResult(null);
    startTransition(async () => {
      let sent = 0;
      let failed = 0;
      let remaining = 0;
      let err: string | null = null;
      for (const t of allTracks) {
        const r = await sendCohortInvites(t);
        if (r.ok) {
          sent += r.sent ?? 0;
          failed += r.failed ?? 0;
          remaining += r.remaining ?? 0;
        } else {
          err = r.error ?? "Failed to send invites.";
        }
      }
      setSendingAll(false);
      setAllResult(
        err
          ? err
          : `${sent} sent${failed ? `, ${failed} failed` : ""}${
              remaining ? ` · ${remaining} remaining — click again to continue` : ""
            }.`,
      );
      router.refresh();
    });
  };

  const send = (email: string, trackSlug: string) => {
    if (!trackSlug) return;
    setState((m) => ({ ...m, [email]: "sending" }));
    startTransition(async () => {
      const r = await sendTestInvite(trackSlug, email);
      setState((m) => ({ ...m, [email]: r.ok ? "sent" : "error" }));
    });
  };

  // Removing someone from the allowlist is reversible, so it just happens and
  // offers an Undo. The confirm() it replaced taxed every correct removal to
  // catch the rare wrong one, and blocked the thread while it did.
  const remove = (email: string, trackSlugs: string[]) => {
    setRemoveError(null);
    setUndo(null);
    setRemoving((m) => ({ ...m, [email]: true }));
    startTransition(async () => {
      const r = await removePendingPerson(email, trackSlugs);
      if (r.ok) {
        setUndo({ email, trackSlugs });
        router.refresh();
      } else {
        // A silent failure reads as "the page just refreshed" — say why.
        setRemoveError(`Couldn't remove ${email}: ${r.error ?? "unknown error"}`);
        setRemoving((m) => ({ ...m, [email]: false }));
      }
    });
  };

  // Allowlisted but never sent an invite (and no account) — this state is
  // silent by default and has stranded people before (Endless Bootcamp,
  // 2026-08-04): emails added to the allowlist after the cohort blast never
  // got contacted and nothing flagged it. Surface it loudly.
  const neverInvited = pending.filter((p) => p.status === "allowlisted").length;

  const banner = neverInvited > 0 && (
    <div className={`flex items-center justify-between gap-3 bg-amber-50 px-4 py-3 ${inline ? "" : "rounded-lg"}`}>
      <p className="text-sm text-amber-800">
        <span className="font-semibold">{neverInvited}</span>{" "}
        {neverInvited === 1 ? "person is" : "people are"} on the allowlist
        but {neverInvited === 1 ? "has" : "have"} never been sent an invite.
      </p>
      <button
        type="button"
        onClick={sendAll}
        disabled={isPending}
        className={buttonClass("secondary", "sm")}
      >
        {sendingAll ? <Loader2 size={12} className="animate-spin" /> : null}
        {sendingAll ? "Sending…" : `Send ${neverInvited === 1 ? "invite" : "invites"}`}
      </button>
    </div>
  );

  const feedback = (
    <>
      {allResult && <p className="px-4 py-1 text-xs text-ink-soft">{allResult}</p>}
      {removeError && <p className="px-4 py-1 text-xs text-red-600">{removeError}</p>}
    </>
  );

  const rows = pending.map((p) => {
          const st = state[p.email];
          const trackSlug = p.trackSlugs[0];
          const trackLabel = p.trackSlugs.map((s) => trackNames[s] ?? s).join(", ");
          return (
            <div key={p.email} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{p.email}</p>
                {trackLabel && (
                  <p className="truncate text-micro text-ink-faint">{trackLabel}</p>
                )}
              </div>
              <StatusPill status={p.status} />
              <button
                type="button"
                onClick={() => send(p.email, trackSlug)}
                disabled={st === "sending" || !trackSlug || removing[p.email]}
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
              <button
                type="button"
                onClick={() => remove(p.email, p.trackSlugs)}
                disabled={removing[p.email]}
                aria-label={`Remove ${p.email}`}
                className="shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-paper-tint hover:text-red-600 disabled:opacity-40"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
          );
        });

  const undoBar = undo && (
    <UndoBar
      message={`Removed ${undo.email} from the allowlist.`}
      onUndo={async () => {
        const r = await restorePendingPerson(undo.email, undo.trackSlugs);
        if (!r.ok) throw new Error(r.error ?? "unknown error");
        router.refresh();
      }}
      onDismiss={() => setUndo(null)}
    />
  );

  // Inline: bare rows for embedding in the roster panel — pending people are
  // part of ONE list, not a separate section with its own count.
  if (inline) {
    return (
      <>
        {banner}
        {feedback}
        {rows}
        {undoBar}
      </>
    );
  }

  return (
    <section className="space-y-2">
      {banner}
      <div className="flex items-center justify-between gap-3">
        <p className="text-micro font-semibold uppercase tracking-[0.16em] text-ink-faint">
          Pending — invited or allowlisted, no account yet ({pending.length})
        </p>
        <button
          type="button"
          onClick={sendAll}
          disabled={isPending || allTracks.length === 0}
          // Secondary on purpose: "Add people" is this screen's ONE primary
          // action; a second cobalt button at a different weight reads as two
          // competing calls-to-action.
          className={buttonClass("secondary", "sm")}
        >
          {sendingAll ? <Loader2 size={12} className="animate-spin" /> : null}
          {sendingAll ? "Sending…" : "Send all invites"}
        </button>
      </div>
      {feedback}
      <div className="divide-y divide-rule-soft overflow-hidden panel">{rows}</div>
      {undoBar}
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
      className={`shrink-0 rounded-full px-2 py-0.5 text-micro font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
