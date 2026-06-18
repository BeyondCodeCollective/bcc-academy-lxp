import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveCurrentUser } from "@/lib/current-user";
import { getProgram, getProgramWithOverrides } from "@/lib/programs/server";
import { getJoinablePrograms, getHomeProgramForTrack } from "@/lib/programs";
import { getHiddenTrackSlugs } from "@/lib/programs/hidden";
import { canAccessAdminPanel } from "@/lib/roles";
import { toneForTrack } from "@/lib/track-visual";
import { CatalogCard } from "@/components/catalog-card";
import { PageHeader, Section } from "@/components/page-header";
import type { TrackConfig } from "@/lib/programs/types";

export const dynamic = "force-dynamic";

export default async function CoursesIndexPage() {
  const cookieStore = await cookies();
  const currentUser = await resolveCurrentUser(cookieStore);
  if (!currentUser) redirect("/");

  // Catalog is admin-only. Students who hit this URL directly bounce back
  // to /dashboard where their track grid already lives — they don't see a
  // browsable catalog of programs they aren't enrolled in. Matches the
  // nav, which only renders the Courses link for admins.
  if (!canAccessAdminPanel(currentUser.userRole)) {
    redirect("/dashboard");
  }

  const program = await getProgram();

  // Hidden courses are dropped from the catalog too (reversible via Manage
  // Courses). Keeps the browse view in sync with the admin home.
  const hidden = await getHiddenTrackSlugs();

  // Catalog is scoped to the CURRENT program — `program.tracks` already
  // reflects it (Catalyst, the umbrella, aggregates its sub-programs' tracks; a
  // specific program like Upskill Bahamas shows only its own). We still group
  // by home program/org for a clean per-org layout, but only courses that
  // belong to the program you're in appear. Names reflect DB overrides;
  // single-event tracks belong on /workshops.
  const currentSlugs = new Set(program.tracks.map((t) => t.slug));
  const programs = getJoinablePrograms();
  const withOverrides = await Promise.all(
    programs.map((p) => getProgramWithOverrides(p.slug)),
  );

  const sections = withOverrides
    .map((prog) => ({
      key: prog.slug,
      label: prog.name,
      items: prog.tracks
        .filter((t) => {
          const home = getHomeProgramForTrack(t.slug)?.slug;
          return (
            (!home || home === prog.slug) &&
            t.type !== "single-event" &&
            !hidden.has(t.slug) &&
            currentSlugs.has(t.slug)
          );
        })
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        ),
    }))
    .filter((s) => s.items.length > 0);

  const cohortTracks = sections.flatMap((s) => s.items);

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 space-y-10">
      <PageHeader
        title="Courses"
        subtitle={`Every track offered through ${program.name}. Open any course to see the curriculum, instructor, and start date.`}
      />

      {cohortTracks.length === 0 ? (
        <p className="panel px-5 py-8 text-center text-sm text-ink-soft">
          No courses yet.
        </p>
      ) : (
        sections.map((section) => (
          <Section key={section.key} label={section.label} count={section.items.length}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((track) => (
                <CourseRow
                  key={track.slug}
                  track={track}
                  inProgram={program.tracks.some((t) => t.slug === track.slug)}
                />
              ))}
            </div>
          </Section>
        ))
      )}
    </div>
  );
}

function CourseRow({ track, inProgram }: { track: TrackConfig; inProgram: boolean }) {
  const tone = toneForTrack(track.slug);
  const start = new Date(track.startDate);
  const hasStarted = start <= new Date();
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const durationLabel =
    track.type === "single-event"
      ? "Single session"
      : `${track.totalWeeks} weeks${
          track.sessionsPerWeek > 1 ? ` · ${track.sessionsPerWeek}×/wk` : ""
        }`;

  return (
    <CatalogCard
      href={
        inProgram
          ? `/dashboard/track/${track.slug}`
          : `/dashboard/switch-program?track=${encodeURIComponent(track.slug)}`
      }
      // Courses in the current program get an Edit shortcut into the per-track
      // admin view. Out-of-program tracks have no admin tab here (you'd switch
      // programs first), so the card just opens the view route.
      editHref={inProgram ? `/dashboard/admin?tab=${track.slug}` : undefined}
      tone={tone}
      iconSlug={track.slug}
      eyebrow={durationLabel}
      title={track.shortName || track.name}
      byline={`with ${track.instructor}`}
      status={hasStarted ? "In progress" : "Upcoming"}
      trailing={
        track.startDateTbd
          ? "Starts TBD"
          : `${hasStarted ? "Started" : "Starts"} ${startLabel}`
      }
    />
  );
}