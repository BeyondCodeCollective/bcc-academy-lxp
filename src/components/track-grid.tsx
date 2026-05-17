"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TrackCard } from "./track-card";

type TrackState = {
  track: {
    slug: string;
    name: string;
    instructor: string;
    totalWeeks: number;
    sessionsPerWeek: number;
    startDate: string;
    weekOneTopic: string;
  };
  started: boolean;
  currentWeek: number;
};

type SortKey = "status" | "name" | "start";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "status", label: "In progress" },
  { key: "name", label: "Name" },
  { key: "start", label: "Start date" },
];

export function TrackGrid({ tracks }: { tracks: TrackState[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("status");

  const sorted = [...tracks].sort((a, b) => {
    if (sortKey === "name") return a.track.name.localeCompare(b.track.name);
    if (sortKey === "start")
      return (
        new Date(a.track.startDate).getTime() -
        new Date(b.track.startDate).getTime()
      );
    // status: in-progress first, then by soonest start
    if (a.started !== b.started) return a.started ? -1 : 1;
    return (
      new Date(a.track.startDate).getTime() -
      new Date(b.track.startDate).getTime()
    );
  });

  // Default sort splits naturally: in-progress get the visual weight of the
  // poster grid, upcoming collapse into a typographic list below. Other sorts
  // (name / start) keep the uniform poster grid since the split would mix
  // alphabetically/chronologically and feel arbitrary.
  const useSplit = sortKey === "status";
  const inProgress = useSplit ? sorted.filter((t) => t.started) : [];
  const upcoming = useSplit ? sorted.filter((t) => !t.started) : [];
  const flatGrid = useSplit ? [] : sorted;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          Your tracks
        </p>
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSortKey(opt.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                sortKey === opt.key
                  ? "bg-ink text-white"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* In-progress tracks render as featured posters — what the student
         opens today. */}
      {inProgress.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inProgress.map(({ track, started, currentWeek }) => (
            <TrackCard
              key={track.slug}
              slug={track.slug}
              name={track.name}
              instructor={track.instructor}
              totalWeeks={track.totalWeeks}
              sessionsPerWeek={track.sessionsPerWeek}
              startDate={track.startDate}
              started={started}
              currentWeek={currentWeek}
              weekOneTopic={track.weekOneTopic}
            />
          ))}
        </div>
      )}

      {/* Upcoming tracks collapse into a compact list — they don't compete
         for attention against what's live this week. */}
      {upcoming.length > 0 && (
        <div className="border-t border-rule pt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            Starting soon
          </p>
          <ul className="divide-y divide-rule-soft">
            {upcoming.map(({ track }) => {
              const startLabel = new Date(track.startDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              return (
                <li key={track.slug}>
                  <Link
                    href={`/dashboard/track/${track.slug}`}
                    className="group flex items-center gap-4 py-3 transition-colors"
                  >
                    <span className="shrink-0 text-xs font-medium tabular-nums text-ink-faint w-16">
                      {startLabel}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-[15px] text-ink-soft group-hover:text-ink">
                      {track.name}
                    </span>
                    <span className="hidden sm:inline text-xs text-ink-faint">
                      with {track.instructor}
                    </span>
                    <ArrowRight
                      size={13}
                      className="shrink-0 text-ink-faint/60 transition-colors group-hover:text-ink-soft"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Non-status sorts keep uniform poster grid. */}
      {flatGrid.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flatGrid.map(({ track, started, currentWeek }) => (
            <TrackCard
              key={track.slug}
              slug={track.slug}
              name={track.name}
              instructor={track.instructor}
              totalWeeks={track.totalWeeks}
              sessionsPerWeek={track.sessionsPerWeek}
              startDate={track.startDate}
              started={started}
              currentWeek={currentWeek}
              weekOneTopic={track.weekOneTopic}
            />
          ))}
        </div>
      )}
    </div>
  );
}
