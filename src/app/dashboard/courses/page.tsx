import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveCurrentUser } from "@/lib/current-user";
import { getProgram } from "@/lib/programs/server";
import { getJoinablePrograms } from "@/lib/programs";
import { getHiddenTrackSlugs } from "@/lib/programs/hidden";
import { canAccessAdminPanel } from "@/lib/roles";
import { toneForTrack } from "@/lib/track-visual";
import { CatalogCard } from "@/components/catalog-card";
import { PageHeader, Section } from "@/components/page-header";
import type { TrackConfig } from "@/lib/programs/types";

export const dynamic = "force-dynamic";

const PHASE_ORDER: { key: string; label: string }[] = [
  { key: "foundation", label: "Foundation" },
  { key: "core", label: "Core" },
  { key: "workshop", label: "Workshops" },
  { key: "exit", label: "Exit" },
];

function phaseLabel(key: string): string {
  return (
    PHASE_ORDER.find((p) => p.key === key)?.label ??
    key.charAt(0).toUpperCase() + key.slice(1)
  );
}

function phaseRank(key: string): number {
  const i = PHASE_ORDER.findIndex((p) => p.key === key);
  return i === -1 ? PHASE_ORDER.length : i;
}

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

  // This is the admin "every track offered through BCC Academy" catalog, so
  // aggregate tracks across ALL programs — not just the current one. On the
  // apex (the "BCC Academy" marketing shell with no tracks of its own) or any
  // single program, scoping to program.tracks made the catalog read "No
  // courses yet" even though courses exist under other programs.
  const allTracks = Array.from(
    new Map(
      getJoinablePrograms()
        .flatMap((p) => p.tracks)
        .map((t) => [t.slug, t]),
    ).values(),
  );

  // Hidden courses are dropped from the catalog too (reversible via Manage
  // Courses). Keeps the browse view in sync with the admin home.
  const hidden = await getHiddenTrackSlugs();

  // Courses = multi-week cohort tracks. Single-event tracks (e.g. the
  // 2-hour AI Automation Bootcamp) belong on /dashboard/workshops, not
  // here — including them surfaced a "Workshops" phase header inside the
  // courses catalog, which conflicted with the dedicated workshops hub.
  const cohortTracks = allTracks.filter(
    (t) => t.type !== "single-event" && !hidden.has(t.slug),
  );

  // Group tracks by phase so the catalog reads as a taxonomy, not a flat dump.
  const grouped = new Map<string, TrackConfig[]>();
  for (const t of cohortTracks) {
    const key = t.phase ?? "other";
    const arr = grouped.get(key) ?? [];
    arr.push(t);
    grouped.set(key, arr);
  }
  const sections = Array.from(grouped.entries())
    .map(([key, items]) => ({
      key,
      label: phaseLabel(key),
      items: [...items].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      ),
    }))
    .sort((a, b) => phaseRank(a.key) - phaseRank(b.key));

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