import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { isMasterEmail } from "@/lib/auth/admins";
import { createServiceClient } from "@/lib/supabase/server";
import { runSentinelChecks, type SentinelFinding } from "@/lib/sentinel/checks";
import {
  applyDismissals,
  getDismissals,
  type SentinelDismissal,
} from "@/lib/sentinel/dismissals";
import { PageHeader } from "@/components/page-header";
import { FindingsList } from "./findings-list";

// Platform Health — the Sentinel's checks, run live on load. The nightly cron
// emails the same findings; this page is for "is it still broken?" right after
// a fix, without waiting for tomorrow's brief.

export const dynamic = "force-dynamic";

export default async function PlatformHealthPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  // Master-only: the findings list learner emails across every program, so
  // this sits with the platform owner, not super-admins.
  if (!isMasterEmail(ctx.userEmail)) redirect("/dashboard/admin");

  let findings: SentinelFinding[] | null = null;
  let dismissals: SentinelDismissal[] = [];
  let hiddenRows = 0;
  let error: string | null = null;
  try {
    const svc = createServiceClient();
    const [raw, dismissed] = await Promise.all([
      runSentinelChecks(svc),
      getDismissals(svc),
    ]);
    dismissals = dismissed;
    const filtered = applyDismissals(raw, dismissed);
    findings = filtered.visible;
    hiddenRows = filtered.hiddenRows;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        eyebrow="Sentinel"
        title="Platform Health"
        subtitle="Every check is a rule that broke in production once. Run fresh on each load; the nightly brief emails the same findings. Dismiss anything you can't fix — it stays hidden here and in the brief, and a new item under the same check still surfaces."
      />

      {error && (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Checks failed to run: {error}
        </p>
      )}

      {findings && findings.length === 0 && (
        <div className="rounded-xl border border-rule bg-surface-elevated p-6">
          <p className="text-sm font-semibold text-ink">✓ All clear</p>
          <p className="mt-1 text-sm text-ink-faint">
            Every data invariant holds and no upcoming course is missing a roster or
            meeting link.
            {hiddenRows > 0 &&
              ` ${hiddenRows} dismissed item${hiddenRows === 1 ? "" : "s"} not shown.`}
          </p>
        </div>
      )}

      {findings && (findings.length > 0 || dismissals.length > 0) && (
        <FindingsList findings={findings} dismissals={dismissals} />
      )}
    </div>
  );
}
