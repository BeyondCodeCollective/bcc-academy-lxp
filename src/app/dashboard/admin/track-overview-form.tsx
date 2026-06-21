"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { saveTrackOverview, type TrackOverviewPatch } from "./actions";
import { Field, fieldInput } from "@/components/ui";

type SaveState = "idle" | "saving" | "saved" | "error";

type WeekSummary = { week: number; topic: string; icon: string };

type Props = {
  track: {
    slug: string;
    name: string;
    description?: string;
    instructor: string;
    weekSummaries: WeekSummary[];
    selfPaced?: boolean;
    sequentialGating?: boolean;
  };
  programSlug: string;
  onLiveChange?: (patch: { name: string; instructor: string }) => void;
};

/**
 * Optimistic save — "✓ Saved" shows instantly on blur/type, DB write happens
 * in the background. Error state surfaces if the write fails.
 * Typing debounces at 150ms. Blur saves immediately + triggers a non-blocking
 * page refresh so the header/title reflects the new value.
 */
export function TrackOverviewForm({ track, programSlug, onLiveChange }: Props) {
  const router = useRouter();
  const [name, setName] = useState(track.name);
  const [instructor, setInstructor] = useState(track.instructor);
  const [description, setDescription] = useState(track.description ?? "");
  // Week topics — seeded from the merged weekSummaries; numbers stay fixed 1..N.
  const [weekSummaries, setWeekSummaries] = useState<WeekSummary[]>(
    () => track.weekSummaries.map((w) => ({ ...w })),
  );
  const [sequentialGating, setSequentialGating] = useState(!!track.sequentialGating);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const isFirstRun = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValues = useRef({ name, instructor, description, weekSummaries, sequentialGating });

  // Keep ref in sync so the blur handler always sends fresh values.
  latestValues.current = { name, instructor, description, weekSummaries, sequentialGating };

  const doSave = useRef(async (shouldRefresh = false) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saved"); // optimistic indicator
    setTimeout(() => setSaveState("idle"), 2000);
    try {
      const { weekSummaries: weeks, sequentialGating: gating, ...rest } = latestValues.current;
      const patch: TrackOverviewPatch = {
        ...rest,
        week_summaries: weeks,
        sequential_gating: gating,
      };
      await saveTrackOverview(track.slug, patch, programSlug);
      // Refresh AFTER the DB write + cache bust complete, not before.
      if (shouldRefresh) startTransition(() => router.refresh());
    } catch (e) {
      console.error("[TrackOverviewForm] save failed:", e);
      setSaveState("error");
    }
  });

  // Debounced autosave while typing — 150ms, no page refresh.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave.current(false), 150);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, instructor, description, weekSummaries]);

  // Immediate save on blur — refreshes page so header/title updates.
  const handleBlur = () => doSave.current(true);

  const updateWeek = (i: number, field: "topic" | "icon", value: string) =>
    setWeekSummaries((prev) =>
      prev.map((w, idx) => (idx === i ? { ...w, [field]: value } : w)),
    );

  // Boolean toggles save immediately (no debounce) and refresh so the
  // student-facing gating reflects the change right away.
  const toggleGating = (next: boolean) => {
    setSequentialGating(next);
    latestValues.current = { ...latestValues.current, sequentialGating: next };
    doSave.current(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          Track overview
        </p>
        <SaveIndicator state={saveState} />
      </div>

      <div className="panel p-4 sm:p-5 space-y-4">
        <Field label="Track name">
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); onLiveChange?.({ name: e.target.value, instructor }); }}
            onBlur={handleBlur}
            className={fieldInput}
          />
        </Field>

        <Field label="Professor">
          <input
            type="text"
            value={instructor}
            onChange={(e) => { setInstructor(e.target.value); onLiveChange?.({ name, instructor: e.target.value }); }}
            onBlur={handleBlur}
            className={fieldInput}
          />
        </Field>

        <Field
          label="Description"
          hint="Shown below the title on the student's track page."
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleBlur}
            rows={4}
            className={`${fieldInput} resize-y leading-relaxed`}
          />
        </Field>
      </div>

      {track.selfPaced && (
        <div className="panel p-4 sm:p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={sequentialGating}
              onChange={(e) => toggleGating(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Require weeks in order
              </span>
              <span className="mt-0.5 block text-xs text-ink-faint">
                Students must finish each week before the next unlocks. Applies to
                self-paced courses only.
              </span>
            </span>
          </label>
        </div>
      )}

      {weekSummaries.length > 0 && (
        <div className="panel p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
              Weeks
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              Topic and icon shown for each week on the track and week pages.
            </p>
          </div>

          <div className="space-y-3">
            {weekSummaries.map((w, i) => (
              <div key={w.week} className="flex items-end gap-3">
                <span className="mb-2.5 w-14 shrink-0 text-xs font-medium text-ink-faint">
                  Week {w.week}
                </span>
                <div className="w-16 shrink-0">
                  <Field label="Icon">
                    <input
                      type="text"
                      value={w.icon}
                      onChange={(e) => updateWeek(i, "icon", e.target.value)}
                      onBlur={handleBlur}
                      className={`${fieldInput} text-center`}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Topic">
                    <input
                      type="text"
                      value={w.topic}
                      onChange={(e) => updateWeek(i, "topic", e.target.value)}
                      onBlur={handleBlur}
                      className={fieldInput}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bits ───────────────────────────────────────────────────────────────────

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  if (state === "saving") return <span className="text-[11px] text-ink-faint">Saving…</span>;
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-green-600">
        <Check size={11} /> Saved
      </span>
    );
  }
  return <span className="text-[11px] text-red-500">Save failed</span>;
}
