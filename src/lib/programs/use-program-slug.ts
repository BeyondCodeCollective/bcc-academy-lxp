"use client";

import { useMemo } from "react";

// Reads the program slug on the client from the cookie set by middleware.
// Use this in client components that live outside the /dashboard layout
// (which has ProgramProvider). Inside /dashboard, prefer useProgram() from
// @/lib/programs/context to get the full ProgramConfig.
export function useProgramSlug(): string {
  return useMemo(() => {
    if (typeof document === "undefined") return "";
    const match = document.cookie.match(/(?:^|;\s*)program-slug=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }, []);
}
