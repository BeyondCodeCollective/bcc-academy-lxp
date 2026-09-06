import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms, canManageRoles } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { listApplications, isAccepting } from "@/lib/applications";
import { ManageMenu } from "../manage-menu";
import { buttonClass, DataTable } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const apps = await listApplications();

  // One count query, grouped in memory — the table is small.
  const svc = createServiceClient();
  const { data: subs } = await svc
    .from("application_submissions")
    .select("application_id, status");
  const counts = new Map<string, { total: number; fresh: number }>();
  for (const s of (subs ?? []) as { application_id: string; status: string }[]) {
    const c = counts.get(s.application_id) ?? { total: 0, fresh: 0 };
    c.total++;
    if (s.status === "new") c.fresh++;
    counts.set(s.application_id, c);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title="Applications"
        subtitle="Application forms for cohorts that select their participants. Each renders at /apply/<slug>; accepting a submission allowlists the applicant for the linked course."
        noWrap
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/applications/new"
              className={`${buttonClass("primary", "md")} shrink-0`}
            >
              New application
            </Link>
            <ManageMenu isMaster={canManageRoles(ctx.userEmail)} />
          </div>
        }
      />

      {apps.length === 0 ? (
        <p className="rounded-lg border border-ink/10 bg-surface-muted px-4 py-6 text-center text-sm text-ink-soft">
          No applications yet. Create one and share its /apply link.
        </p>
      ) : (
        <DataTable columns={["Application", "Course", "Status", "Submissions"]}>
          {apps.map((a) => {
            const c = counts.get(a.id) ?? { total: 0, fresh: 0 };
            return (
              <tr key={a.slug} className="hover:bg-paper-tint/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/admin/applications/${a.slug}`}
                    className="font-medium text-ink hover:text-primary"
                  >
                    {a.title}
                  </Link>
                  <p className="font-mono text-micro text-ink-faint">/apply/{a.slug}</p>
                </td>
                <td className="px-4 py-3 text-sm text-ink-soft">{a.trackSlug ?? "—"}</td>
                <td className="px-4 py-3 text-sm">
                  {isAccepting(a) ? (
                    <span className="text-green-700">Open</span>
                  ) : (
                    <span className="text-ink-faint">Closed</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-ink-soft">
                  {c.total}
                  {c.fresh > 0 && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-micro font-semibold text-primary">
                      {c.fresh} new
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
