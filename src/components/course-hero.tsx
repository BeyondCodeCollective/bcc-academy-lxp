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
 */
export function CourseHero({
  eyebrow,
  title,
  meta,
  blurb,
  vendor,
}: {
  eyebrow: string;
  title: string;
  /** The one-sentence fact line the header already uses. */
  meta: string;
  blurb?: string;
  /** A vendor lockup (CompTIA and friends) where the course carries one. */
  vendor?: React.ReactNode;
}) {
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
