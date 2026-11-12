"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/**
 * One expandable line inside a session row on the week page (its recording,
 * its survey). The content is unmounted while closed, so a collapsed
 * recording never loads or keeps playing.
 */
export function SessionDisclosure({
  label,
  meta,
  defaultOpen = false,
  children,
}: {
  label: string;
  /** Quiet status after the label, e.g. "Answered" or "2 questions". */
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="group flex min-h-[44px] w-full items-center gap-2 text-left text-sm"
      >
        <ChevronRight
          size={14}
          className={`shrink-0 text-ink-faint transition-transform group-hover:text-ink ${
            open ? "rotate-90" : ""
          }`}
        />
        <span className="font-medium text-ink">{label}</span>
        {meta && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-faint">{meta}</span>
        )}
      </button>
      {open && (
        <div id={panelId} className="pb-4 pl-[22px]">
          {children}
        </div>
      )}
    </div>
  );
}
