"use client";

import { useState } from "react";
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
          Your tracks
        </p>
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSortKey(opt.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                sortKey === opt.key
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map(({ track, started, currentWeek }) => (
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
    </div>
  );
}
