"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveTrackOverview, type TrackOverviewPatch } from "./actions";

type SaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  track: {
    slug: string;
    name: string;
    description?: string;
    instructor: string;
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
    setSaveState("saving");
    try {
      const patch: TrackOverviewPatch = { ...latestValues.current };
      await saveTrackOverview(track.slug, patch);
      setSaveState("saved");
      // Only refresh the page when the user has explicitly left a field so
      // the header/breadcrumb updates. Skipped during typing to avoid
      // interrupting input mid-edit.
      if (shouldRefresh) startTransition(() => router.refresh());
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error("[TrackOverviewForm] save failed:", e);
      setSaveState("error");
    }
  });

  // Debounced autosave while typing — no page refresh so input stays stable.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave.current(false), 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, instructor, description]);

  // Immediate save on blur — refreshes the page so header/title updates.
  const handleBlur = () => doSave.current(true);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
          Track overview
        </p>
        <SaveIndicator state={saveState} />
      </div>

      <div className="border border-rule bg-surface-elevated p-4 sm:p-5 space-y-4">
        <Field label="Track name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlur}
            className={inputCls}
          />
        </Field>

        <Field label="Professor">
          <input
            type="text"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            onBlur={handleBlur}
            className={inputCls}
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
            className={`${inputCls} resize-y leading-relaxed`}
          />
        </Field>
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
        ✓ Saved
      </span>
    );
  }
  return <span className="text-[11px] text-red-500">Save failed</span>;
}
