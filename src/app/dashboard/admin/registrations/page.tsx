import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../manage-menu";
import { DataTable } from "@/components/ui";

export const dynamic = "force-dynamic";

type OrderRow = {
  order_id: string;
  email: string;
  track_slug: string;
  event_id: string | null;
  invite_token: string | null;
  created_at: string;
};

// Registrations log — every Eventbrite signup that flowed through the funnel.
// Lets an admin scan for suspicious / bot signups before a course unlocks, and
// see who has actually claimed their portal account vs. just registered.
export default async function RegistrationsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();
  const { data: orders } = await svc
    .from("eventbrite_orders")
    .select("order_id, email, track_slug, event_id, invite_token, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (orders ?? []) as OrderRow[];
  const emails = [...new Set(rows.map((r) => r.email.toLowerCase()))];
  const tokens = rows.map((r) => r.invite_token).filter((t): t is string => !!t);

  const [{ data: students }, { data: invites }] = await Promise.all([
    emails.length
      ? svc.from("students").select("email").in("email", emails)
      : Promise.resolve({ data: [] as { email: string }[] }),
    tokens.length
      ? svc.from("invites").select("token, used_at").in("token", tokens)
      : Promise.resolve({ data: [] as { token: string; used_at: string | null }[] }),
  ]);

  const haveAccount = new Set(
    ((students ?? []) as { email: string }[]).map((s) => s.email.toLowerCase()),
  );
  const usedToken = new Set(
    ((invites ?? []) as { token: string; used_at: string | null }[])
      .filter((i) => i.used_at)
      .map((i) => i.token),
  );

  // Per-email registration counts — a spike from one address is a bot signal.
  const countByEmail = new Map<string, number>();
  for (const r of rows) {
    const e = r.email.toLowerCase();
    countByEmail.set(e, (countByEmail.get(e) ?? 0) + 1);
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        title="Registrations"
        subtitle={`${rows.length} Eventbrite signup${rows.length === 1 ? "" : "s"} · most recent first`}
        noWrap
        actions={<ManageMenu />}
      />

      {rows.length === 0 ? (
        <p className="rounded-lg border border-rule bg-paper-tint-soft px-4 py-8 text-center text-sm text-ink-soft">
          No Eventbrite registrations yet.
        </p>
      ) : (
        <DataTable columns={["Email", "Course", "Registered", "Account"]}>
          {rows.map((r) => {
            const dupes = countByEmail.get(r.email.toLowerCase()) ?? 1;
            const joined = haveAccount.has(r.email.toLowerCase());
            const claimed = r.invite_token ? usedToken.has(r.invite_token) : false;
            return (
              <tr key={r.order_id} className="text-ink">
                <td className="px-4 py-3 align-top">
                  <span className="font-medium text-ink">{r.email}</span>
                  {dupes > 1 && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-micro font-semibold text-amber-800">
                      ×{dupes}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top font-mono text-xs text-ink-soft">
                  {r.track_slug}
                </td>
                <td className="px-4 py-3 align-top text-xs text-ink-soft whitespace-nowrap">
                  {fmt(r.created_at)}
                </td>
                <td className="px-4 py-3 align-top">
                  {joined ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-micro font-semibold text-green-800">
                      Joined
                    </span>
                  ) : claimed ? (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-micro font-semibold text-blue-800">
                      Signed in
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-micro font-semibold text-neutral-600">
                      Registered
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}

      <p className="text-xs leading-relaxed text-ink-faint">
        &ldquo;Registered&rdquo; = signed up on Eventbrite, no portal account yet.
        &ldquo;Signed in&rdquo; = used their access link. &ldquo;Joined&rdquo; = has a
        portal account. A <span className="font-semibold">×N</span> badge flags an email
        that registered multiple times — worth a look.
      </p>
    </div>
  );
}
