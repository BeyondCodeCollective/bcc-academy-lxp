import Link from "next/link";

export type CourseCardTile = {
  slug: string;
  name: string;
  instructor: string;
  /** "Tue & Thu · 6:30 PM ET" — when the course meets. */
  schedule?: string;
  /** Units a learner is graded on — excludes extras like a kickoff. */
  numberedUnits: number;
  /** Singular, lowercased for prose: "session", "week", "day". */
  unitNoun: string;
  /** Sessions attended or watched, counted in displayed units. */
  unitsDone: number;
  currentWeek: number;
  started: boolean;
  /** "Mon, Sep 21" — shown before start instead of progress. */
  startsLabel?: string;
};

export type OtherProgramCourse = {
  trackSlug: string;
  trackName: string;
  instructor: string;
  programName: string;
};

/**
 * The learner home's course list — one plain card per enrollment, every card
 * the same size, every card a link to that course's home.
 *
 * Replaces DashboardBento, whose hero tile restated the band above it (course
 * name, this week's topic, a Resume button to the same session the band's
 * button already opened). The band answers "what now"; the cards answer
 * "where am I in each course" and get out of the way.
 */
export function CourseCards({
  tracks,
  otherCourses,
}: {
  tracks: CourseCardTile[];
  otherCourses: OtherProgramCourse[];
}) {
  if (tracks.length === 0 && otherCourses.length === 0) return null;
  const count = tracks.length + otherCourses.length;

  return (
    <section aria-label="Your courses">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-semibold text-ink">Your courses</h2>
        <span className="text-[12.5px] text-ink-faint">
          {count} {count === 1 ? "course" : "courses"}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {tracks.map((t) => {
          const pct =
            t.numberedUnits > 0 ? Math.round((t.unitsDone / t.numberedUnits) * 100) : 0;
          return (
            <Link
              key={t.slug}
              href={`/dashboard/track/${t.slug}`}
              className="panel flex flex-col gap-3 p-[18px] transition-colors hover:border-ink-faint"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  {t.started
                    ? `${capitalize(t.unitNoun)} ${Math.max(1, t.currentWeek)} of ${t.numberedUnits}`
                    : t.startsLabel
                      ? `Starts ${t.startsLabel}`
                      : "Not started"}
                </p>
                <h3 className="mt-1 text-[17px] font-semibold leading-snug text-ink">{t.name}</h3>
                <p className="mt-0.5 text-[12.5px] text-ink-soft">
                  {[t.instructor, t.schedule].filter(Boolean).join(" · ")}
                </p>
              </div>
              {t.started ? (
                <div className="flex items-center gap-3">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-paper-tint-soft">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono text-[12px] tabular-nums text-ink-faint">
                    {t.unitsDone} of {t.numberedUnits} {t.unitNoun}s done
                  </span>
                </div>
              ) : (
                <p className="text-[12px] text-ink-faint">Your seat is saved</p>
              )}
            </Link>
          );
        })}

        {otherCourses.map((c) => (
          <Link
            key={c.trackSlug}
            href={`/dashboard/switch-program?track=${encodeURIComponent(c.trackSlug)}`}
            className="panel flex flex-col gap-3 p-[18px] transition-colors hover:border-ink-faint"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {c.programName}
              </p>
              <h3 className="mt-1 text-[17px] font-semibold leading-snug text-ink">{c.trackName}</h3>
              {c.instructor && (
                <p className="mt-0.5 text-[12.5px] text-ink-soft">{c.instructor}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
