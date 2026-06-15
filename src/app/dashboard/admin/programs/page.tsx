import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { getProgramBySlug, getHomeProgramForTrack } from "@/lib/programs";
import { createServiceClient } from "@/lib/supabase/server";
import { CoursesList } from "./courses-list";
import type { CourseRow } from "./courses-list";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui";

export default async function ProgramsListPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  // All courses are tracks inside Catalyst. Start with TS-config tracks.
  const catalyst = getProgramBySlug("catalyst");
  const tsTrackSlugs = new Set(catalyst.tracks.map((t) => t.slug));

  const tsCourses: CourseRow[] = catalyst.tracks.map((t) => {
    const programSlug = getHomeProgramForTrack(t.slug)?.slug ?? "catalyst";
    return {
      slug: t.slug,
      programSlug,
      name: t.name,
      joinUrl: `https://bccacademy.io/join/${programSlug}?track=${t.slug}`,
      archived: false,
      isEditable: false,
    };
  });

  // Builder-created tracks: track_overrides rows under Catalyst not in TS config
  const svc = createServiceClient();
  const { data: catalystRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", "catalyst")
    .single<{ id: string }>();

  let dynamicCourses: CourseRow[] = [];
  if (catalystRow) {
    const { data: overrides } = await svc
      .from("track_overrides")
      .select("track_slug, name, archived_at")
      .eq("program_id", catalystRow.id)
      .order("name");
    dynamicCourses = (overrides ?? [])
      .filter((o) => !tsTrackSlugs.has(o.track_slug as string))
      .map((o) => ({
        slug: o.track_slug as string,
        programSlug: "catalyst",
        name: (o.name as string | null) ?? (o.track_slug as string),
        joinUrl: `https://bccacademy.io/join/catalyst?track=${o.track_slug}`,
        archived: !!(o.archived_at),
        isEditable: true,
      }));
  }

  const allCourses = [...tsCourses, ...dynamicCourses].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const activeCourses = allCourses.filter((c) => !c.archived);
  const archivedCourses = allCourses.filter((c) => c.archived);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink transition-colors mb-4"
        >
          ← Admin
        </Link>
        <PageHeader
          title="Courses"
          subtitle="Click any course to manage it, or copy its join link."
          actions={
            <Link
              href="/dashboard/admin/programs/new"
              className={`${buttonClass("primary", "md")} shrink-0 mt-1`}
            >
              New Course
            </Link>
          }
        />
      </div>

      <CoursesList courses={activeCourses} archivedCourses={archivedCourses} />
    </div>
  );
}
