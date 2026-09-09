import Link from "next/link";
import { ArrowRight, Megaphone } from "@phosphor-icons/react/dist/ssr";
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

/** The track's latest announcement. It used to sit as its own grey bar
 *  directly under this panel, which put two "something is happening soon"
 *  blocks back to back — usually about the same week. It belongs INSIDE the
 *  one what-now object, as a row. */
export type PanelNotice = {
  title: string;
  body?: string | null;
  /** "coming up" / "tomorrow" — rendered faint after the body */
  whenLabel?: string | null;
  href: string;
  external?: boolean;
};

export function NextUpPanel({
  touchpoint,
  todos = [],
  notice = null,
  variant = "hero",
}: {
  touchpoint: Touchpoint;
  /** Small tasks (profile, surveys) fold into the panel as quiet rows —
     each one as its own full-width banner buried the panel (2026-07-12). */
  todos?: PanelTodo[];
  /** The track's latest announcement, folded in as a row rather than shipped
   *  as a second banner below this one. */
  notice?: PanelNotice | null;
  /** "hero" — the dark, display-size treatment. Correct on the dashboard
   *  home, where this IS the page's one dominant object.
   *  "quiet" — light surface, secondary size. Correct on a course page,
   *  where the cover art is already the one dark object and the course name
   *  already owns the page's single display size. Two dark slabs and two
   *  display headings on one screen is the exact thing the hierarchy work
   *  was meant to prevent. */
  variant?: "hero" | "quiet";
}) {
  const quiet = variant === "quiet";
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
      className={`block transition-opacity hover:opacity-95 ${
        quiet ? "px-4 py-4 sm:px-5" : "px-5 py-5 sm:px-6 sm:py-6"
      }`}
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
        <span
          className={`block text-[11px] font-bold uppercase tracking-[0.14em] ${
            quiet ? "text-ink-faint" : "text-paper/60"
          }`}
        >
          {kicker}
        </span>
      )}

      <span
        className={
          quiet
            ? "mt-2 block text-[19px] font-semibold leading-snug text-ink"
            : "mt-3 block text-[27px] font-bold leading-[1.08] tracking-[-0.02em] text-paper sm:text-[30px]"
        }
      >
        {/* MASS and home-composed touchpoints carry the full line in
           unitLabel; a placeholder topic (title === unitLabel) adds nothing. */}
        {isMass || !title || title === unitLabel ? unitLabel : `${unitLabel} · ${title}`}
      </span>
      {sub && (
        <span
          className={`mt-1 block text-sm tabular-nums ${
            quiet ? "text-ink-faint" : "mt-2 text-paper/70"
          }`}
        >
          {sub}
        </span>
      )}

      <span
        className={`inline-flex items-center gap-1.5 rounded-full text-sm font-bold ${
          quiet
            ? `mt-3 px-4 py-2 ${isLive ? "bg-highlight text-ink" : "bg-primary text-white"}`
            : `mt-5 px-5 py-2.5 ${isLive ? "bg-highlight text-ink" : "bg-paper text-ink"}`
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
    <div
      className={`overflow-hidden border border-rule ${quiet ? "rounded-xl" : "rounded-2xl"}`}
    >
      {/* The dark ground is the FIELD, not flat ink — same surface as the
         session page, the course header and the admin band, so the primary
         object on every screen is recognisably the same object. bg-ink here
         was the last place the old flat black survived. */}
      <div
        className={
          quiet
            ? "bg-surface-elevated"
            : "stage-surface stage-grid relative isolate overflow-hidden"
        }
      >
        {quiet ? hero : <div className="relative">{hero}</div>}
      </div>
      {(todos.length > 0 || notice) && (
        <div className={`bg-surface-elevated ${quiet ? "px-4 sm:px-5" : "px-5 sm:px-6"}`}>
          {notice && (
            <Link
              href={notice.href}
              target={notice.external ? "_blank" : undefined}
              rel={notice.external ? "noopener noreferrer" : undefined}
              className="flex items-start gap-2.5 border-t border-rule py-2.5 text-sm text-ink-soft transition-colors first:border-t-0 hover:text-ink"
            >
              <Megaphone size={15} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
              <span className="min-w-0 flex-1">
                <strong className="font-semibold text-ink">{notice.title}</strong>
                {notice.body ? ` — ${notice.body}` : ""}
                {notice.whenLabel && (
                  <span className="text-ink-faint"> · {notice.whenLabel}</span>
                )}
              </span>
            </Link>
          )}
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
