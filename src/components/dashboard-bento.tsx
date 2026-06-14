import Link from "next/link";
import { type ComponentType } from "react";
import { ArrowRight, ChatCircle, BookOpen, Check } from "@phosphor-icons/react/dist/ssr";

type WeekItem = { week: number; topic: string };

type TrackTile = {
  slug: string;
  name: string;
  instructor: string;
  totalWeeks: number;
  currentWeek: number;
  started: boolean;
  currentTopic: string;
  weeks: WeekItem[];
};

type OtherCourse = {
  trackSlug: string;
  trackName: string;
  instructor: string;
  programName: string;
};

/**
 * The learner home, composed in three tiers separated by space and weight
 * rather than more boxes:
 *   1. Do now      — Continue bar + session index (primary; carry a shadow)
 *   2. Explore     — other / cross-program courses (a labelled group)
 *   3. Utilities   — quick links, demoted below a rule, lighter (no shadow)
 * White-forward and skin-driven; no dark anchor tile.
 */
export function DashboardBento({
  tracks,
  pct,
  completedWeeks,
  totalProgramWeeks,
  otherCourses,
}: {
  tracks: TrackTile[];
  pct: number;
  completedWeeks: number;
  totalProgramWeeks: number;
  otherCourses: OtherCourse[];
}) {
  if (tracks.length === 0) return null;
  const [hero, ...rest] = tracks;
  const activeWeek = hero.started ? Math.max(1, hero.currentWeek) : 1;
  const hasExplore = rest.length > 0 || otherCourses.length > 0;

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
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-transform group-hover:translate-x-0.5 sm:px-5">
          {hero.started ? "Resume" : "Start"}
          <ArrowRight size={15} weight="bold" aria-hidden />
        </span>
      </Link>

      {/* ── Do now: session index (tight to the bar's tier) ────────────── */}
      {hero.weeks.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[17px] font-bold tracking-[-0.015em] text-ink">Your sessions</h2>
            <span className="text-xs text-ink-faint">
              {completedWeeks} of {totalProgramWeeks} complete
            </span>
          </div>
          <div className="overflow-hidden panel shadow-sm">
            {hero.weeks.map((w) => {
              const status =
                w.week === activeWeek
                  ? "current"
                  : hero.started && w.week < activeWeek
                    ? "done"
                    : "open";
              return (
                <Link
                  key={w.week}
                  href={`/dashboard/track/${hero.slug}/${w.week}`}
                  className={`flex items-center gap-4 border-b border-l-2 border-rule px-4 py-3.5 transition-colors last:border-b-0 hover:bg-paper-tint-soft ${
                    status === "current" ? "border-l-primary" : "border-l-transparent"
                  }`}
                >
                  <span
                    className={`w-7 shrink-0 text-[13px] font-semibold tabular-nums ${
                      status === "current" ? "text-primary" : "text-ink-faint"
                    }`}
                  >
                    {String(w.week).padStart(2, "0")}
                  </span>
                  <span
                    className={`flex-1 truncate text-[15px] font-semibold tracking-[-0.01em] ${
                      status === "done" ? "text-ink-soft" : "text-ink"
                    }`}
                  >
                    {w.topic}
                  </span>
                  {status === "done" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-faint">
                      <Check size={13} weight="bold" className="text-emerald-600" aria-hidden />
                      Done
                    </span>
                  ) : status === "current" ? (
                    <span className="text-xs font-semibold text-primary">
                      {hero.started ? "In progress" : "Start"}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-ink-faint">Open</span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Explore: other courses (tier break — generous, labelled) ───── */}
      {hasExplore && (
        <section className="mt-14">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            More to explore
          </h2>
          <div className="space-y-4">
            {rest.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {rest.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/dashboard/track/${t.slug}`}
                    className="group flex flex-col justify-between gap-5 panel p-5 shadow-sm transition-shadow hover:shadow-sm"
                  >
                    <span className="text-xs font-semibold text-ink-faint">{t.totalWeeks} weeks</span>
                    <div>
                      <p className="text-base font-bold tracking-[-0.01em] text-ink">{t.name}</p>
                      <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                        View course
                        <ArrowRight size={13} weight="bold" aria-hidden />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

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
