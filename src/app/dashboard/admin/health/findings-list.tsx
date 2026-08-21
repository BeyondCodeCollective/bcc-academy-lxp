"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SentinelFinding, SentinelFix, SentinelRow } from "@/lib/sentinel/checks";
import type { SentinelDismissal } from "@/lib/sentinel/dismissals";
import {
  applySentinelFixAction,
  dismissFindingRowsAction,
  restoreDismissalAction,
} from "./actions";
import { buttonClass } from "@/components/ui";

const SEVERITY_STYLE: Record<SentinelFinding["severity"], string> = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-surface text-ink-faint",
};

export function FindingsList({
  findings,
  dismissals,
}: {
  findings: SentinelFinding[];
  dismissals: SentinelDismissal[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyFix, setBusyFix] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [showDismissed, setShowDismissed] = useState(false);

  function apply(fix: SentinelFix) {
    if (!window.confirm(`${fix.label}?`)) return;
    setBusyFix(fix.label);
    startTransition(async () => {
      try {
        const res = await applySentinelFixAction(fix);
        setResults((r) => ({
          ...r,
          [fix.label]: res.success ? `✓ ${res.detail}` : `✕ ${res.error}`,
        }));
        if (res.success) router.refresh();
      } catch {
        setResults((r) => ({ ...r, [fix.label]: "✕ Something went wrong." }));
      } finally {
        setBusyFix(null);
      }
    });
  }

  function dismiss(check: string, rows: SentinelRow[]) {
    startTransition(async () => {
      await dismissFindingRowsAction(check, rows);
      router.refresh();
    });
  }

  function restore(check: string, rowKey: string) {
    startTransition(async () => {
      await restoreDismissalAction(check, rowKey);
      router.refresh();
    });
  }

  return (
    <div className={`space-y-4 ${pending ? "opacity-60" : ""}`}>
      {findings.map((f) => (
        <div key={f.check} className="rounded-xl border border-rule bg-surface-elevated p-5">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-micro font-semibold uppercase tracking-wide ${SEVERITY_STYLE[f.severity]}`}
            >
              {f.severity}
            </span>
            <p className="text-sm font-semibold text-ink">{f.check}</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-faint">{f.message}</p>
          <ul className="mt-2 space-y-0.5">
            {f.rows.map((r) => (
              <li key={r.key} className="group flex items-start gap-2 text-xs text-ink-faint">
                <span className="min-w-0 flex-1">· {r.label}</span>
                {/* Per row, so acknowledging one legacy record never hides the
                    next real one under the same check. */}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => dismiss(f.check, [r])}
                  title="Dismiss — acknowledged, won't fix"
                  aria-label={`Dismiss: ${r.label}`}
                  className="shrink-0 rounded px-1 leading-none text-ink-faint opacity-0 transition hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
            {f.fixes?.map((fix) => {
              const done = results[fix.label];
              return done ? (
                <p key={fix.label} className="text-xs text-ink-faint">
                  {done}
                </p>
              ) : (
                <button
                  key={fix.label}
                  type="button"
                  disabled={pending}
                  onClick={() => apply(fix)}
                  className={buttonClass("secondary", "sm")}
                >
                  {busyFix === fix.label ? "Applying…" : fix.label}
                </button>
              );
            })}
            <button
              type="button"
              disabled={pending}
              onClick={() => dismiss(f.check, f.rows)}
              className={buttonClass("ghost", "sm")}
            >
              Dismiss all {f.rows.length}
            </button>
          </div>
        </div>
      ))}

      {dismissals.length > 0 && (
        <div className="rounded-xl border border-rule bg-surface p-5">
          <button
            type="button"
            onClick={() => setShowDismissed((v) => !v)}
            aria-expanded={showDismissed}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="text-sm font-semibold text-ink">
              Dismissed ({dismissals.length})
            </span>
            <span className="text-xs text-ink-faint">{showDismissed ? "Hide" : "Show"}</span>
          </button>
          <p className="mt-1 text-xs text-ink-faint">
            Acknowledged and hidden from this page and the nightly brief. New items
            under the same check still appear.
          </p>
          {showDismissed && (
            <ul className="mt-3 space-y-2">
              {dismissals.map((d) => (
                <li
                  key={`${d.checkName} ${d.rowKey}`}
                  className="flex items-start justify-between gap-3 border-t border-rule pt-2 first:border-0 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-faint">{d.checkName}</p>
                    <p className="text-xs text-ink-faint">· {d.rowLabel}</p>
                    <p className="mt-0.5 text-micro text-ink-faint">
                      {new Date(d.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {d.dismissedByEmail ? ` · ${d.dismissedByEmail}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => restore(d.checkName, d.rowKey)}
                    className={buttonClass("ghost", "sm")}
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
