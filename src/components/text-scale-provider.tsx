"use client";

import { useEffect } from "react";
import { TEXT_SCALE_COOKIE, parseTextScale, rootFontSizeFor } from "@/lib/accessibility/scale";

export function TextScaleProvider() {
  useEffect(() => {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${TEXT_SCALE_COOKIE}=([^;]+)`),
    );
    // No saved preference: leave the root to the stylesheet, so a route that
    // ships its own default is not overwritten back to 100%.
    if (!match) return;
    document.documentElement.style.fontSize = rootFontSizeFor(parseTextScale(match[1]));
  }, []);

  return null;
}
