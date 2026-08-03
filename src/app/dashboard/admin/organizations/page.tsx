import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canManageRoles } from "@/lib/roles";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../manage-menu";
import { listOrganizations } from "./actions";
import { CreateOrganizationForm } from "./create-organization-form";
import { OrgBrandingEditor } from "./org-branding-editor";

export default async function OrganizationsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  // Master tier only (see requireMaster in ./actions). Email-gated, so this is
  // the platform owner and nobody else — not even other super-admins.
  if (!canManageRoles(ctx.userEmail)) redirect("/dashboard/admin");

  const organizations = await listOrganizations();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-12">
      <PageHeader
        title="Organizations"
        subtitle="Each organization gets its own courses, staff, learners, and join link. No deploy needed."
        actions={<ManageMenu isMaster />}
      />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          New organization
        </h2>
        <CreateOrganizationForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Existing organizations
        </h2>

        {organizations.length === 0 ? (
          <p className="rounded-lg border border-rule bg-surface p-5 text-sm text-ink-soft">
            No organizations yet. The built-in programs (Catalyst, BGC, Forte,
            Beyond Code Centers, Beyond the Game) are defined in code and aren't
            listed here.
          </p>
        ) : (
          <ul className="divide-y divide-rule rounded-lg border border-rule">
            {organizations.map((org) => (
              <li key={org.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  {/* The name IS the door: switch into the org and land on its
                      admin home (courses, people, curriculum). */}
                  <a
                    href={`/api/switch-program?slug=${org.slug}&next=/dashboard/admin`}
                    className="flex items-center gap-2 font-semibold text-ink hover:text-primary hover:underline"
                  >
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 shrink-0 rounded-full border border-rule"
                      style={{ backgroundColor: org.accent ?? "#1D59FF" }}
                    />
                    {org.name}
                    <span aria-hidden className="text-ink-faint">→</span>
                  </a>
                  <p className="mt-0.5 font-mono text-xs text-ink-soft break-all">
                    {org.landingPublished
                      ? `bccacademy.io/bcc/${org.slug}`
                      : `bccacademy.io/join/${org.slug}`}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {org.courseCount} {org.courseCount === 1 ? "course" : "courses"}
                    {" · "}
                    {org.landingPublished === null
                      ? "no landing page"
                      : org.landingPublished
                        ? "landing page published"
                        : "landing page draft"}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-4">
                  <a
                    href={`/dashboard/admin/programs/new?program=${org.slug}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Add course
                  </a>
                  <OrgBrandingEditor
                    slug={org.slug}
                    initialAccent={org.accent}
                    initialLogoUrl={org.logoUrl}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
