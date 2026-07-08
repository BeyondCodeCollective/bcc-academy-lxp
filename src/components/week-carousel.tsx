"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Check, Lock, CaretRight } from "@phosphor-icons/react";
import { weekIconForEmoji } from "@/lib/track-visual";

export type WeekCardData = {
  week: number;
  topic: string;
  icon: string;
  href: string | null;
  isCurrent: boolean;
  isPast: boolean;
  isLocked: boolean;
  lockedLabel: string | null;
};

// Above this many units the emoji-card grid becomes a wall of clipped titles
// and mismatched icons — a cert track can run 16–24 sessions. Switch to a
// compact numbered list that shows full titles and clear status instead.
const DENSE_THRESHOLD = 8;

/**
 * Compact two-column session list for long tracks: a numbered badge, the full
 * (untruncated) title, and status — done ✓, current pill, or locked. Used
 * above DENSE_THRESHOLD units; short tracks keep the playful emoji cards.
 */
function SessionList({
  weeks,
  unitLabel,
}: {
  weeks: WeekCardData[];
  unitLabel: string;
}) {
  const badgeClass = (w: WeekCardData) =>
    w.isCurrent
      ? "bg-primary text-white"
      : w.isPast || w.isLocked
        ? "bg-paper-tint text-ink-faint"
        : "border border-rule text-ink-soft";

  return (
    <ol className="grid gap-2 sm:grid-cols-2">
      {weeks.map((w) => {
        const badge = (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-xs font-bold tabular-nums ${badgeClass(w)}`}
          >
            {w.week}
          </span>
        );
        const title = (
          <span
            className={`min-w-0 flex-1 text-[13px] font-medium leading-snug ${
              w.isPast || w.isLocked ? "text-ink-faint" : "text-ink"
            }`}
          >
            {w.topic}
          </span>
        );

        if (w.isLocked) {
          return (
            <li key={w.week}>
              <div
                aria-label={`${unitLabel} ${w.week}: ${w.topic} (${w.lockedLabel ?? "coming soon"})`}
                className="flex cursor-not-allowed items-center gap-3 rounded-[10px] border border-rule-soft px-3 py-2.5 opacity-60"
              >
                {badge}
                {title}
                <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                  <Lock size={11} weight="fill" aria-hidden />
                  {w.lockedLabel ?? "Coming soon"}
                </span>
              </div>
            </li>
          );
        }

        return (
          <li key={w.week}>
            <Link
              href={w.href!}
              aria-label={`${unitLabel} ${w.week}: ${w.topic}${w.isCurrent ? " (current)" : ""}`}
              className={`group flex items-center gap-3 rounded-[10px] border px-3 py-2.5 transition-colors hover:bg-paper-tint-soft ${
                w.isCurrent ? "border-transparent bg-primary/[0.04]" : "border-rule-soft"
              }`}
              style={w.isCurrent ? { boxShadow: "inset 0 0 0 1.5px var(--primary)" } : undefined}
            >
              {badge}
              {title}
              {w.isCurrent ? (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Current
                </span>
              ) : w.isPast ? (
                <Check size={15} weight="bold" className="shrink-0 text-primary/70" aria-hidden />
              ) : (
                <CaretRight
                  size={14}
                  weight="bold"
                  className="shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function WeekCarousel({
  weeks,
  emojiIcons = false,
  unitLabel = "Week",
}: {
  weeks: WeekCardData[];
  /** Kid-facing tracks render the raw emoji; default maps to Phosphor. */
  emojiIcons?: boolean;
  /** Singular unit label ("Week", "Day", …) for the per-card label. */
  unitLabel?: string;
}) {
  const renderIcon = (icon: string, size: number) => {
    const Icon = emojiIcons ? null : weekIconForEmoji(icon);
    return Icon ? (
      <Icon size={size} weight="regular" className="text-primary" aria-hidden />
    ) : (
      icon
    );
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const idx = weeks.findIndex((w) => w.isCurrent);
    if (idx > 0 && scrollRef.current) {
      scrollRef.current.scrollLeft = idx * scrollRef.current.clientWidth;
      setActiveIndex(idx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const scrollTo = useCallback((i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setActiveIndex(i);
  }, []);

  // Long tracks (cert cohorts) get the compact list; short tracks (camps)
  // keep the emoji-card grid below. Placed after the hooks so hook order is
  // stable across renders (rules-of-hooks).
  if (weeks.length > DENSE_THRESHOLD) {
    return <SessionList weeks={weeks} unitLabel={unitLabel} />;
  }

  return (
    <>
      {/* Mobile: swipeable single-card carousel */}
      <div className="sm:hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          role="list"
          aria-label={`${unitLabel} navigation`}
          className="flex overflow-x-scroll snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {weeks.map((w) =>
            w.isLocked ? (
              <div key={w.week} role="listitem" className="w-full shrink-0 snap-start">
                <div className="flex flex-col items-center justify-center rounded-md bg-transparent py-8 px-4 text-center">
                  <span className="text-5xl leading-none opacity-30">{renderIcon(w.icon, 44)}</span>
                  <span className="mt-3 text-sm font-medium text-ink-faint leading-tight">
                    {w.topic}
                  </span>
                  <span className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    {w.lockedLabel ?? "Coming soon"}
                  </span>
                </div>
              </div>
            ) : (
              <div key={w.week} role="listitem" className="w-full shrink-0 snap-start">
                <Link
                  href={w.href!}
                  aria-label={`${unitLabel} ${w.week}: ${w.topic}${w.isCurrent ? " (current week)" : ""}`}
                  className="flex flex-col items-center justify-center rounded-md bg-transparent py-8 px-4 text-center transition-colors hover:bg-paper-tint-soft"
                  style={w.isCurrent ? { boxShadow: `inset 0 0 0 2px var(--primary)` } : undefined}
                >
                  <span className={`text-5xl leading-none ${w.isPast ? "opacity-60" : ""}`}>
                    {renderIcon(w.icon, 44)}
                  </span>
                  <span className="mt-1.5 text-[11px] font-medium uppercase tracking-widest text-ink-faint">
                    {unitLabel} {w.week}
                  </span>
                  <span
                    className={`mt-1.5 text-sm font-medium leading-tight ${
                      w.isPast ? "text-ink-faint" : "text-ink"
                    }`}
                  >
                    {w.topic}
                  </span>
                </Link>
              </div>
            )
          )}
        </div>

        {weeks.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {weeks.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to ${unitLabel.toLowerCase()} ${weeks[i].week}`}
                onClick={() => scrollTo(i)}
                className="h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: i === activeIndex ? "1rem" : "0.375rem",
                  backgroundColor: i === activeIndex ? "var(--primary)" : "var(--rule)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: original grid layout */}
      <ol className="hidden sm:grid sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        {weeks.map((w) => (
          <li key={w.week}>
            {w.isLocked ? (
              <div
                aria-label={`${unitLabel} ${w.week}: ${w.topic} (${w.lockedLabel ?? "coming soon"})`}
                className="flex aspect-square cursor-not-allowed flex-col items-center justify-center rounded-md bg-transparent p-2 sm:p-2.5"
              >
                <span className="text-2xl leading-none opacity-30 sm:text-3xl">
                  {renderIcon(w.icon, 28)}
                </span>
                <span className="mt-1.5 px-1 text-center text-[9px] font-medium uppercase tracking-widest text-ink-faint sm:text-[10px]">
                    {unitLabel} {w.week}
                </span>
                <span className="mt-0.5 line-clamp-2 px-1 text-center text-[10px] font-medium leading-tight text-ink-faint sm:text-[11px]">
                  {w.topic}
                </span>
                <span className="mt-1 px-1 text-center text-[9px] font-semibold uppercase tracking-wide text-ink-soft sm:text-[10px]">
                  {w.lockedLabel ?? "Coming soon"}
                </span>
              </div>
            ) : (
              <Link
                href={w.href!}
                aria-label={`${unitLabel} ${w.week}: ${w.topic}${w.isCurrent ? " (current week)" : ""}`}
                className="group flex aspect-square flex-col items-center justify-center rounded-md bg-transparent p-2 transition-colors hover:bg-paper-tint-soft sm:p-2.5"
                style={w.isCurrent ? { boxShadow: `inset 0 0 0 2px var(--primary)` } : undefined}
              >
                <span
                  className={`text-2xl leading-none sm:text-3xl ${w.isPast ? "opacity-60" : ""}`}
                >
                  {renderIcon(w.icon, 28)}
                </span>
                <span className="mt-1.5 px-1 text-center text-[9px] font-medium uppercase tracking-widest text-ink-faint sm:text-[10px]">
                    {unitLabel} {w.week}
                </span>
                <span
                  className={`mt-0.5 line-clamp-2 px-1 text-center text-[10px] font-medium leading-tight transition-colors sm:text-[11px] ${
                    w.isPast
                      ? "text-ink-faint"
                      : "text-ink-soft group-hover:text-ink"
                  }`}
                >
                  {w.topic}
                </span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
