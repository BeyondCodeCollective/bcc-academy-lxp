"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SentinelFinding, SentinelFix } from "@/lib/sentinel/checks";
import { applySentinelFixAction } from "./actions";
import { buttonClass } from "@/components/ui";

const SEVERITY_STYLE: Record<SentinelFinding["severity"], string> = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-surface text-ink-faint",
};

export function FindingsList({ findings }: { findings: SentinelFinding[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyFix, setBusyFix] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

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

  return (
    <div className="space-y-4">
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
              <li key={r} className="text-xs text-ink-faint">
                · {r}
              </li>
            ))}
          </ul>
          {f.fixes && f.fixes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-rule pt-3">
              {f.fixes.map((fix) => {
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
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
