import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { runSentinelChecks, type SentinelFinding } from "@/lib/sentinel/checks";
import { PageHeader } from "@/components/page-header";

// Platform Health — the Sentinel's checks, run live on load. The nightly cron
// emails the same findings; this page is for "is it still broken?" right after
// a fix, without waiting for tomorrow's brief.

export const dynamic = "force-dynamic";

const SEVERITY_STYLE: Record<SentinelFinding["severity"], string> = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-surface text-ink-faint",
};

export default async function PlatformHealthPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  let findings: SentinelFinding[] | null = null;
  let error: string | null = null;
  try {
    findings = await runSentinelChecks(createServiceClient());
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sentinel"
        title="Platform Health"
        subtitle="Every check is a rule that broke in production once. Run fresh on each load; the nightly brief emails the same findings."
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
          </p>
        </div>
      )}

      {findings && findings.length > 0 && (
        <div className="space-y-4">
          {findings.map((f) => (
            <div
              key={f.check}
              className="rounded-xl border border-rule bg-surface-elevated p-5"
            >
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
