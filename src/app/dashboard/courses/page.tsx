import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveCurrentUser } from "@/lib/current-user";
import { getProgram } from "@/lib/programs/server";
import { toneForTrack, iconForTrack } from "@/lib/track-visual";
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

  const program = await getProgram();

  // Group tracks by phase so the catalog reads as a taxonomy, not a flat dump.
  const grouped = new Map<string, TrackConfig[]>();
  for (const t of program.tracks) {
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
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Courses
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Every track offered through {program.name}. Open any course to see
          the curriculum, instructor, and start date.
        </p>
      </header>

      {program.tracks.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white px-5 py-8 text-center text-sm text-neutral-500">
          No courses yet.
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.key} className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                {section.label}
              </h2>
              <span className="text-xs tabular-nums text-neutral-400">
                {section.items.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((track) => (
                <CourseCard key={track.slug} track={track} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function CourseCard({ track }: { track: TrackConfig }) {
  const tone = toneForTrack(track.slug);
  const Icon = iconForTrack(track.slug);
  const start = new Date(track.startDate);
  const now = new Date();
  const hasStarted = start <= now;
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const durationLabel =
    track.type === "single-event"
      ? "Single session"
      : `${track.totalWeeks}-week track${
          track.sessionsPerWeek > 1 ? ` · ${track.sessionsPerWeek}×/wk` : ""
        }`;

  const blurb =
    track.description || track.weekSummaries[0]?.topic || "";

  return (
    <Link
      href={`/dashboard/track/${track.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-colors hover:border-neutral-300"
    >
      <div
        aria-hidden
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden"
        style={{ backgroundColor: `${tone}1A` }}
      >
        <Icon size={56} weight="light" color={tone} />
        <div className="absolute top-3 right-3">
          <span
            className="inline-flex items-center rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold backdrop-blur"
            style={{ color: tone }}
          >
            {hasStarted ? "In progress" : "Upcoming"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
          {durationLabel}
        </p>
        <h3 className="mt-2 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-neutral-900 line-clamp-2">
          {track.shortName || track.name}
        </h3>
        <p className="mt-1 text-[13px] text-neutral-500">
          with {track.instructor}
        </p>
        {blurb && (
          <p className="mt-3 text-[13px] leading-[1.55] text-neutral-600 line-clamp-3">
            {blurb}
          </p>
        )}
        <p className="mt-auto pt-4 text-[12px] text-neutral-500">
          {hasStarted ? "Started" : "Starts"} {startLabel}
        </p>
      </div>
    </Link>
  );
}
