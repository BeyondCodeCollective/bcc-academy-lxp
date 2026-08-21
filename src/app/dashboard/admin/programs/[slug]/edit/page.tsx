import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms, canManageRoles } from "@/lib/roles";
import {
  getProgram,
  getProgramWithOverrides,
  resolveHomeProgramSlug,
  fetchDynamicProgram,
} from "@/lib/programs/server";
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
  // row and can live under ANY program.
  //
  // No blanket Catalyst fallback. Catalyst is a program like any other, not the
  // place unattached things land: a course whose owner can't be resolved is a
  // data problem, and filing it under Catalyst is how a Black Girls Code course
  // came to be edited inside Catalyst's shell.
  const programSlug = await resolveHomeProgramSlug(slug);
  if (!programSlug) redirect("/dashboard/admin/programs");

  // The admin shell — sidebar, program name, Manage menu, every program-scoped
  // query behind it — follows the program-override cookie, not the course being
  // edited. Opening a BGC course while switched into Catalyst rendered Catalyst
  // chrome around a BGC course and read as "this belongs to Catalyst". Follow
  // the course to its owner instead, then come back to this exact page.
  const current = await getProgram();
  if (current.slug !== programSlug) {
    const next = encodeURIComponent(`/dashboard/admin/programs/${slug}/edit`);
    redirect(`/api/switch-program?slug=${programSlug}&next=${next}`);
  }

  // Dynamic orgs have no TS config, so getProgramWithOverrides can't build
  // them. An org that can't be loaded bounces to the list rather than being
  // rendered in someone else's program.
  const program = hasTsConfigSlug(programSlug)
    ? await getProgramWithOverrides(programSlug)
    : await fetchDynamicProgram(programSlug);
  if (!program) redirect("/dashboard/admin/programs");
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
