"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleAssessment, toggleTrackAssessment } from "./actions";

export function FeatureToggles({
  programs,
  programLabels,
  programFlagsMap,
  programTracks,
  trackFlagsMap,
}: {
  programs: string[];
  programLabels: Record<string, string>;
  programFlagsMap: Record<string, boolean>;
  programTracks: Record<string, { slug: string; name: string }[]>;
  trackFlagsMap: Record<string, boolean>;
}) {
  return (
    <div className="space-y-6">
      {programs.map((slug) => (
        <ProgramCard
          key={slug}
          slug={slug}
          label={programLabels[slug] ?? slug}
          programEnabled={programFlagsMap[slug] ?? false}
          tracks={programTracks[slug] ?? []}
          trackFlagsMap={trackFlagsMap}
        />
      ))}
    </div>
  );
}

function ProgramCard({
  slug,
  label,
  programEnabled,
  tracks,
  trackFlagsMap,
}: {
  slug: string;
  label: string;
  programEnabled: boolean;
  tracks: { slug: string; name: string }[];
  trackFlagsMap: Record<string, boolean>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-ink/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-ink/10 bg-ink/[0.02] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">{label}</h2>
        {tracks.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-ink/40 hover:text-ink/60 transition-colors"
          >
            {expanded ? "Hide tracks" : `${tracks.length} track${tracks.length === 1 ? "" : "s"} ↓`}
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Program-level toggle — turns it on for ALL tracks in this program */}
        <ToggleRow
          label="Pathway Assessment — all tracks"
          description={
            tracks.length > 0
              ? "Turns on for every track in this program at once"
              : "Turns on the pathway assessment for this program"
          }
          enabled={programEnabled}
          onToggle={(val) => toggleAssessment(slug, val)}
        />

        {/* Per-track toggles */}
        {expanded && tracks.length > 0 && (
          <div className="space-y-3 pl-4 border-l-2 border-ink/10 pt-1">
            <p className="text-xs text-ink/40 font-medium uppercase tracking-widest">Individual tracks</p>
            {tracks.map((track) => (
              <ToggleRow
                key={track.slug}
                label={track.name}
                description={track.slug}
                enabled={trackFlagsMap[track.slug] ?? false}
                onToggle={(val) => toggleTrackAssessment(track.slug, val)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (val: boolean) => Promise<void>;
}) {
  const [optimistic, setOptimistic] = useState(enabled);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleChange = () => {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      await onToggle(next);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink truncate">{label}</p>
        <p className="text-xs text-ink/40 mt-0.5 truncate">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        onClick={handleChange}
        disabled={isPending}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
          disabled:opacity-50
          ${optimistic ? "bg-accent" : "bg-ink/20"}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
            transition-transform duration-200
            ${optimistic ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}
