"use client";

import { useState, useRef, useEffect } from "react";
import { setPreviewTrackSlug, togglePreviewTrackSlug } from "@/app/dashboard/preview-actions";
import { Eye, EyeOff, ChevronUp } from "lucide-react";

type TrackOption = { slug: string; name: string };
type ProgramGroup = {
  /** Home program slug — moved into context on select. Empty for the
   *  cross-program Lunch & Learns entry, which has no single home program. */
  programSlug: string;
  /** Group header. Empty string renders the group's items without a header. */
  programName: string;
  tracks: TrackOption[];
};

export function PreviewToggle({
  previewingSlugs,
  groups,
}: {
  previewingSlugs: string[];
  groups: ProgramGroup[];
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

  const active = previewingSlugs.length > 0;
  const firstName =
    groups
      .flatMap((g) => g.tracks)
      .find((t) => t.slug === previewingSlugs[0])?.name ?? previewingSlugs[0];
  const buttonLabel = !active
    ? "Preview as student"
    : previewingSlugs.length === 1
      ? `Previewing: ${firstName}`
      : `Previewing: ${previewingSlugs.length} courses`;

  return (
    // Floats over page content; the dashboard footer carries matching bottom
    // padding on mobile so this never covers the Privacy/Terms links.
    <div ref={ref} className="fixed bottom-4 right-4 z-40">
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-64 overflow-hidden panel shadow-xl">
          <p className="border-b border-rule-soft px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
            Preview as enrolled in
          </p>
          {/* Each click toggles that course in/out of the preview set — pick
             two or more (same program) to see the multi-course learner home. */}
          <ul className="max-h-72 overflow-y-auto">
            {groups.map((group) => (
              <li key={group.programSlug || "_general"}>
                {group.programName && (
                  <p className="bg-paper-tint-soft px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    {group.programName}
                  </p>
                )}
                <ul>
                  {group.tracks.map((t) => {
                    const selected = previewingSlugs.includes(t.slug);
                    return (
                      <li key={t.slug}>
                        <form action={togglePreviewTrackSlug.bind(null, t.slug)}>
                          <button
                            type="submit"
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-paper-tint-soft ${
                              selected
                                ? "font-semibold text-[#1D59FF]"
                                : "text-ink"
                            }`}
                          >
                            <span className="truncate">{t.name}</span>
                            {selected && (
                              <span className="shrink-0 text-[10px]">✓</span>
                            )}
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
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
            ? "bg-primary text-white hover:bg-primary-hover"
            : "bg-ink text-white hover:bg-ink/90"
        }`}
        title={buttonLabel}
      >
        <Eye size={13} />
        <span className="max-w-[160px] truncate">{buttonLabel}</span>
        <ChevronUp
          size={12}
          className={`transition-transform ${open ? "" : "rotate-180"}`}
        />
      </button>
    </div>
  );
}
