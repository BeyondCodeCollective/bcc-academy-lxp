"use client";

import { useEffect, useState } from "react";
import {
  TEXT_SCALE_COOKIE,
  TEXT_SCALES,
  DEFAULT_TEXT_SCALE,
  parseTextScale,
  rootFontSizeFor,
  type TextScale,
} from "@/lib/accessibility/scale";

// Three-button A A A toggle. Each button's own label is rendered at its
// scale so the control demonstrates what the scale does at a glance.
//
// Used both in the dashboard nav (compact=true) and at the top of public
// pages (compact=false).

export function TextScaleToggle({
  compact = false,
  tone = "light",
}: {
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  const [scale, setScale] = useState<TextScale>(DEFAULT_TEXT_SCALE);

  useEffect(() => {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${TEXT_SCALE_COOKIE}=(\\d+)`),
    );
    setScale(parseTextScale(match?.[1]));
  }, []);

  function apply(next: TextScale) {
    setScale(next);
    document.cookie =
      `${TEXT_SCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.style.fontSize = rootFontSizeFor(next);
  }

  const baseBtn =
    tone === "dark"
      ? "text-neutral-300 hover:bg-white/10 hover:text-white"
      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900";
  const activeBtn =
    tone === "dark"
      ? "bg-white/15 text-white"
      : "bg-neutral-900 text-white";

  return (
    <div
      role="group"
      aria-label="Text size"
      className={`inline-flex items-center ${
        compact ? "gap-0.5" : "gap-1"
      } ${
        tone === "dark" ? "bg-transparent" : "bg-neutral-50"
      } p-0.5`}
    >
      {!compact && (
        <span
          className={`px-1.5 text-xs font-medium ${
            tone === "dark" ? "text-neutral-400" : "text-neutral-600"
          }`}
        >
          Text size
        </span>
      )}
      {TEXT_SCALES.map((s, i) => {
        const isActive = scale === s;
        const labelSize = i === 0 ? "0.75rem" : i === 1 ? "0.95rem" : "1.15rem";
        return (
          <button
            key={s}
            type="button"
            onClick={() => apply(s)}
            aria-label={`Text size ${s} percent`}
            aria-pressed={isActive}
            className={`min-h-[32px] min-w-[32px] rounded-md px-2 font-semibold leading-none transition-colors ${
              isActive ? activeBtn : baseBtn
            }`}
            style={{ fontSize: labelSize }}
          >
            A
          </button>
        );
      })}
    </div>
  );
}
