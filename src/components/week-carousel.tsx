"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
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

// Above this many units the at-a-glance grid crams into tiny tiles with
// clipped titles (a cert track runs 16–24 sessions). Long tracks switch to a
// horizontal scroll rail of larger cards; short tracks (camps) keep the grid.
const DENSE_THRESHOLD = 8;

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

  // Desktop rail: scroll the current session into view on load so a learner
  // mid-course doesn't land staring at session 1.
  const desktopRailRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const idx = weeks.findIndex((w) => w.isCurrent);
    const rail = desktopRailRef.current;
    if (idx > 0 && rail) {
      const card = rail.children[idx] as HTMLElement | undefined;
      if (card) rail.scrollLeft = Math.max(0, card.offsetLeft - 16);
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

      {/* Desktop. Long tracks (cert cohorts) get a horizontal scroll rail of
         larger cards; short tracks (camps) keep the original at-a-glance grid
         so their look is unchanged. */}
      {weeks.length > DENSE_THRESHOLD ? (
      <ol
        ref={desktopRailRef}
        aria-label={`${unitLabel} navigation`}
        className="hidden gap-3 overflow-x-auto pb-2 sm:flex [scrollbar-width:thin]"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {weeks.map((w) => {
          const inner = (
            <>
              <span className={`text-4xl leading-none ${w.isPast ? "opacity-60" : ""}`}>
                {renderIcon(w.icon, 36)}
              </span>
              <span className="mt-3 text-[10px] font-medium uppercase tracking-widest text-ink-faint">
                {unitLabel} {w.week}
              </span>
              <span
                className={`mt-1 line-clamp-3 text-[13px] font-semibold leading-snug ${
                  w.isPast || w.isLocked ? "text-ink-faint" : "text-ink"
                }`}
              >
                {w.topic}
              </span>
              {w.isLocked ? (
                <span className="mt-auto pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                  {w.lockedLabel ?? "Coming soon"}
                </span>
              ) : w.isCurrent ? (
                <span className="mt-auto pt-2.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  ● Current
                </span>
              ) : w.isPast ? (
                <span className="mt-auto pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                  ✓ Done
                </span>
              ) : null}
            </>
          );
          const cardBase =
            "flex h-full min-h-[152px] flex-col items-center rounded-xl border p-4 text-center";
          return (
            <li key={w.week} className="w-[168px] shrink-0 snap-start">
              {w.isLocked ? (
                <div
                  aria-label={`${unitLabel} ${w.week}: ${w.topic} (${w.lockedLabel ?? "coming soon"})`}
                  className={`${cardBase} cursor-not-allowed border-rule-soft opacity-60`}
                >
                  {inner}
                </div>
              ) : (
                <Link
                  href={w.href!}
                  aria-label={`${unitLabel} ${w.week}: ${w.topic}${w.isCurrent ? " (current)" : ""}`}
                  className={`group ${cardBase} transition-colors hover:bg-paper-tint-soft ${
                    w.isCurrent ? "border-primary" : "border-rule-soft"
                  }`}
                  style={
                    w.isCurrent
                      ? {
                          boxShadow: "inset 0 0 0 1px var(--primary)",
                          backgroundColor: "color-mix(in srgb, var(--primary) 4%, transparent)",
                        }
                      : undefined
                  }
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      ) : (
        <ol className="hidden gap-2 sm:grid sm:grid-cols-3 sm:gap-3 md:grid-cols-5">
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
                      w.isPast ? "text-ink-faint" : "text-ink-soft group-hover:text-ink"
                    }`}
                  >
                    {w.topic}
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
