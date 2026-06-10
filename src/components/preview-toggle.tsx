"use client";

import { useState, useRef, useEffect } from "react";
import { setPreviewTrackSlug } from "@/app/dashboard/preview-actions";

type TrackOption = { slug: string; name: string };

export function PreviewToggle({
  previewingSlug,
  tracks,
}: {
  previewingSlug: string | null;
  tracks: TrackOption[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const active = previewingSlug !== null;
  const activeName =
    tracks.find((t) => t.slug === previewingSlug)?.name ?? previewingSlug;

  return (
    <div ref={ref} className="fixed bottom-4 right-4 z-40">
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-64 overflow-hidden border border-rule bg-surface-elevated shadow-xl">
          <p className="border-b border-neutral-100 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
            Preview as enrolled in
          </p>
          <ul className="max-h-72 overflow-y-auto">
            {tracks.map((t) => (
              <li key={t.slug}>
                <form action={setPreviewTrackSlug.bind(null, t.slug)} onSubmit={() => setOpen(false)}>
                  <button
                    type="submit"
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-neutral-50 ${
                      previewingSlug === t.slug
                        ? "font-semibold text-[#E54D2E]"
                        : "text-neutral-800"
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    {previewingSlug === t.slug && (
                      <span className="shrink-0 text-[10px]">✓</span>
                    )}
                  </button>
                </form>
              </li>
            ))}
          </ul>
          {active && (
            <form
              action={setPreviewTrackSlug.bind(null, null)}
              onSubmit={() => setOpen(false)}
              className="border-t border-neutral-100"
            >
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              >
                <span aria-hidden>👁</span>
                Exit preview
              </button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg transition-colors ${
          active
            ? "bg-[#E54D2E] text-white hover:bg-[#d44425]"
            : "bg-neutral-900 text-white hover:bg-neutral-700"
        }`}
        title={active ? `Previewing as ${activeName}` : "Preview as a student"}
      >
        <span aria-hidden>👁</span>
        <span className="max-w-[160px] truncate">
          {active ? `Previewing: ${activeName}` : "Preview as student"}
        </span>
        <span aria-hidden className={`transition-transform inline-block text-xs ${open ? "" : "rotate-180"}`}>‹</span>
      </button>
    </div>
  );
}
