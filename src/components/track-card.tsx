"use client";

import Link from "next/link";
import { toneForTrack, iconForTrack } from "@/lib/track-visual";

type Props = {
  slug: string;
  name: string;
  instructor: string;
  totalWeeks: number;
  sessionsPerWeek: number;
  startDate: string;
  started: boolean;
  currentWeek: number;
  weekOneTopic: string;
};

export function TrackCard({
  slug,
  name,
  instructor,
  totalWeeks,
  sessionsPerWeek,
  startDate,
  started,
  currentWeek,
  weekOneTopic,
}: Props) {
  const tone = toneForTrack(slug);
  const Icon = iconForTrack(slug);
  const startLabel = new Date(startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/dashboard/track/${slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-rule bg-surface-soft transition-colors hover:border-ink-faint hover:bg-paper-tint-soft"
    >
      {/* Top visual — curated Phosphor icon, tone-tinted background */}
      <div
        aria-hidden
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden"
        style={{ backgroundColor: `${tone}1A` }}
      >
        <Icon size={56} weight="light" color={tone} />
        {/* Status badge floats top-right */}
        <div className="absolute top-3 right-3">
          {started ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold backdrop-blur"
              style={{ color: tone }}
            >
              <span
                className="h-1 w-1 rounded-full animate-pulse"
                style={{ backgroundColor: tone }}
              />
              Wk {currentWeek}/{totalWeeks}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-ink-soft backdrop-blur">
              Starts {startLabel}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          {totalWeeks}-week track
        </p>
        <h2 className="mt-2 text-[17px] font-semibold text-ink leading-snug tracking-[-0.01em]">
          {name}
        </h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          with {instructor}
          {sessionsPerWeek > 1 ? ` · ${sessionsPerWeek}×/wk` : ""}
        </p>
        {weekOneTopic && (
          <p className="mt-3 text-[13px] leading-[1.55] text-ink-soft line-clamp-2">
            Begins with {weekOneTopic.toLowerCase()}.
          </p>
        )}
        <span className="mt-auto pt-4 text-[12px] font-medium text-ink-soft group-hover:text-ink">
          View track{" "}
          <span aria-hidden className="inline-block transition-transform group-hover:translate-x-0.5">
            &rarr;
          </span>
        </span>
      </div>
    </Link>
  );
}
