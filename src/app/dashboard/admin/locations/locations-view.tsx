"use client";

import { useMemo, useState } from "react";
import { StatCard } from "@/components/stats/stat-card";
import { DataBar } from "@/components/stats/data-bar";
import { STATE_NAMES } from "@/lib/zip-to-state";

export type StateRow = {
  code: string;
  count: number;
  programs: { name: string; count: number }[];
};

// State list with per-state toggles: unchecking a state drops it from the
// bars AND the headline count, so an admin can read off "N participants in
// GA + FL + TX" for a workforce-board email without exporting anything.
export function LocationsView({
  states,
  totalParticipants,
  withZip,
}: {
  states: StateRow[];
  totalParticipants: number;
  withZip: number;
}) {
  const [off, setOff] = useState<Set<string>>(new Set());

  const active = useMemo(() => states.filter((s) => !off.has(s.code)), [states, off]);
  const activeCount = active.reduce((sum, s) => sum + s.count, 0);

  function toggle(code: string) {
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  if (states.length === 0) {
    return (
      <div className="rounded-xl border border-rule bg-surface-elevated p-6">
        <p className="text-sm font-semibold text-ink">No location data yet</p>
        <p className="mt-1 text-sm text-ink-faint">
          ZIP codes are collected on landing-page signups and intake surveys;
          counts appear here as they come in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          value={activeCount.toLocaleString()}
          label={off.size > 0 ? "In selected states" : "Participants located"}
          hint={
            off.size > 0
              ? `${active.length} of ${states.length} states selected`
              : `${states.length} states`
          }
        />
        <StatCard
          value={withZip.toLocaleString()}
          label="With a ZIP on file"
          hint={`of ${totalParticipants.toLocaleString()} hub participants`}
          info="Location comes from the ZIP collected at signup or in surveys; participants without one aren't on this page."
        />
      </div>

      <div className="rounded-xl border border-rule bg-surface-elevated p-5 sm:p-6">
        <DataBar
          items={active.map((s) => ({
            label: STATE_NAMES[s.code] ?? s.code,
            value: s.count,
          }))}
        />
        {active.length === 0 && (
          <p className="text-sm text-ink-faint">Every state is toggled off.</p>
        )}
      </div>

      <div className="rounded-xl border border-rule bg-surface-elevated p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {states.map((s) => {
            const isOff = off.has(s.code);
            return (
              <button
                key={s.code}
                type="button"
                onClick={() => toggle(s.code)}
                aria-pressed={!isOff}
                title={s.programs.map((p) => `${p.name}: ${p.count}`).join(" · ")}
                className={
                  "rounded-full border px-3 py-1.5 text-sm tabular-nums transition-colors " +
                  (isOff
                    ? "border-rule text-ink-faint line-through"
                    : "border-rule bg-surface text-ink font-medium")
                }
              >
                {s.code} {s.count}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Tap a state to include or exclude it. Hover for the per-program split.
        </p>
      </div>
    </div>
  );
}
