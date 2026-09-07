// The Sentinel repairing what it finds, unattended.
//
// Until now every remedy needed a master-email human to open Platform Health
// and click. Eight of the ten findings had no remedy at all. This applies the
// narrow set marked `auto` on the nightly run and reports what it did.
//
// Four rules keep that safe, and they matter more than the code:
//
//  1. Only fixes explicitly marked `auto` in checks.ts. That bar is reversible
//     AND single-row AND sends no email — an email cannot be unsent, so
//     anything that mails a learner stays a human decision.
//  2. Never a dismissed row. "Acknowledged, won't fix" has to outrank the
//     robot, or dismissing something would stop hiding it and start inviting
//     the platform to undo your decision every night.
//  3. Every application is written to admin_access_log with a null actor. The
//     fix path had no audit trail at all before this; widening write authority
//     without one is the wrong order.
//  4. SENTINEL_AUTO_FIX=0 turns it off entirely, without a deploy.

import type { createServiceClient } from "@/lib/supabase/server";
import { logAdminAccess } from "@/app/dashboard/admin/actions-shared";
import { applyFix } from "./apply-fix";
import { applyDismissals, getDismissals } from "./dismissals";
import type { SentinelFinding } from "./checks";

type Svc = ReturnType<typeof createServiceClient>;

export type AutoFixOutcome = {
  applied: string[];
  failed: string[];
  /** True when the kill switch is off, so the brief can say so rather than
   *  silently reporting "0 applied" and looking like a quiet night. */
  disabled: boolean;
};

export function autoFixEnabled(): boolean {
  return process.env.SENTINEL_AUTO_FIX !== "0";
}

/**
 * Apply every auto-eligible fix on the CURRENT findings. Returns what it did,
 * so the caller can re-run the checks afterwards and report against the state
 * the fixes left behind rather than the state that triggered them.
 */
export async function runAutoFixes(
  svc: Svc,
  findings: SentinelFinding[],
): Promise<AutoFixOutcome> {
  const out: AutoFixOutcome = { applied: [], failed: [], disabled: false };
  if (!autoFixEnabled()) {
    out.disabled = true;
    return out;
  }

  // Dismissed rows are out of scope. A finding whose every row is dismissed
  // disappears here exactly as it does on screen, taking its fixes with it.
  const visible = applyDismissals(findings, await getDismissals(svc)).visible;

  for (const finding of visible) {
    for (const fix of finding.fixes ?? []) {
      if (!fix.auto) continue;
      let result;
      try {
        result = await applyFix(svc, fix);
      } catch (err) {
        out.failed.push(`${fix.label} — ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      if (!result.success) {
        // A refusal is not an error worth alarming about: it means a guard did
        // its job, usually because the data changed since the check ran.
        out.failed.push(`${fix.label} — ${result.error}`);
        continue;
      }
      out.applied.push(result.detail);
      logAdminAccess(svc, {
        actorUserId: null,
        programId: null,
        action: "auto_fix",
        resource: `sentinel:${finding.check}`,
        metadata: { kind: fix.kind, label: fix.label, detail: result.detail },
      });
    }
  }
  return out;
}
