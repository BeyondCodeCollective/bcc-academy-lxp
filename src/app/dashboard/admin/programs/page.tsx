import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { getProgramBySlug } from "@/lib/programs";
import { createServiceClient } from "@/lib/supabase/server";
import { CoursesList } from "./courses-list";
import type { CourseRow } from "./courses-list";

export default async function ProgramsListPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  // All courses are tracks inside Catalyst. Start with TS-config tracks.
  const catalyst = getProgramBySlug("catalyst");
  const tsTrackSlugs = new Set(catalyst.tracks.map((t) => t.slug));

  const tsCourses: CourseRow[] = catalyst.tracks.map((t) => ({
    slug: t.slug,
    programSlug: "catalyst",
    name: t.name,
    joinUrl: `https://bccacademy.io/join/catalyst?track=${t.slug}`,
  }));

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
      .select("track_slug, name")
      .eq("program_id", catalystRow.id)
      .order("name");
    dynamicCourses = (overrides ?? [])
      .filter((o) => !tsTrackSlugs.has(o.track_slug as string))
      .map((o) => ({
        slug: o.track_slug as string,
        programSlug: "catalyst",
        name: (o.name as string | null) ?? (o.track_slug as string),
        joinUrl: `https://bccacademy.io/join/catalyst?track=${o.track_slug}`,
      }));
  }

  const allCourses = [...tsCourses, ...dynamicCourses].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-4"
          >
            ← Admin
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Courses</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Click any course to manage it, or copy its join link.
          </p>
        </div>
        <Link
          href="/dashboard/admin/programs/new"
          className="shrink-0 mt-1 rounded-lg bg-[#E54D2E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#F0613E] transition-colors"
        >
          New Course
        </Link>
      </div>

      <CoursesList courses={allCourses} />
    </div>
  );
}
