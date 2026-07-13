import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { buttonClass } from "@/components/ui";
import type { Touchpoint } from "@/lib/course-touchpoint";

/**
 * The one "what now" the course leads with once it's running — the started
 * counterpart to PreStartBanner. It names the session that's live, meeting
 * today, or up next, and its button is the single action that matters right
 * then (join / open). Computed server-side each load, so it's correct on
 * arrival without polling.
 */
export function NextUpPanel({ touchpoint }: { touchpoint: Touchpoint }) {
  const { kind, href, unitLabel, title, whenLabel, timeLabel, isMass } = touchpoint;
  const isLive = kind === "live";

  const kicker = isLive ? "Live now" : kind === "today" ? "Today" : "Up next";
  const cta = isLive ? "Join now" : kind === "today" ? "Join" : "Open";
  // Time is noise under "Happening now"; useful under a date.
  const sub = isLive
    ? whenLabel
    : [whenLabel, timeLabel].filter(Boolean).join(" · ");

  return (
    <Link
      href={href}
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-rule border-l-[3px] border-l-primary bg-surface-elevated px-4 py-3.5 transition-colors hover:bg-paper-tint-soft"
    >
      <span className="min-w-[190px] flex-1">
        <span className="flex items-center gap-2">
          {isLive && (
            <span
              className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-highlight"
              aria-hidden
            />
          )}
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
              isLive ? "text-ink" : "text-primary"
            }`}
          >
            {kicker}
          </span>
        </span>
        <span className="mt-1 block text-[15px] font-semibold leading-snug text-ink">
          {/* MASS and home-composed touchpoints carry the full line in
             unitLabel; a placeholder topic (title === unitLabel) adds nothing. */}
          {isMass || !title || title === unitLabel ? unitLabel : `${unitLabel} · ${title}`}
        </span>
        <span className="mt-0.5 block text-xs tabular-nums text-ink-faint">{sub}</span>
      </span>
      <span className={`${buttonClass("primary", "sm")} shrink-0`}>
        {cta}
        <ArrowRight size={15} weight="bold" />
      </span>
    </Link>
  );
}
