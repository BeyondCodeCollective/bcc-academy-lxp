import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms, canManageRoles } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/ui";
import { ManageMenu } from "../manage-menu";
import { CopyLinkButton } from "./copy-link-button";

export const dynamic = "force-dynamic";

// Landing-page signups — the top of the funnel for every public landing page
// (/bcc/<slug>). A signup is allowlisted and emailed a one-click invite link
// on the spot; this page shows how many took the next step, and hands you the
// link for the ones who haven't. Until now these rows lived only in the DB:
// 16 people had raised a hand for MASS and there was no screen that said so.

type SignupRow = {
  id: string;
  slug: string;
  track_slug: string;
  email: string;
  name: string | null;
  invite_token: string | null;
  created_at: string;
};

type Stage = "signed-up" | "tapped-link" | "enrolled";

export default async function LandingSignupsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();
  const { data } = await svc
    .from("landing_signups")
    .select("id, slug, track_slug, email, name, invite_token, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  const rows = (data ?? []) as SignupRow[];

  const emails = [...new Set(rows.map((r) => r.email.toLowerCase()))];
  const tokens = rows.map((r) => r.invite_token).filter((t): t is string => !!t);
  const trackSlugs = [...new Set(rows.map((r) => r.track_slug))];

  const [{ data: students }, { data: invites }, { data: enrollments }, { data: pages }] =
    await Promise.all([
      emails.length
        ? svc.from("students").select("id, email, is_staff, is_test").in("email", emails)
        : Promise.resolve({ data: [] as { id: string; email: string; is_staff: boolean; is_test: boolean }[] }),
      tokens.length
        ? svc.from("invites").select("token, used_at").in("token", tokens)
        : Promise.resolve({ data: [] as { token: string; used_at: string | null }[] }),
      trackSlugs.length
        ? svc.from("student_tracks").select("student_id, track_slug").in("track_slug", trackSlugs)
        : Promise.resolve({ data: [] as { student_id: string; track_slug: string }[] }),
      svc.from("landing_pages").select("slug, headline, published"),
    ]);

  const studentByEmail = new Map(
    ((students ?? []) as { id: string; email: string; is_staff: boolean; is_test: boolean }[]).map((s) => [
      s.email.toLowerCase(),
      s,
    ]),
  );
  const usedToken = new Set(
    ((invites ?? []) as { token: string; used_at: string | null }[]).filter((i) => i.used_at).map((i) => i.token),
  );
  const enrolledKey = new Set(
    ((enrollments ?? []) as { student_id: string; track_slug: string }[]).map((e) => `${e.student_id}|${e.track_slug}`),
  );
  const pageBySlug = new Map(
    ((pages ?? []) as { slug: string; headline: string | null; published: boolean }[]).map((p) => [p.slug, p]),
  );

  const stageOf = (r: SignupRow): { stage: Stage; internal: boolean } => {
    const s = studentByEmail.get(r.email.toLowerCase());
    const internal = !!(s && (s.is_staff || s.is_test));
    if (s && enrolledKey.has(`${s.id}|${r.track_slug}`)) return { stage: "enrolled", internal };
    if (r.invite_token && usedToken.has(r.invite_token)) return { stage: "tapped-link", internal };
    return { stage: "signed-up", internal };
  };

  // Group by landing page, newest page first (by its latest signup).
  const groups = new Map<string, SignupRow[]>();
  for (const r of rows) {
    const list = groups.get(r.slug) ?? [];
    list.push(r);
    groups.set(r.slug, list);
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const origin = "https://bccacademy.io";
  const total = rows.length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-5 py-8 space-y-8">
      <PageHeader
        title="Landing page signups"
        subtitle={`${total} signup${total === 1 ? "" : "s"} across ${groups.size} landing page${groups.size === 1 ? "" : "s"} · most recent first`}
        noWrap
        actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />}
      />

      {rows.length === 0 ? (
        <p className="rounded-lg border border-rule bg-paper-tint-soft px-4 py-8 text-center text-sm text-ink-soft">
          No landing-page signups yet.
        </p>
      ) : (
        [...groups.entries()].map(([slug, list]) => {
          const page = pageBySlug.get(slug);
          const staged = list.map((r) => ({ r, ...stageOf(r) }));
          const real = staged.filter((x) => !x.internal);
          const enrolled = real.filter((x) => x.stage === "enrolled").length;
          const tapped = real.filter((x) => x.stage !== "signed-up").length;
          const pending = real.filter((x) => x.stage === "signed-up").length;
          const internalCount = staged.length - real.length;
          const pct = real.length ? Math.round((enrolled / real.length) * 100) : 0;
          return (
            <section key={slug} className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    {page?.headline?.replace(/\n/g, " ") ?? slug}
                    <span className="ml-2 font-mono text-xs font-normal text-ink-faint">/bcc/{slug}</span>
                    {page && !page.published && (
                      <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-micro font-semibold text-neutral-600">
                        unpublished
                      </span>
                    )}
                  </h2>
                  {/* The funnel in one line: the number that matters is how
                     many turned a signup into an enrollment. */}
                  <p className="mt-1 text-sm text-ink-soft tabular-nums">
                    <span className="font-semibold text-ink">{real.length}</span> signed up ·{" "}
                    <span className="font-semibold text-ink">{tapped}</span> tapped their link ·{" "}
                    <span className="font-semibold text-ink">{enrolled}</span> enrolled ({pct}%)
                    {pending > 0 && (
                      <>
                        {" "}· <span className="font-semibold text-amber-700">{pending}</span> still to chase
                      </>
                    )}
                    {internalCount > 0 && (
                      <span className="text-ink-faint"> · {internalCount} internal test{internalCount === 1 ? "" : "s"} not counted</span>
                    )}
                  </p>
                </div>
                <Link
                  href={`/dashboard/admin?tab=${encodeURIComponent(list[0].track_slug)}&view=students`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Course roster →
                </Link>
              </div>

              <DataTable columns={["Name", "Email", "Signed up", "Status", ""]}>
                {staged.map(({ r, stage, internal }) => (
                  <tr key={r.id} className={internal ? "text-ink-faint" : "text-ink"}>
                    <td className="px-4 py-3 align-top font-medium">
                      {r.name?.trim() || <span className="text-ink-faint">—</span>}
                      {internal && (
                        <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-micro font-semibold text-neutral-600">
                          internal
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-sm">{r.email}</td>
                    <td className="px-4 py-3 align-top text-xs text-ink-soft whitespace-nowrap">{fmt(r.created_at)}</td>
                    <td className="px-4 py-3 align-top">
                      {stage === "enrolled" ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-micro font-semibold text-green-800">
                          Enrolled
                        </span>
                      ) : stage === "tapped-link" ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-micro font-semibold text-blue-800">
                          Tapped link
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-micro font-semibold text-amber-800">
                          Signed up
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {/* Their own one-click link — for the DM/text nudge to
                         anyone who hasn't come through. Enrolled rows don't
                         need it. */}
                      {stage !== "enrolled" && r.invite_token && (
                        <CopyLinkButton url={`${origin}/invite/${r.invite_token}`} title="Copy their one-click link" />
                      )}
                    </td>
                  </tr>
                ))}
              </DataTable>
            </section>
          );
        })
      )}

      <p className="text-xs leading-relaxed text-ink-faint">
        Every landing-page signup is allowlisted and emailed a one-click link immediately.
        &ldquo;Signed up&rdquo; = hasn&apos;t used it yet (copy their link to nudge them).
        &ldquo;Tapped link&rdquo; = signed in but not on the course roster.
        &ldquo;Enrolled&rdquo; = on the roster. Staff and test accounts are shown but not counted.
      </p>
    </div>
  );
}
