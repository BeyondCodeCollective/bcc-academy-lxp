"use client";

import { useState } from "react";
import { ChevronDown, Play } from "lucide-react";

interface Props {
  videoSrc: string;
  title: string;
  presenter?: string;
}

export function WelcomeVideo({ videoSrc, title, presenter }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden panel">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 sm:px-5 py-3 sm:py-4 min-h-[44px] transition-colors hover:bg-paper-tint-soft"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink">
            <Play size={14} className="text-white ml-0.5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-ink">
              {title}
            </p>
            {presenter && (
              <p className="text-xs text-ink-soft">
                A message from {presenter}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-ink-faint transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-rule-soft">
            <div className="flex justify-center w-full bg-ink">
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
