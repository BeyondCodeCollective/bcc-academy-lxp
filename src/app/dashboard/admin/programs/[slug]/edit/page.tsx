import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { getHomeProgramForTrack } from "@/lib/programs";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { EditCourseForm } from "./edit-course-form";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  // Every course is editable. Resolve the course's home program (builder
  // courses with no TS home live under Catalyst), load its CURRENT merged
  // values (TS config + any existing override), and pre-fill the form. Saving
  // upserts a track_overrides row, so even a hardcoded course becomes
  // DB-editable on first edit — no deploy required.
  const programSlug = getHomeProgramForTrack(slug)?.slug ?? "catalyst";
  const program = await getProgramWithOverrides(programSlug);
  const track = program.tracks.find((t) => t.slug === slug);
  if (!track) redirect("/dashboard/admin/programs");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <PageHeader title="Edit Course" />
        <p className="mt-1 text-xs text-ink-faint font-mono">
          {track.name} · {programSlug}
        </p>
      </div>

      <div className="rounded-lg border border-rule bg-white p-6">
        <EditCourseForm
          programSlug={programSlug}
          trackSlug={slug}
          initialName={track.name}
          initialInstructor={track.instructor}
          initialTotalWeeks={track.totalWeeks}
          initialSessionsPerWeek={track.sessionsPerWeek}
          initialPhase={track.phase ?? "core"}
        />
      </div>
    </div>
  );
}
