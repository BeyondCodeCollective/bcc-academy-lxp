import Link from "next/link";
import { createElement } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { iconForTrack } from "@/lib/track-visual";

/**
 * Course / workshop / recording card. Type-forward and editorial: the title
 * carries the card, a small inline icon sits with the eyebrow (no templated
 * icon-chip), and the accent is used sparingly — only the status word. White
 * surface, hairline rule, subtle radius. Shared by the catalog, workshops, and
 * the track grid. (`tone` is accepted but ignored — kept so callers don't
 * need to change.)
 */
export function CatalogCard({
  href,
  external,
  iconSlug,
  eyebrow,
  title,
  byline,
  monogram,
  description,
  status,
  trailing,
}: {
  href: string;
  /** Plain <a> instead of <Link> — for cookie-setting routes. */
  external?: boolean;
  /** Deprecated — per-track tint replaced by the single skin accent. Ignored. */
  tone?: string;
  /** When set, a small inline track icon precedes the eyebrow. */
  iconSlug?: string;
  /** Eyebrow — duration, modality, "Recording". */
  eyebrow: string;
  title: string;
  byline?: string;
  /** Initials shown in a small avatar beside the byline (e.g. the presenter). */
  monogram?: string;
  /** 1–2 line supporting text under the byline — fills out otherwise sparse cards. */
  description?: string;
  /** Short word in the accent — "In progress", "Upcoming". */
  status?: string;
  /** Trailing fact in the footer — date. */
  trailing?: string;
}) {
  const cls =
    "group flex h-full flex-col panel p-5 shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";

  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          {iconSlug &&
            createElement(iconForTrack(iconSlug), {
              size: 14,
              weight: "bold",
              className: "shrink-0 text-ink-faint",
            })}
          <span className="truncate">{eyebrow}</span>
        </span>
        {status && (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
            {status}
          </span>
        )}
      </div>

      <h3 className="mt-4 text-[17px] font-bold leading-snug tracking-[-0.015em] text-ink">
        {title}
      </h3>
      {(byline || monogram) && (
        <div className="mt-1.5 flex items-center gap-2">
          {monogram && (
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-tint text-[10px] font-bold text-ink-soft"
            >
              {monogram}
            </span>
          )}
          {byline && (
            <span className="truncate text-[13px] leading-relaxed text-ink-soft">
              {byline}
            </span>
          )}
        </div>
      )}
      {description && (
        <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">
          {description}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-6">
        {trailing ? (
          <span className="text-[11px] text-ink-faint">{trailing}</span>
        ) : (
          <span />
        )}
        <ArrowRight
          size={16}
          weight="bold"
          aria-hidden
          className="shrink-0 text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:text-ink"
        />
      </div>
    </>
  );

  return external ? (
    <a href={href} className={cls}>
      {body}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}
