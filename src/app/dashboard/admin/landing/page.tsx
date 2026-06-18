import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../manage-menu";
import { buttonClass, DataTable } from "@/components/ui";

export const dynamic = "force-dynamic";

type LandingRow = {
  slug: string;
  published: boolean;
  headline: string;
  updated_at: string;
};

export default async function LandingPagesListPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();
  const { data } = await svc
    .from("landing_pages")
    .select("slug, published, headline, updated_at")
    .order("updated_at", { ascending: false });
  const rows = (data ?? []) as LandingRow[];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <PageHeader
          title="Landing pages"
          subtitle="Marketing landing pages served from /camp/<slug>. Create or edit any page here — changes go live with no code deploy."
          actions={
            <div className="flex items-center gap-2">
              <ManageMenu />
              <Link
                href="/dashboard/admin/landing/new"
                className={`${buttonClass("primary", "md")} shrink-0`}
              >
                New landing page
              </Link>
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
        <DataTable columns={["Slug", "Headline", "Status", ""]}>
          {rows.map((r) => (
            <tr key={r.slug} className="text-ink">
              <td className="px-4 py-3 align-top">
                <Link
                  href={`/camp/${r.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm font-semibold text-ink hover:text-primary"
                >
                  {r.slug}
                </Link>
                <span className="ml-1 text-ink-faint">↗</span>
              </td>
              <td className="px-4 py-3 align-top text-ink-soft">
                <span className="line-clamp-2">{r.headline.replace(/\n/g, " ")}</span>
              </td>
              <td className="px-4 py-3 align-top">
                {r.published ? (
                  <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    Published
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-paper-tint px-2 py-0.5 text-[11px] font-semibold text-ink-faint">
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
      )}
    </div>
  );
}
