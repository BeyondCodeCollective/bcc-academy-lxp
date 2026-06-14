"use client";

import { useState, useRef, useEffect } from "react";
import { setPreviewTrackSlug } from "@/app/dashboard/preview-actions";
import { Eye, EyeOff, ChevronUp } from "lucide-react";

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
        <div className="absolute bottom-full right-0 mb-2 w-64 overflow-hidden panel shadow-xl">
          <p className="border-b border-rule-soft px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
            Preview as enrolled in
          </p>
          <ul className="max-h-72 overflow-y-auto">
            {tracks.map((t) => (
              <li key={t.slug}>
                <form action={setPreviewTrackSlug.bind(null, t.slug)} onSubmit={() => setOpen(false)}>
                  <button
                    type="submit"
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-paper-tint-soft ${
                      previewingSlug === t.slug
                        ? "font-semibold text-[#1D59FF]"
                        : "text-ink"
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
              className="border-t border-rule-soft"
            >
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-ink-soft hover:bg-paper-tint-soft hover:text-ink"
              >
                <EyeOff size={12} />
                Exit preview
              </button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition-colors ${
          active
            ? "bg-[#1D59FF] text-white hover:bg-[#d44425]"
            : "bg-ink text-white hover:bg-ink/90"
        }`}
        title={active ? `Previewing as ${activeName}` : "Preview as a student"}
      >
        <Eye size={13} />
        <span className="max-w-[160px] truncate">
          {active ? `Previewing: ${activeName}` : "Preview as student"}
        </span>
        <ChevronUp
          size={12}
          className={`transition-transform ${open ? "" : "rotate-180"}`}
        />
      </button>
    </div>
  );
}
