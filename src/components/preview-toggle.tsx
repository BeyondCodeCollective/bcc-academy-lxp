"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { setPreviewTrackSlug, togglePreviewTrackSlug } from "@/app/dashboard/preview-actions";
import { Eye, EyeOff, ChevronUp, ArrowRight, GraduationCap } from "lucide-react";

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
  enrolledSlugs = [],
  learnerHref = null,
}: {
  previewingSlugs: string[];
  groups: ProgramGroup[];
  /** Courses this staffer is actually enrolled in. */
  enrolledSlugs?: string[];
  /** The course this staffer takes as a learner, when one is running. */
  learnerHref?: string | null;
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
  const onAdmin = usePathname().startsWith("/dashboard/admin");
  // A staffer on their own course's pages is not previewing: they are a
  // learner here. Say so, and keep the way back to admin one click away.
  const ownLearnerView = !active && !onAdmin && !!learnerHref;
  const firstName =
    groups
      .flatMap((g) => g.tracks)
      .find((t) => t.slug === previewingSlugs[0])?.name ?? previewingSlugs[0];
  const buttonLabel = ownLearnerView
    ? "Your learner view"
    : !active
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
          {onAdmin && !active && learnerHref && (
            <Link
              href={learnerHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 border-b border-rule-soft px-3 py-2.5 text-xs font-semibold text-ink hover:bg-paper-tint-soft"
            >
              <GraduationCap size={13} />
              Your learner view
            </Link>
          )}
          <p className="border-b border-rule-soft px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
            Preview as student, enrolled in
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
                            {selected ? (
                              <span className="shrink-0 text-[10px]">✓</span>
                            ) : (
                              enrolledSlugs.includes(t.slug) && (
                                <span className="shrink-0 text-[10px] font-medium text-ink-faint">
                                  You&apos;re enrolled
                                </span>
                              )
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

      <div
        className={`inline-flex items-stretch overflow-hidden rounded-full text-xs font-semibold text-white shadow-sm ${
          active ? "bg-primary" : "bg-ink"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`inline-flex items-center gap-2 py-2 pl-4 transition-colors ${ownLearnerView ? "pr-3" : "pr-4"} ${
            active ? "hover:bg-primary-hover" : "hover:bg-ink/90"
          }`}
          title={buttonLabel}
        >
          {ownLearnerView ? <GraduationCap size={13} /> : <Eye size={13} />}
          <span className="max-w-[160px] truncate">{buttonLabel}</span>
          <ChevronUp
            size={12}
            className={`transition-transform ${open ? "" : "rotate-180"}`}
          />
        </button>
        {ownLearnerView && (
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 border-l border-white/20 py-2 pl-3 pr-4 transition-colors hover:bg-ink/90"
          >
            Admin
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}
