"use client";

import { useEffect } from "react";
import { TEXT_SCALE_COOKIE, parseTextScale, rootFontSizeFor } from "@/lib/accessibility/scale";

export function TextScaleProvider() {
  useEffect(() => {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${TEXT_SCALE_COOKIE}=([^;]+)`),
    );
    const raw = match ? match[1] : null;
    document.documentElement.style.fontSize = rootFontSizeFor(parseTextScale(raw));
  }, []);

  return null;
}
