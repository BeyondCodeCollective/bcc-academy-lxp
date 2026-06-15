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
    weekOneTopic: string;
    phase?: string;
  };
  started: boolean;
};

type FilterKey = "all" | "in-progress" | "upcoming";

// Display order + human label for the Catalyst phases. Anything else falls
// through to a generic "Other" bucket at the end.
const PHASE_ORDER: { key: string; label: string }[] = [
  { key: "foundation", label: "Foundation" },
  { key: "core", label: "Core" },
  { key: "workshop", label: "Workshops" },
  { key: "exit", label: "Exit" },
];

function phaseLabel(key: string): string {
  return (
    PHASE_ORDER.find((p) => p.key === key)?.label ??
    key.charAt(0).toUpperCase() + key.slice(1)
  );
}

function phaseRank(key: string): number {
  const i = PHASE_ORDER.findIndex((p) => p.key === key);
  return i === -1 ? PHASE_ORDER.length : i;
}

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
    return [...filtered].sort((a, b) => {
      if (a.started !== b.started) return a.started ? -1 : 1;
      return a.track.name.localeCompare(b.track.name);
    });
  }, [tracks, filter]);

  // Group by phase. If only one phase is present in the visible set, render
  // a flat grid (no header — the section label would be noise).
  const grouped = useMemo(() => {
    const buckets = new Map<string, TrackState[]>();
    for (const t of visible) {
      const key = t.track.phase ?? "other";
      const arr = buckets.get(key) ?? [];
      arr.push(t);
      buckets.set(key, arr);
    }
    return Array.from(buckets.entries())
      .map(([key, items]) => ({ key, label: phaseLabel(key), items }))
      .sort((a, b) => phaseRank(a.key) - phaseRank(b.key));
  }, [visible]);

  const showPhaseHeaders = false;

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in-progress", label: "In progress" },
    { key: "upcoming", label: "Upcoming" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Your tracks
        </p>
        <div aria-hidden className="h-px flex-1 bg-rule" />
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
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors ${
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
        <p className="border border-rule bg-surface-soft px-5 py-8 text-center text-sm text-ink-soft">
          No tracks in this view.
        </p>
      ) : showPhaseHeaders ? (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.key} className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                {group.label}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map(({ track, started }) => (
                  <TrackCard
                    key={track.slug}
                    slug={track.slug}
                    name={track.name}
                    instructor={track.instructor}
                    totalWeeks={track.totalWeeks}
                    sessionsPerWeek={track.sessionsPerWeek}
                    started={started}

                    weekOneTopic={track.weekOneTopic}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ track, started }) => (
            <TrackCard
              key={track.slug}
              slug={track.slug}
              name={track.name}
              instructor={track.instructor}
              totalWeeks={track.totalWeeks}
              sessionsPerWeek={track.sessionsPerWeek}
              started={started}
              weekOneTopic={track.weekOneTopic}
            />
          ))}
        </div>
      )}
    </div>
  );
}
