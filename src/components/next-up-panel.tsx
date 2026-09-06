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
export type PanelTodo = {
  label: string;
  /** "10–15 min" — rendered faintly after the label */
  detail?: string;
  href: string;
};

export function NextUpPanel({
  touchpoint,
  todos = [],
}: {
  touchpoint: Touchpoint;
  /** Small tasks (profile, surveys) fold into the panel as quiet rows —
     each one as its own full-width banner buried the panel (2026-07-12). */
  todos?: PanelTodo[];
}) {
  const { kind, href, unitLabel, title, whenLabel, timeLabel, isMass } = touchpoint;
  const isLive = kind === "live";

  const kicker = isLive ? "Live now" : kind === "today" ? "Today" : "Up next";
  const cta = isLive ? "Join now" : kind === "today" ? "Join" : "Open";
  // Time is noise under "Happening now"; useful under a date.
  const sub = isLive
    ? whenLabel
    : [whenLabel, timeLabel].filter(Boolean).join(" · ");

  // This panel is the page's primary object, so it carries the one dark
  // ground on the screen and the display size the course page already uses
  // (30px). Everything under it stays small on purpose — the contrast IS the
  // hierarchy. Electric green marks live state only, on filled shapes.
  const hero = (
    <Link
      href={href}
      className="block px-5 py-5 transition-opacity hover:opacity-95 sm:px-6 sm:py-6"
    >
      {isLive ? (
        <span className="inline-flex items-center gap-2 rounded-full bg-highlight px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
          <span
            className="h-1.5 w-1.5 rounded-full bg-ink motion-safe:animate-pulse"
            aria-hidden
          />
          {kicker}
        </span>
      ) : (
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-paper/60">
          {kicker}
        </span>
      )}

      <span className="mt-3 block text-[27px] font-bold leading-[1.08] tracking-[-0.02em] text-paper sm:text-[30px]">
        {/* MASS and home-composed touchpoints carry the full line in
           unitLabel; a placeholder topic (title === unitLabel) adds nothing. */}
        {isMass || !title || title === unitLabel ? unitLabel : `${unitLabel} · ${title}`}
      </span>
      {sub && <span className="mt-2 block text-sm tabular-nums text-paper/70">{sub}</span>}

      <span
        className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold ${
          isLive ? "bg-highlight text-ink" : "bg-paper text-ink"
        }`}
      >
        {cta}
        <ArrowRight size={15} weight="bold" />
      </span>
    </Link>
  );

  return (
    // One object, two grounds: the action on ink, the small stuff on white.
    // rounded-2xl matches the course page's primary-object radius rather than
    // the rounded-lg every secondary card wears.
    <div className="overflow-hidden rounded-2xl border border-rule">
      <div className="bg-ink">{hero}</div>
      {todos.length > 0 && (
        <div className="bg-surface-elevated px-5 sm:px-6">
          {todos.map((todo) => (
            <div
              key={todo.href}
              className="flex items-center gap-2.5 border-t border-rule py-2.5 text-sm text-ink-soft first:border-t-0"
            >
              <span
                className="h-4 w-4 shrink-0 rounded border-[1.5px] border-ink-faint"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                {todo.label}
                {todo.detail && <span className="text-ink-faint"> · {todo.detail}</span>}
              </span>
              <Link href={todo.href} className="shrink-0 text-[13px] font-semibold text-primary">
                Start <ArrowRight size={12} weight="bold" className="inline" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
