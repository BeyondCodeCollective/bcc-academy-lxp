import Link from "next/link";
import { type ComponentType } from "react";
import { ArrowRight, ChatCircle, BookOpen } from "@phosphor-icons/react/dist/ssr";
import { TUTOR_DISABLED_PRELAUNCH } from "@/lib/programs";

type TrackTile = {
  slug: string;
  name: string;
  instructor: string;
  /** Units a learner is graded on — excludes extras like a kickoff. */
  numberedUnits: number;
  /** Singular, lowercased for prose: "session", "week", "day". */
  unitNoun: string;
  /** Displayed progress, already in unit numbers (an extra consumes none). */
  unitsDone: number;
  currentWeek: number;
  started: boolean;
  currentTopic: string;
};

type OtherCourse = {
  trackSlug: string;
  trackName: string;
  instructor: string;
  programName: string;
};

/**
 * The learner home — only ever seen by MULTI-course learners (single-course
 * students are redirected straight to their course). So it's a flat, equal
 * grid: every course is the same card (program · course · progress · resume),
 * no "continue" hero and no "other programs" demotion. Pick up any course in
 * one click. Cross-program courses route through /switch-program first.
 */
export function DashboardBento({
  tracks,
  otherCourses,
  programName,
}: {
  tracks: TrackTile[];
  otherCourses: OtherCourse[];
  programName: string;
}) {
  if (tracks.length === 0 && otherCourses.length === 0) return null;

  return (
    <div>
      <section>
        <h2 className="mb-4 text-[17px] font-bold tracking-[-0.015em] text-ink">Your courses</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {tracks.map((t) => {
            const done = t.started ? t.unitsDone : 0;
            const resumeWeek = t.started ? Math.max(1, t.currentWeek) : 1;
            const pct = t.numberedUnits > 0 ? Math.round((done / t.numberedUnits) * 100) : 0;
            return (
              <CourseCard
                key={t.slug}
                // Before day one every session is locked, so link to the course
                // itself rather than a session page that redirects right back.
                href={
                  t.started
                    ? `/dashboard/track/${t.slug}/${resumeWeek}`
                    : `/dashboard/track/${t.slug}`
                }
                program={programName}
                name={t.name}
                instructor={t.instructor}
                progress={{
                  label: t.started
                    ? `${done} of ${t.numberedUnits} complete`
                    : `${t.numberedUnits} ${t.unitNoun}s · not started`,
                  pct,
                }}
                action={t.started ? "Resume" : "Start"}
              />
            );
          })}

          {otherCourses.map((c) => (
            <CourseCard
              key={c.trackSlug}
              href={`/dashboard/switch-program?track=${encodeURIComponent(c.trackSlug)}`}
              program={c.programName}
              name={c.trackName}
              instructor={c.instructor}
              action="Open"
            />
          ))}
        </div>
      </section>

      {/* Utilities, demoted below a rule. Hidden while the AI Tutor is disabled
          pre-launch — the links would otherwise 404 / show a coming-soon page. */}
      {!TUTOR_DISABLED_PRELAUNCH && (
        <div className="mt-14 grid gap-3 border-t border-rule pt-6 sm:grid-cols-2 sm:gap-4">
          <QuickLink href="/dashboard/tutor" label="AI Tutor" sub="Ask anything, anytime" Icon={ChatCircle} />
          <QuickLink href="/dashboard/resources" label="Resources" sub="Materials & contacts" Icon={BookOpen} />
        </div>
      )}
    </div>
  );
}

function CourseCard({
  href,
  program,
  name,
  instructor,
  progress,
  action,
}: {
  href: string;
  program: string;
  name: string;
  instructor: string;
  progress?: { label: string; pct: number };
  action: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between gap-5 panel p-5 shadow-sm transition-shadow hover:shadow-sm"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">{program}</p>
        <p className="mt-1 text-base font-bold tracking-[-0.01em] text-ink">{name}</p>
        {instructor && <p className="mt-0.5 text-xs text-ink-soft">with {instructor}</p>}
      </div>
      <div>
        <div className="flex items-baseline justify-between text-xs font-semibold text-ink-faint">
          <span>{progress?.label ?? ""}</span>
          <span className="inline-flex items-center gap-1 text-primary transition-transform group-hover:translate-x-0.5">
            {action}
            <ArrowRight size={13} weight="bold" aria-hidden />
          </span>
        </div>
        {progress && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper-tint">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
        )}
      </div>
    </Link>
  );
}

function QuickLink({
  href,
  label,
  sub,
  Icon,
}: {
  href: string;
  label: string;
  sub: string;
  Icon: ComponentType<{ size?: number; weight?: "bold"; className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-rule px-4 py-3.5 transition-colors hover:bg-paper-tint-soft"
    >
      <Icon size={18} weight="bold" className="shrink-0 text-ink-faint" aria-hidden />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block text-xs text-ink-soft">{sub}</span>
      </span>
    </Link>
  );
}
