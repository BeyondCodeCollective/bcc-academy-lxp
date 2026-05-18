"use client";

import { useMemo, useState } from "react";
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

type FilterKey = "all" | "in-progress" | "upcoming";

export function TrackGrid({ tracks }: { tracks: TrackState[] }) {
  const counts = useMemo(() => {
    const inProgress = tracks.filter((t) => t.started).length;
    return {
      all: tracks.length,
      "in-progress": inProgress,
      upcoming: tracks.length - inProgress,
    } satisfies Record<FilterKey, number>;
  }, [tracks]);

  // Default to whichever bucket has something to show — students with no
  // in-progress tracks shouldn't land on an empty grid.
  const [filter, setFilter] = useState<FilterKey>(() => {
    if (counts["in-progress"] > 0) return "in-progress";
    if (counts.upcoming > 0) return "upcoming";
    return "all";
  });

  const visible = useMemo(() => {
    const filtered = tracks.filter((t) => {
      if (filter === "in-progress") return t.started;
      if (filter === "upcoming") return !t.started;
      return true;
    });
    // In-progress first, then upcoming. Within each, earliest start first.
    return [...filtered].sort((a, b) => {
      if (a.started !== b.started) return a.started ? -1 : 1;
      return (
        new Date(a.track.startDate).getTime() -
        new Date(b.track.startDate).getTime()
      );
    });
  }, [tracks, filter]);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in-progress", label: "In progress" },
    { key: "upcoming", label: "Upcoming" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          Your tracks
        </p>
        <div className="flex items-center gap-1">
          {FILTERS.map((opt) => {
            const active = filter === opt.key;
            const count = counts[opt.key];
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilter(opt.key)}
                disabled={count === 0}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-ink text-white"
                    : "text-ink-soft hover:text-ink disabled:cursor-not-allowed disabled:text-ink-faint/50 disabled:hover:text-ink-faint/50"
                }`}
              >
                {opt.label}
                <span
                  className={`tabular-nums text-[10px] font-semibold ${
                    active ? "text-white/70" : "text-ink-faint"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-rule bg-surface-soft px-5 py-8 text-center text-sm text-ink-soft">
          No tracks in this view.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ track, started, currentWeek }) => (
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
