import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { getProgramBySlug } from "@/lib/programs";
import { createServiceClient } from "@/lib/supabase/server";
import { EditCourseForm } from "./edit-course-form";

type OverrideRow = {
  track_slug: string;
  name: string | null;
  instructor: string | null;
  total_weeks: number | null;
  sessions_per_week: number | null;
};

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  // Only builder-created courses can be edited — TS-config slugs are read-only
  const catalystTracks = getProgramBySlug("catalyst").tracks;
  if (catalystTracks.some((t) => t.slug === slug)) redirect("/dashboard/admin/programs");

  const svc = createServiceClient();
  const { data: catalystRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", "catalyst")
    .single<{ id: string }>();
  if (!catalystRow) redirect("/dashboard/admin/programs");

  const { data: override } = await svc
    .from("track_overrides")
    .select("track_slug, name, instructor, total_weeks, sessions_per_week")
    .eq("program_id", catalystRow.id)
    .eq("track_slug", slug)
    .maybeSingle<OverrideRow>();

  if (!override) redirect("/dashboard/admin/programs");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <Link
          href="/dashboard/admin/programs"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-4"
        >
          ← Courses
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Edit Course</h1>
        <p className="mt-1 text-xs text-neutral-400 font-mono">{slug}</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <EditCourseForm
          trackSlug={slug}
          initialName={override.name ?? ""}
          initialInstructor={override.instructor ?? ""}
          initialTotalWeeks={override.total_weeks ?? 1}
          initialSessionsPerWeek={override.sessions_per_week ?? 1}
        />
      </div>
    </div>
  );
}
