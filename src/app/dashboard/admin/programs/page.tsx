import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { getJoinablePrograms, getHomeProgramForTrack } from "@/lib/programs";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { getHiddenTrackSlugs } from "@/lib/programs/hidden";
import { CoursesList } from "./courses-list";
import type { CourseRow, ProgramGroup } from "./courses-list";
import { PageHeader } from "@/components/page-header";
import { ManageMenu } from "../manage-menu";
import { buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProgramsListPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const hidden = await getHiddenTrackSlugs();
  const programs = getJoinablePrograms();

  // DB-overridden track data per program (names reflect track_overrides, and
  // builder-created courses are appended).
  const withOverrides = await Promise.all(
    programs.map((p) => getProgramWithOverrides(p.slug)),
  );

  const groups: ProgramGroup[] = withOverrides
    .map((prog) => {
      const rows: CourseRow[] = prog.tracks
        // Catalyst aggregates other programs' tracks. List each track under its
        // HOME program only, so it appears once. Builder courses (no TS home)
        // stay under the program whose overrides created them.
        .filter((t) => {
          const home = getHomeProgramForTrack(t.slug)?.slug;
          return !home || home === prog.slug;
        })
        .map((t) => ({
          slug: t.slug,
          programSlug: prog.slug,
          name: t.name,
          joinUrl: `https://bccacademy.io/join/${prog.slug}?track=${t.slug}`,
          hidden: hidden.has(t.slug),
          // Every course is editable now — saving upserts a track_overrides row
          // even for hardcoded courses (DB-driven, no deploy needed).
          isEditable: true,
        }));

      const byName = (a: CourseRow, b: CourseRow) => a.name.localeCompare(b.name);
      return {
        programSlug: prog.slug,
        programName: prog.name,
        active: rows.filter((r) => !r.hidden).sort(byName),
        hidden: rows.filter((r) => r.hidden).sort(byName),
      };
    })
    .filter((g) => g.active.length > 0 || g.hidden.length > 0);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8 space-y-6">
      <div>
        <PageHeader
          title="Courses"
          subtitle="Every course across all programs. Click a course to manage it, copy its join link, or hide it from the admin and catalog (reversible — nothing is deleted)."
          actions={
            <div className="flex items-center gap-2">
              <ManageMenu />
              <Link
                href="/dashboard/admin/programs/new"
                className={`${buttonClass("primary", "md")} shrink-0`}
              >
                New Course
              </Link>
            </div>
          }
        />
      </div>

      <CoursesList groups={groups} />
    </div>
  );
}
