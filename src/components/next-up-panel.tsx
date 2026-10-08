import Link from "next/link";
import { ArrowRight, Megaphone } from "@phosphor-icons/react/dist/ssr";
import type { Touchpoint } from "@/lib/course-touchpoint";
import { touchpointCta, touchpointHeadline, touchpointKicker, touchpointWhen } from "@/lib/course-touchpoint";

/**
 * The one "what now" the dashboard home leads with — names the session
 * that's live, meeting today, or up next, and its button is the single
 * action that matters right then (join / open). Computed server-side each
 * load, so it's correct on arrival without polling.
 *
 * The course page's own version of this is folded into CourseHero instead —
 * that page already has a field for course identity, and a second one here
 * would be the two-dark-objects mistake the field system exists to prevent.
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
}: {
  touchpoint: Touchpoint;
  /** Small tasks (profile, surveys) fold into the panel as quiet rows —
     each one as its own full-width banner buried the panel (2026-07-12). */
  todos?: PanelTodo[];
  /** The track's latest announcement, folded in as a row rather than shipped
   *  as a second banner below this one. */
  notice?: PanelNotice | null;
}) {
  const { kind, href } = touchpoint;
  const isLive = kind === "live";
  const kicker = touchpointKicker(touchpoint);
  const cta = touchpointCta(touchpoint);
  const headline = touchpointHeadline(touchpoint);
  const sub = touchpointWhen(touchpoint);

  return (
    // One object, two grounds: the action on ink, the small stuff on white.
    <div className="overflow-hidden rounded-2xl border border-rule">
      {/* The dark ground is the FIELD, not flat ink — same surface as the
         session page, the course header and the admin band, so the primary
         object on every screen is recognisably the same object. */}
      <div className="stage-surface stage-grid relative isolate overflow-hidden">
        <Link
          href={href}
          className="relative block px-5 py-5 transition-opacity hover:opacity-95 sm:px-6 sm:py-6"
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
            {headline}
          </span>
          {sub && (
            <span className="mt-2 block text-sm tabular-nums text-paper/70">
              {sub}
            </span>
          )}

          <span
            className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold ${
              isLive ? "bg-highlight text-ink" : "bg-paper text-ink"
            }`}
          >
            {cta}
            <ArrowRight size={15} weight="bold" />
          </span>
        </Link>
      </div>
      {(todos.length > 0 || notice) && (
        <div className="bg-surface-elevated px-5 sm:px-6">
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
