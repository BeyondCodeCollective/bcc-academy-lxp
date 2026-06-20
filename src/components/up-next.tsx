import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { UpNextItem } from "@/lib/track-gating";

/**
 * Pending tasks for the learner — watch / submit / reflect on the current week,
 * plus the next office hour. Renders nothing when there's nothing to do (no
 * empty state — an empty box would read as redundant). Used on the multi-course
 * home (with course names) and on a single track's overview (scoped, no names).
 */
export function UpNext({
  items,
  heading = "Up next",
}: {
  items: UpNextItem[];
  heading?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
        {heading}
      </h2>
      <ul className="divide-y divide-rule overflow-hidden panel">
        {items.map((it) => {
          const sub = [it.trackName, it.meta].filter(Boolean).join(" · ");
          const cls =
            "group flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-paper-tint-soft";
          const inner = (
            <>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{it.label}</span>
                {sub && <span className="mt-0.5 block text-xs text-ink-soft">{sub}</span>}
              </span>
              <ArrowRight
                size={15}
                weight="bold"
                className="shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </>
          );
          return (
            <li key={it.key}>
              {it.external ? (
                <a href={it.href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {inner}
                </a>
              ) : (
                <Link href={it.href} className={cls}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
