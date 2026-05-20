"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { saveTrackOverview, type TrackOverviewPatch } from "./actions";

type SaveState = "idle" | "saving" | "saved" | "error";

type WeekSummary = { week: number; topic: string; icon: string };

type Props = {
  track: {
    slug: string;
    name: string;
    description?: string;
    instructor: string;
    weekSummaries: WeekSummary[];
  };
};

/**
 * Minimal track Overview admin form. Four fields only — name, professor,
 * description, and week titles. Everything else (schedule, totals, toggles,
 * icons) stays in the TS config until we deliberately plan more edit surface.
 *
 * Autosaves 800ms after the last edit. Writes go through saveTrackOverview;
 * blank text becomes null in DB (= "use TS default"). Week icons are kept on
 * the record unchanged so the few empty-state badges still render.
 */
export function TrackOverviewForm({ track }: Props) {
  const [name, setName] = useState(track.name);
  const [instructor, setInstructor] = useState(track.instructor);
  const [description, setDescription] = useState(track.description ?? "");
  const [weekSummaries, setWeekSummaries] = useState<WeekSummary[]>(
    track.weekSummaries,
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Debounced autosave — fires 800ms after the last edit. Skips the initial
  // mount so we don't write back the unchanged defaults on first paint.
  const isFirstRun = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        const patch: TrackOverviewPatch = {
          name,
          instructor,
          description,
          week_summaries: weekSummaries,
        };
        await saveTrackOverview(track.slug, patch);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch (e) {
        console.error("[TrackOverviewForm] save failed:", e);
        setSaveState("error");
      }
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, instructor, description, weekSummaries]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
          Track overview
        </p>
        <SaveIndicator state={saveState} />
      </div>

      <p className="text-xs text-neutral-500 max-w-2xl">
        Edit what shows on the student&apos;s track page. Changes save
        automatically a moment after you stop typing. Leave a field blank to
        fall back to the default.
      </p>

      <div className="border border-rule bg-surface-elevated p-4 sm:p-5 space-y-4">
        <Field label="Track name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Professor">
          <input
            type="text"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field
          label="Description"
          hint="Paragraph shown below the title on the track overview page."
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={`${inputCls} resize-y leading-relaxed`}
          />
        </Field>
      </div>

      <div className="border border-rule bg-surface-elevated p-4 sm:p-5">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
          Week titles
        </p>
        <p className="mb-4 text-xs text-neutral-500">
          One short line per week — shown on the overview &ldquo;Weeks&rdquo;
          list and in the curriculum sidebar.
        </p>
        <div className="space-y-2">
          {weekSummaries.map((ws, idx) => (
            <div key={ws.week} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-[11px] font-medium tabular-nums text-neutral-400">
                Wk {ws.week}
              </span>
              <input
                type="text"
                value={ws.topic}
                onChange={(e) => {
                  const next = [...weekSummaries];
                  next[idx] = { ...ws, topic: e.target.value };
                  setWeekSummaries(next);
                }}
                className={`${inputCls} flex-1`}
                placeholder="Topic"
                aria-label={`Week ${ws.week} title`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Bits ───────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-neutral-400">{hint}</span>}
    </label>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  if (state === "saving") return <span className="text-[11px] text-neutral-400">Saving…</span>;
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-green-600">
        <Check size={11} /> Saved
      </span>
    );
  }
  return <span className="text-[11px] text-red-500">Save failed</span>;
}
