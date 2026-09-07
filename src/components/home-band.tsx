import type { ReactNode } from "react";
import type { RailDay } from "@/lib/home-band";

/**
 * The home band — the first thing on the first screen.
 *
 * One object, two registers: a sentence that says where you stand, and a week
 * rail underneath as the evidence. It replaces a page that opened with a list
 * and never said what needed anyone's attention.
 *
 * Same component for staff and learners. Only the sentence, the stats and the
 * rail contents differ, which is deliberate — the shape of "what's going on"
 * is the same question whoever is asking it.
 */

export type BandStat = {
  value: string;
  label: string;
  /** Renders in electric green — reserve it for things that need a person. */
  urgent?: boolean;
};

export function HomeBand({
  eyebrow,
  headline,
  sub,
  stats,
  rail,
  children,
}: {
  eyebrow: string;
  /** May contain a single newline; it renders as a line break. */
  headline: string;
  sub?: string;
  stats?: BandStat[];
  rail?: RailDay[];
  /** Optional trailing row inside the band (a callout, an action). */
  children?: ReactNode;
}) {
  return (
    <section
      aria-label="Overview"
      className="stage-surface stage-grid relative isolate mb-5 overflow-hidden rounded-xl px-5 py-[18px] sm:px-[22px]"
    >
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-7">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/60">
              {eyebrow}
            </span>
            <h1 className="font-display text-[22px] font-extrabold leading-[1.12] tracking-[-0.035em] text-white sm:text-[25px]">
              {headline.split("\n").map((line, i, all) => (
                <span key={i}>
                  {line}
                  {i < all.length - 1 && <br />}
                </span>
              ))}
            </h1>
            {sub && <p className="text-[13px] text-white/[0.72]">{sub}</p>}
          </div>

          <div className="hidden flex-1 sm:block" />

          {stats && stats.length > 0 && (
            <div className="flex w-full shrink-0 items-stretch gap-2.5 sm:w-auto sm:gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className={`flex flex-1 flex-col justify-center gap-0.5 border-l-2 pl-3 sm:min-w-[86px] ${
                    s.urgent ? "border-highlight" : "border-white/[0.28]"
                  }`}
                >
                  <span
                    className={`font-display text-[19px] font-extrabold tabular-nums tracking-[-0.03em] sm:text-[23px] ${
                      s.urgent ? "text-highlight" : "text-white"
                    }`}
                  >
                    {s.value}
                  </span>
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-[0.13em] sm:text-[9.5px] ${
                      s.urgent ? "text-white/[0.72]" : "text-white/[0.58]"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {rail && rail.length > 0 && (
          <div className="flex gap-1.5 border-t border-white/[0.14] pt-3 sm:gap-2">
            {rail.map((day) => (
              <div
                key={day.dateKey}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-[7px] px-1 py-2 sm:items-start sm:px-2 ${
                  day.isToday
                    ? "bg-white/[0.12] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]"
                    : "bg-white/[0.045]"
                }`}
              >
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-[9.5px] font-bold uppercase tracking-[0.1em] ${
                      day.isToday ? "text-white/90" : "text-white/[0.44]"
                    }`}
                  >
                    {/* One letter on phones, three from sm up. */}
                    <span className="sm:hidden">{day.initial}</span>
                    <span className="hidden sm:inline">{day.short}</span>
                  </span>
                  <span
                    className={`font-display text-[11.5px] font-extrabold tabular-nums ${
                      day.isToday ? "text-white" : "text-white/[0.55]"
                    }`}
                  >
                    {day.dayOfMonth}
                  </span>
                </div>

                {/* Phones get a dot; there is no room for a label at 48px. */}
                <span
                  className={`h-[5px] w-[5px] shrink-0 rounded-full sm:hidden ${
                    day.sessions.length > 0 ? "bg-highlight" : "bg-white/[0.16]"
                  }`}
                />

                <div className="hidden w-full min-w-0 flex-col gap-0.5 sm:flex">
                  {day.sessions.length === 0 ? (
                    <span className="text-[10.5px] text-white/[0.26]">—</span>
                  ) : (
                    day.sessions.slice(0, 2).map((s) => (
                      <span
                        key={s.trackSlug + s.startsAt}
                        className="truncate text-[10.5px] leading-tight text-white/90"
                      >
                        <span className="font-display font-extrabold text-highlight">
                          {s.code}
                        </span>{" "}
                        {s.unitLabel}
                      </span>
                    ))
                  )}
                  {day.sessions.length > 2 && (
                    <span className="text-[10px] text-white/50">
                      +{day.sessions.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {children}
      </div>
    </section>
  );
}
