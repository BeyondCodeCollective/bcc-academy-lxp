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

export function WeekCarousel({
  weeks,
  tone,
  emojiIcons = false,
}: {
  weeks: WeekCardData[];
  tone: string;
  /** Kid-facing tracks render the raw emoji; default maps to Phosphor. */
  emojiIcons?: boolean;
}) {
  const renderIcon = (icon: string, size: number) => {
    const Icon = emojiIcons ? null : weekIconForEmoji(icon);
    return Icon ? (
      <Icon size={size} weight="duotone" color={tone} aria-hidden />
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

  return (
    <>
      {/* Mobile: swipeable single-card carousel */}
      <div className="sm:hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          role="list"
          aria-label="Week navigation"
          className="flex overflow-x-scroll snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {weeks.map((w) =>
            w.isLocked ? (
              <div key={w.week} role="listitem" className="w-full shrink-0 snap-start">
                <div className="flex flex-col items-center justify-center bg-white/40 backdrop-blur py-8 px-4 text-center">
                  <span className="text-5xl leading-none opacity-30">{renderIcon(w.icon, 44)}</span>
                  <span className="mt-3 text-sm font-medium text-neutral-400 leading-tight">
                    {w.topic}
                  </span>
                  <span className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Coming soon
                  </span>
                </div>
              </div>
            ) : (
              <div key={w.week} role="listitem" className="w-full shrink-0 snap-start">
                <Link
                  href={w.href!}
                  aria-label={`Week ${w.week}: ${w.topic}${w.isCurrent ? " (current week)" : ""}`}
                  className="flex flex-col items-center justify-center bg-white/85 backdrop-blur py-8 px-4 text-center transition-colors hover:bg-white"
                  style={w.isCurrent ? { boxShadow: `inset 0 0 0 2px ${tone}` } : undefined}
                >
                  <span className={`text-5xl leading-none ${w.isPast ? "opacity-60" : ""}`}>
                    {renderIcon(w.icon, 44)}
                  </span>
                  <span className="mt-1.5 text-[11px] font-medium uppercase tracking-widest text-neutral-400">
                    Week {w.week}
                  </span>
                  <span
                    className={`mt-1.5 text-sm font-medium leading-tight ${
                      w.isPast ? "text-neutral-400" : "text-neutral-700"
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
                aria-label={`Go to week ${weeks[i].week}`}
                onClick={() => scrollTo(i)}
                className="h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: i === activeIndex ? "1rem" : "0.375rem",
                  backgroundColor: i === activeIndex ? tone : "#d4d4d4",
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
                aria-label={`Week ${w.week}: ${w.topic} (coming ${w.lockedLabel})`}
                className="flex aspect-square cursor-not-allowed flex-col items-center justify-center bg-white/40 p-2 backdrop-blur sm:p-2.5"
              >
                <span className="text-2xl leading-none opacity-30 sm:text-3xl">
                  {renderIcon(w.icon, 28)}
                </span>
                <span className="mt-1.5 line-clamp-2 px-1 text-center text-[10px] font-medium leading-tight text-neutral-400 sm:text-[11px]">
                  {w.topic}
                </span>
                <span className="mt-1 px-1 text-center text-[9px] font-semibold uppercase tracking-wide text-neutral-500 sm:text-[10px]">
                  Coming soon
                </span>
              </div>
            ) : (
              <Link
                href={w.href!}
                aria-label={`Week ${w.week}: ${w.topic}${w.isCurrent ? " (current week)" : ""}`}
                className="group flex aspect-square flex-col items-center justify-center bg-white/85 p-2 backdrop-blur transition-colors hover:bg-white sm:p-2.5"
                style={w.isCurrent ? { boxShadow: `inset 0 0 0 2px ${tone}` } : undefined}
              >
                <span
                  className={`text-2xl leading-none sm:text-3xl ${w.isPast ? "opacity-60" : ""}`}
                >
                  {renderIcon(w.icon, 28)}
                </span>
                <span
                  className={`mt-1.5 line-clamp-2 px-1 text-center text-[10px] font-medium leading-tight transition-colors sm:text-[11px] ${
                    w.isPast
                      ? "text-neutral-400"
                      : "text-neutral-600 group-hover:text-neutral-900"
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
