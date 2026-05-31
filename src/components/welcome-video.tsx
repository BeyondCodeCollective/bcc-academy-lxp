"use client";

import { useState } from "react";

interface Props {
  videoSrc: string;
  title: string;
  presenter?: string;
}

export function WelcomeVideo({ videoSrc, title, presenter }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden border border-rule bg-surface-elevated">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 sm:px-5 py-3 sm:py-4 min-h-[44px] transition-colors hover:bg-neutral-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900">
            <span className="text-white ml-0.5">▶</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-neutral-900">
              {title}
            </p>
            {presenter && (
              <p className="text-xs text-neutral-500">
                A message from {presenter}
              </p>
            )}
          </div>
        </div>
        <span className={`shrink-0 text-neutral-400 transition-transform duration-200 inline-block ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-neutral-100">
            <div className="flex justify-center w-full bg-neutral-900">
              <video
                src={videoSrc}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[480px] object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
