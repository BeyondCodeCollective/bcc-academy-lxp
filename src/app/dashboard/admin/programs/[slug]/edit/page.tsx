import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { getProgramWithOverrides, resolveHomeProgramSlug } from "@/lib/programs/server";
import { EditCourseForm } from "./edit-course-form";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../../../manage-menu";

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

  // Every course is editable. Resolve the course's home program: TS-config
  // courses know their home; builder courses carry it on their track_overrides
  // row and can live under ANY program — the old blanket Catalyst fallback
  // bounced Beyond Code Centers builder courses straight back to the list.
  // Load the program's CURRENT merged values (TS config + any existing
  // override) and pre-fill the form. Saving upserts a track_overrides row, so
  // even a hardcoded course becomes DB-editable on first edit — no deploy
  // required.
  const programSlug = (await resolveHomeProgramSlug(slug)) ?? "catalyst";
  const program = await getProgramWithOverrides(programSlug);
  const track = program.tracks.find((t) => t.slug === slug);
  if (!track) redirect("/dashboard/admin/programs");

  // Pre-fill the schedule from the first dated numbered unit, if one exists.
  const firstDated = [...track.weekSummaries]
    .sort((a, b) => a.week - b.week)
    .find((ws) => !ws.label && ws.date);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <PageHeader title="Edit Course" actions={<ManageMenu />} />
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
          initialFirstDate={firstDated?.date ?? ""}
          initialTime={firstDated?.time ?? ""}
          initialDuration={firstDated?.durationMinutes ? String(firstDated.durationMinutes) : ""}
        />
      </div>
    </div>
  );
}
