import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms, canManageRoles } from "@/lib/roles";
import { getProgramWithOverrides, resolveHomeProgramSlug, fetchDynamicProgram } from "@/lib/programs/server";
import { hasTsConfigSlug } from "@/lib/programs";
import { EditCourseForm } from "./edit-course-form";
import { PageHeader } from "@/components/page-header";
import { COHORT_TIME_ZONE } from "@/lib/utils";
import { ManageMenu } from "../../../manage-menu";

export const dynamic = "force-dynamic";

/** Today in the cohort timezone as YYYY-MM-DD, for the empty-schedule default. */
function todayInEasternISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: COHORT_TIME_ZONE });
}

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
  // Dynamic orgs have no TS config — getProgramWithOverrides would fall back
  // to Catalyst, miss the track, and bounce back to the list (a dead loop).
  const program = hasTsConfigSlug(programSlug)
    ? await getProgramWithOverrides(programSlug)
    : ((await fetchDynamicProgram(programSlug)) ?? (await getProgramWithOverrides("catalyst")));
  const track = program.tracks.find((t) => t.slug === slug);
  if (!track) redirect("/dashboard/admin/programs");

  // Pre-fill the schedule from the first dated numbered unit, if one exists.
  const firstDated = [...track.weekSummaries]
    .sort((a, b) => a.week - b.week)
    .find((ws) => !ws.label && ws.date);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <PageHeader title="Edit Course" actions={<ManageMenu isMaster={canManageRoles(ctx.userEmail)} />} />
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
          initialCoverImageUrl={track.coverImageUrl ?? ""}
          // Empty defaults to today rather than a blank year. A blank one is
          // how a course got stamped 2024: the admin typed the month and day,
          // the year came from somewhere else, and a program starting in
          // September 2026 pinned itself to "Week 7 of 7" because it had
          // apparently ended two years ago.
          initialFirstDate={firstDated?.date ?? todayInEasternISO()}
          todayIso={todayInEasternISO()}
          initialTime={firstDated?.time ?? ""}
          initialDuration={firstDated?.durationMinutes ? String(firstDated.durationMinutes) : ""}
        />
      </div>
    </div>
  );
}
