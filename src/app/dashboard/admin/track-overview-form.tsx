"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { saveTrackOverview, type TrackOverviewPatch } from "./actions";
import { Field, fieldInput } from "@/components/ui";

type SaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  track: {
    slug: string;
    name: string;
    description?: string;
    instructor: string;
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
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const isFirstRun = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValues = useRef({ name, instructor, description });

  // Keep ref in sync so the blur handler always sends fresh values.
  latestValues.current = { name, instructor, description };

  const doSave = useRef(async (shouldRefresh = false) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saved"); // optimistic indicator
    setTimeout(() => setSaveState("idle"), 2000);
    try {
      const patch: TrackOverviewPatch = { ...latestValues.current };
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
  }, [name, instructor, description]);

  // Immediate save on blur — refreshes page so header/title updates.
  const handleBlur = () => doSave.current(true);

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
