import Link from "next/link";
import { type ComponentType } from "react";
import { ArrowRight, ChatCircle, BookOpen } from "@phosphor-icons/react/dist/ssr";

type TrackTile = {
  slug: string;
  name: string;
  instructor: string;
  totalWeeks: number;
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
 * The learner home — a multi-course hub, composed in tiers separated by space
 * and weight rather than more boxes:
 *   1. Do now      — Continue bar for the most-active course (primary; shadow)
 *   2. Your courses — one compact card per enrolled course (progress + resume)
 *   3. Other programs — cross-program enrollments (a labelled group)
 *   4. Utilities   — quick links, demoted below a rule, lighter (no shadow)
 * The per-session list lives on the track page, not here — enumerating it on
 * the home duplicated the track overview for single-course learners.
 * White-forward and skin-driven; no dark anchor tile.
 */
export function DashboardBento({
  tracks,
  otherCourses,
}: {
  tracks: TrackTile[];
  otherCourses: OtherCourse[];
}) {
  if (tracks.length === 0) return null;
  const hero = tracks[0];
  // The continue bar already IS the active course — list only the *others*
  // below, so a single-course learner never sees a duplicate resume button.
  const rest = tracks.slice(1);
  const activeWeek = hero.started ? Math.max(1, hero.currentWeek) : 1;
  const heroDone = hero.started ? Math.max(0, hero.currentWeek - 1) : 0;
  const heroPct = Math.round((heroDone / hero.totalWeeks) * 100);

  return (
    <div>
      {/* ── Do now: continue bar ───────────────────────────────────────── */}
      <Link
        href={`/dashboard/track/${hero.slug}/${activeWeek}`}
        className="group flex items-center gap-4 panel p-4 shadow-sm transition-shadow hover:shadow-sm sm:gap-5 sm:p-5"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary text-[15px] font-bold tracking-[-0.02em] text-white tabular-nums sm:h-14 sm:w-14">
          W{activeWeek}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink-faint">
            {hero.started ? "Continue where you left off" : "Start your first session"}
          </p>
          <p className="mt-0.5 truncate text-[15px] font-semibold tracking-[-0.01em] text-ink sm:text-base">
            {hero.currentTopic || hero.name}
          </p>
          <div className="mt-2 hidden h-1 max-w-[260px] overflow-hidden rounded-full bg-paper-tint sm:block">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${heroPct}%` }} />
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-transform group-hover:translate-x-0.5 sm:px-5">
          {hero.started ? "Resume" : "Start"}
          <ArrowRight size={15} weight="bold" aria-hidden />
        </span>
      </Link>

      {/* ── Your other courses: only when there's more than one ────────── */}
      {rest.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-[17px] font-bold tracking-[-0.015em] text-ink">Your other courses</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.map((t) => {
              const done = t.started ? Math.max(0, t.currentWeek - 1) : 0;
              const resumeWeek = t.started ? Math.max(1, t.currentWeek) : 1;
              const trackPct = Math.round((done / t.totalWeeks) * 100);
              return (
                <Link
                  key={t.slug}
                  href={`/dashboard/track/${t.slug}/${resumeWeek}`}
                  className="group flex flex-col justify-between gap-5 panel p-5 shadow-sm transition-shadow hover:shadow-sm"
                >
                  <div>
                    <p className="text-base font-bold tracking-[-0.01em] text-ink">{t.name}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">with {t.instructor}</p>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between text-xs font-semibold text-ink-faint">
                      <span>
                        {t.started ? `${done} of ${t.totalWeeks} complete` : `${t.totalWeeks} weeks · not started`}
                      </span>
                      <span className="inline-flex items-center gap-1 text-primary transition-transform group-hover:translate-x-0.5">
                        {t.started ? "Resume" : "Start"}
                        <ArrowRight size={13} weight="bold" aria-hidden />
                      </span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper-tint">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${trackPct}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Other programs: cross-program enrollments (switch required) ─── */}
      {otherCourses.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            Other programs
          </h2>
          <div className="space-y-4">
            {otherCourses.map((c) => (
              <a
                key={c.trackSlug}
                href={`/dashboard/switch-program?track=${encodeURIComponent(c.trackSlug)}`}
                className="group flex items-center justify-between gap-4 rounded-lg border border-dashed border-rule p-5 transition-colors hover:border-ink-faint hover:bg-surface-elevated"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                    {c.programName} · another program
                  </p>
                  <p className="mt-1 truncate text-base font-bold tracking-[-0.01em] text-ink">{c.trackName}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">with {c.instructor}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-ink">
                  Switch
                  <ArrowRight size={13} weight="bold" aria-hidden />
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── Utilities: quick links, demoted below a rule, lighter weight ─ */}
      <div className="mt-14 grid gap-3 border-t border-rule pt-6 sm:grid-cols-2 sm:gap-4">
        <QuickLink href="/dashboard/tutor" label="AI Tutor" sub="Ask anything, anytime" Icon={ChatCircle} />
        <QuickLink href="/dashboard/resources" label="Resources" sub="Materials & contacts" Icon={BookOpen} />
      </div>
    </div>
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
