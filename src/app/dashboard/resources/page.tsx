import { redirect } from "next/navigation";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";
import { getProgram } from "@/lib/programs/server";
import {
  enrolledTrackSlugs,
  fetchResourcesForProgram,
  visibleResources,
  type Resource,
} from "@/lib/resources";
import { PageHeader, Section } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");

  const program = await getProgram();
  const [all, enrolled] = await Promise.all([
    fetchResourcesForProgram(program.slug),
    enrolledTrackSlugs(ctx.userId),
  ]);
  // Program-wide items plus those scoped to a course this learner is in.
  // Admins see every scope — they manage resources for courses they aren't
  // enrolled in, and an empty page right after publishing reads as broken.
  // Preview-as-student keeps the real learner view.
  const role = ctx.student?.role ?? "";
  const seesAll =
    canAccessAdminPanel(role) && !(await isPreviewingAsStudent(role));
  const resources = seesAll ? all : visibleResources(all, enrolled);

  // Group by category, preserving sort order; blank category → "Resources".
  // Course-scoped items lead with the course name so a learner in two courses
  // can tell whose "Tools" is whose.
  const trackNames = new Map(program.tracks.map((t) => [t.slug, t.name]));
  const groups = new Map<string, Resource[]>();
  for (const r of resources) {
    const category = r.category?.trim() || "Resources";
    const key = r.track_slug
      ? `${trackNames.get(r.track_slug) ?? r.track_slug} · ${category}`
      : category;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 space-y-10">
      <PageHeader
        title="Resources"
        subtitle={`Tools, materials, and links for ${program.name}.`}
      />

      {resources.length === 0 ? (
        <p className="panel px-5 py-10 text-center text-sm text-ink-soft">
          No resources yet — check back soon.
        </p>
      ) : (
        Array.from(groups.entries()).map(([category, items]) => (
          <Section key={category} label={category} count={items.length}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          </Section>
        ))
      )}
    </div>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const hasLink = !!resource.url?.trim();
  const inner = (
    <div className="panel group flex h-full flex-col p-5 transition-colors hover:border-ink-faint">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-2xl leading-none" aria-hidden>
          {resource.icon || "📌"}
        </span>
        {hasLink && (
          <ArrowUpRight
            size={16}
            className="text-ink-faint transition-colors group-hover:text-ink"
            aria-hidden
          />
        )}
      </div>
      <p className="text-[15px] font-semibold text-ink">{resource.title}</p>
      {resource.description && (
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
          {resource.description}
        </p>
      )}
    </div>
  );

  if (!hasLink) return inner;
  const external = /^https?:\/\//i.test(resource.url!.trim());
  return (
    <a
      href={resource.url!.trim()}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="block"
    >
      {inner}
    </a>
  );
}
