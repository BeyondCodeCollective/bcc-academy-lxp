"use client";

import { useState } from "react";
import { ChevronDown, Play } from "lucide-react";

export function WelcomeVideo() {
  const [open, setOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 sm:px-5 py-3 sm:py-4 min-h-[44px] transition-colors hover:bg-neutral-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900">
            <Play size={14} className="text-white ml-0.5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-neutral-900">
              Welcome to After The Game
            </p>
            <p className="text-xs text-neutral-400">
              A message from Ramon Clemente
            </p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-neutral-400 transition-transform duration-200 ${
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
          <div className="border-t border-neutral-100">
            <div className="flex justify-center w-full bg-neutral-900">
              <video
                src="/atg-intro.mp4"
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
