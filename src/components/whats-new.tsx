import Link from "next/link";
import {
  Megaphone,
  ChatCircleText,
  CalendarDots,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import type { FeedItem } from "@/lib/whats-new";

const ICONS = {
  announcement: Megaphone,
  feedback: ChatCircleText,
  "office-hour": CalendarDots,
} as const;

/**
 * The consolidated "What's New" feed. Replaces the standalone announcement
 * banners on the home and course overview — one stream of announcements,
 * instructor feedback, and upcoming office hours. Renders nothing when empty.
 */
export function WhatsNew({ items }: { items: FeedItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
        What&apos;s new
      </h2>
      <ul className="divide-y divide-rule overflow-hidden panel">
        {items.map((it) => {
          const Icon = ICONS[it.kind];
          const sub = [it.trackName, it.whenLabel].filter(Boolean).join(" · ");
          const inner = (
            <>
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-tint-soft text-primary"
                aria-hidden
              >
                <Icon size={15} weight="bold" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{it.title}</span>
                {it.body && (
                  <span className="mt-0.5 block truncate text-xs text-ink-soft">{it.body}</span>
                )}
                {sub && (
                  <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    {sub}
                  </span>
                )}
              </span>
              <ArrowRight
                size={15}
                weight="bold"
                className="mt-0.5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </>
          );
          const cls =
            "group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-paper-tint-soft";
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
