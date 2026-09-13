import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Touchpoint } from "@/lib/course-touchpoint";
import { touchpointCta, touchpointHeadline, touchpointKicker, touchpointWhen } from "@/lib/course-touchpoint";

/**
 * Course hero — for a course with no cover art.
 *
 * The playbook allows a page ONE dark object. Where a course has artwork,
 * that art is it and this doesn't render. Where it doesn't — and most courses
 * don't — the page currently opens on a bare header, so the field takes the
 * slot instead: the same program-accent ground as the session stage, carrying
 * the course's own identity.
 *
 * It replaces the header rather than sitting above it, because two titles is
 * the same mistake as two dark objects. Display size stays at the page's 30px.
 *
 * Once the course is running, `touchpoint` replaces that identity with the
 * live/today/next session instead — same field, same size, but now it's
 * answering "what do I do right now" rather than just naming the course.
 * The course name drops to a small context line rather than disappearing:
 * a learner arriving without the breadcrumb in view (a bookmark, a deep
 * link) still knows which course they're in.
 */
export function CourseHero({
  eyebrow,
  title,
  meta,
  blurb,
  vendor,
  touchpoint,
}: {
  eyebrow: string;
  title: string;
  /** The one-sentence fact line the header already uses. */
  meta: string;
  blurb?: string;
  /** A vendor lockup (CompTIA and friends) where the course carries one. */
  vendor?: React.ReactNode;
  /** When present, the field becomes "what's next" instead of plain identity. */
  touchpoint?: Touchpoint | null;
}) {
  if (touchpoint) {
    const isLive = touchpoint.kind === "live";
    return (
      <Link
        href={touchpoint.href}
        className="stage-surface stage-grid relative isolate block overflow-hidden rounded-2xl px-5 py-6 transition-opacity hover:opacity-95 sm:px-7 sm:py-7"
      >
        <div className="relative flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            {isLive ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-highlight px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-ink motion-safe:animate-pulse"
                  aria-hidden
                />
                {touchpointKicker(touchpoint)}
              </span>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
                {touchpointKicker(touchpoint)}
              </span>
            )}
            <span className="text-[11.5px] text-white/45">
              {title} · {eyebrow}
            </span>
          </div>

          <h1 className="font-display text-[27px] font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-[30px]">
            {touchpointHeadline(touchpoint)}
          </h1>

          <p className="text-[15px] font-semibold text-white/85">
            {touchpointWhen(touchpoint)}
          </p>

          <span
            className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold ${
              isLive ? "bg-highlight text-ink" : "bg-paper text-ink"
            }`}
          >
            {touchpointCta(touchpoint)}
            <ArrowRight size={15} weight="bold" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <header className="stage-surface stage-grid relative isolate overflow-hidden rounded-2xl px-5 py-6 sm:px-7 sm:py-7">
      <div className="relative flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
            {eyebrow}
          </p>
          {vendor && <div className="shrink-0 opacity-90">{vendor}</div>}
        </div>

        <h1 className="font-display text-[27px] font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-[30px]">
          {title}
        </h1>

        {blurb && (
          <p className="max-w-[52ch] text-[14.5px] leading-relaxed text-white/[0.72]">
            {blurb}
          </p>
        )}

        <p className="border-t border-white/[0.16] pt-3 text-[13.2px] tabular-nums text-white/[0.78]">
          {meta}
        </p>
      </div>
    </header>
  );
}
