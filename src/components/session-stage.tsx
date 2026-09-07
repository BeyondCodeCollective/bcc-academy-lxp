"use client";

import { Calendar, Check, Play, Sparkles } from "lucide-react";

/**
 * The session stage — the dark slab at the top of a session page, and the one
 * place a learner acts from. It replaces the old stack of same-weight white
 * panels (the "live session opens here" card, the instructor card, the ended
 * card): every one of those was a STATE of the same object, so they are one
 * component with three states now.
 *
 *   before — the session's day hasn't arrived. NO dead Start button: a
 *            countdown, an add-to-calendar, and a plain sentence saying there
 *            is nothing to do yet.
 *   ready  — the lab is open. The hook headline carries the page, the Start
 *            button is the only primary action on screen.
 *   after  — the stage becomes the replay, and the footer names the one thing
 *            still outstanding.
 *
 * Presentational only: every action is a prop so the page (and the instructor
 * panel that owns the lab session) keeps the behavior it already had.
 */

type StageState = "before" | "ready" | "after";

export function SessionStage({
  state,
  headline,
  blurb,
  liveLabel,
  calendarHref,
  countdown,
  onStart,
  startLabel = "Start session",
  startNote,
  recordingHref,
  transcriptHref,
  outstanding,
  onOutstanding,
  outstandingLabel,
  nextLabel,
  completedNote,
}: {
  state: StageState;
  /**
   * The big line. Optional on purpose: a session with no configured hook has
   * nothing to say here that the page header doesn't already say, so the
   * stage leads with its opening paragraph at display size instead of
   * printing the title twice.
   */
  headline?: string;
  blurb?: string;
  /** "Live cohort session with Fonz — Monday, Sept 21 at 6:30 PM ET" */
  liveLabel?: string;
  calendarHref?: string;
  /** before-state only: [{value: "14", unit: "Days"}, …] */
  countdown?: { value: string; unit: string }[];
  onStart?: () => void;
  startLabel?: string;
  startNote?: string;
  recordingHref?: string;
  transcriptHref?: string;
  /** after-state footer: "your reflection, due Friday" */
  outstanding?: string;
  onOutstanding?: () => void;
  outstandingLabel?: string;
  /** before-state footer right side: "Session 2 opens Sept 28" */
  nextLabel?: string;
  /** after-state badge tail: "You finished Sept 21 · 84 minutes" */
  completedNote?: string;
}) {
  return (
    <section
      aria-label="Session"
      className="stage-surface mb-6 flex min-h-[320px] flex-col justify-between gap-6 rounded-xl px-5 py-5 sm:min-h-[408px] sm:px-6.5"
    >
      {/* ── status row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {state === "ready" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-highlight/40 bg-highlight/[0.13] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-highlight">
              <span className="h-1.5 w-1.5 rounded-full bg-highlight" />
              Open now
            </span>
          )}
          {state === "before" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.18] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
              Not open yet
            </span>
          )}
          {state === "after" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-highlight/40 bg-highlight/[0.13] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-highlight">
              <Check size={11} strokeWidth={2.6} />
              Complete
            </span>
          )}
          <span className="text-xs text-white/45">
            {state === "before"
              ? "Nothing to prepare"
              : state === "after"
                ? completedNote
                : "Runs in your browser · nothing to install"}
          </span>
        </div>
      </div>

      {/* ── body ── */}
      <div className="flex flex-col items-start gap-8 py-1.5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 max-w-[620px] flex-col gap-4">
          {headline && (
            <h2 className="font-display text-[32px] font-extrabold leading-[1.03] tracking-[-0.045em] text-white sm:text-[44px]">
              {headline}
            </h2>
          )}
          {blurb &&
            (headline ? (
              <p className="max-w-[56ch] text-[15px] leading-relaxed text-white/[0.66] sm:text-base">
                {blurb}
              </p>
            ) : (
              <p className="max-w-[52ch] text-[19px] leading-[1.5] tracking-[-0.015em] text-white sm:text-[24px]">
                {blurb}
              </p>
            ))}

          {state === "ready" && onStart && (
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-primary px-7 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                <Play size={15} fill="currentColor" strokeWidth={0} />
                {startLabel}
              </button>
              {startNote && (
                <p className="text-[13px] leading-snug text-white/45">{startNote}</p>
              )}
            </div>
          )}

          {state === "before" && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {calendarHref && (
                <a
                  href={calendarHref}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-white/[0.26] px-6 text-sm font-semibold text-white transition-colors hover:bg-white/[0.06]"
                >
                  <Calendar size={15} />
                  Add to calendar
                </a>
              )}
            </div>
          )}

          {state === "after" && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {recordingHref && (
                <a
                  href={recordingHref}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  <Play size={14} fill="currentColor" strokeWidth={0} />
                  Play recording
                </a>
              )}
              {transcriptHref && (
                <a
                  href={transcriptHref}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-white/[0.22] px-5 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]"
                >
                  Your transcript
                </a>
              )}
            </div>
          )}
        </div>

        <div className="hidden flex-1 lg:block" />

        {/* right-hand figure: Mica when the lab is live, a countdown before it */}
        {state === "before" && countdown && countdown.length > 0 ? (
          <div className="flex shrink-0 items-start gap-2.5 lg:pr-4">
            {countdown.map((c) => (
              <div key={c.unit} className="flex flex-col items-center gap-1.5">
                <div className="flex h-[74px] w-[74px] items-center justify-center rounded-[10px] border border-white/[0.12] bg-white/[0.03]">
                  <span className="font-display text-[32px] font-extrabold tabular-nums tracking-[-0.04em] text-white">
                    {c.value}
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/[0.38]">
                  {c.unit}
                </span>
              </div>
            ))}
          </div>
        ) : state === "ready" ? (
          <div className="hidden shrink-0 flex-col items-center gap-3.5 lg:flex lg:pr-3">
            <div className="mica-orb flex h-[108px] w-[108px] items-center justify-center rounded-full">
              <Sparkles size={46} strokeWidth={1.7} className="text-white" />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <p className="font-display text-[15px] font-bold tracking-[-0.01em] text-white">
                Mica
              </p>
              <p className="text-xs text-white/45">runs the lab with you</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── footer strip ── */}
      <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.08] pt-4">
        {state === "after" && outstanding ? (
          <>
            <Check size={15} className="shrink-0 text-white/50" />
            <p className="text-[13px] text-white/[0.68]">
              One thing left —{" "}
              <span className="font-semibold text-white">{outstanding}</span>
            </p>
            <div className="flex-1" />
            {onOutstanding && (
              <button
                type="button"
                onClick={onOutstanding}
                className="inline-flex min-h-[34px] items-center justify-center rounded-full bg-white/10 px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/[0.16]"
              >
                {outstandingLabel ?? "Do it now"}
              </button>
            )}
          </>
        ) : (
          <>
            <Calendar size={15} className="shrink-0 text-white/50" />
            <p className="text-[13px] text-white/[0.68]">{liveLabel}</p>
            <div className="flex-1" />
            {state === "before" && nextLabel && (
              <p className="text-[12.5px] text-white/[0.38]">{nextLabel}</p>
            )}
            {state === "ready" && calendarHref && (
              <a
                href={calendarHref}
                className="border-b border-white/20 pb-px text-[12.5px] text-white/[0.62] transition-colors hover:text-white"
              >
                Add to calendar
              </a>
            )}
          </>
        )}
      </div>
    </section>
  );
}
