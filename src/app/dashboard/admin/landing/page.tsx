import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms, canManageRoles } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { embeddedProgramSlug } from "@/lib/landing-pages";
import { ManageMenu } from "../manage-menu";
import { buttonClass, DataTable } from "@/components/ui";

export const dynamic = "force-dynamic";

type LandingRow = {
  slug: string;
  published: boolean;
  headline: string;
  updated_at: string;
  /** Owning program, joined — its slug is the page's URL brand segment. */
  programs: unknown;
};

export default async function LandingPagesListPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();
  const { data } = await svc
    .from("landing_pages")
    .select("slug, published, headline, updated_at, programs(slug)")
    .order("updated_at", { ascending: false });
  const rows = (data ?? []) as LandingRow[];
  // Published and drafts answer different questions — "what is live right now"
  // versus "what am I still working on". Interleaved by updated_at they had to
  // be picked apart by eye every time. Each group stays newest-first.
  const published = rows.filter((r) => r.published);
  const drafts = rows.filter((r) => !r.published);
  const groups = [
    { label: "Published", rows: published, hint: "live on the public site" },
    { label: "Drafts", rows: drafts, hint: "not reachable until published" },
  ].filter((g) => g.rows.length > 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <PageHeader
          title="Landing pages"
          subtitle="Marketing landing pages. A page owned by a program is served from /<program>/<slug>; the rest sit at /bcc/<slug>. Changes go live with no code deploy."
          noWrap
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/admin/landing/new"
                className={`${buttonClass("primary", "md")} shrink-0`}
              >
                New landing page
              </Link>
              <ManageMenu isMaster={canManageRoles(ctx.userEmail)} />
            </div>
          }
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-rule bg-paper-tint-soft px-4 py-8 text-center text-sm text-ink-soft">
          No landing pages yet.{" "}
          <Link href="/dashboard/admin/landing/new" className="font-semibold text-primary hover:underline">
            Create the first one →
          </Link>
        </p>
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.label}>
              <div className="mb-2 flex items-baseline gap-2">
                <h2 className="font-display text-[15px] font-bold text-ink">{group.label}</h2>
                <span className="text-micro font-semibold text-ink-faint">
                  {group.rows.length}
                </span>
                <span className="text-xs text-ink-faint">· {group.hint}</span>
              </div>
              <DataTable columns={["Slug", "Headline", "Status", ""]}>
                {group.rows.map((r) => (
            <tr key={r.slug} className="text-ink">
              <td className="px-4 py-3 align-top">
                <Link
                  href={`/${embeddedProgramSlug(r.programs) ?? "bcc"}/${r.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm font-semibold text-ink hover:text-primary"
                >
                  {embeddedProgramSlug(r.programs)
                    ? `${embeddedProgramSlug(r.programs)}/${r.slug}`
                    : r.slug}
                </Link>
                <span className="ml-1 text-ink-faint">↗</span>
              </td>
              <td className="px-4 py-3 align-top text-ink-soft">
                <span className="line-clamp-2">{r.headline.replace(/\n/g, " ")}</span>
              </td>
              <td className="px-4 py-3 align-top">
                {r.published ? (
                  <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-micro font-semibold text-green-700">
                    Published
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-paper-tint px-2 py-0.5 text-micro font-semibold text-ink-faint">
                    Draft
                  </span>
                )}
              </td>
              <td className="px-4 py-3 align-top text-right">
                <Link
                  href={`/dashboard/admin/landing/${r.slug}`}
                  className={buttonClass("secondary", "sm")}
                >
                  Edit
                </Link>
              </td>
            </tr>
                ))}
              </DataTable>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
