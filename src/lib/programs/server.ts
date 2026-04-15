import { headers, cookies } from "next/headers";
import { getProgramBySlug, getProgramByDomain } from "./index";
import type { ProgramConfig } from "./types";

/**
 * Get the current program config in a server component or server action.
 * Tries multiple detection methods:
 * 1. x-program-slug header (set by middleware)
 * 2. program-slug cookie (set by middleware)
 * 3. Host header (direct domain detection as fallback)
 */
export async function getProgram(): Promise<ProgramConfig> {
  const h = await headers();

  // Try middleware-set header first
  const headerSlug = h.get("x-program-slug");
  if (headerSlug) return getProgramBySlug(headerSlug);

  // Try cookie
  const c = await cookies();
  const cookieSlug = c.get("program-slug")?.value;
  if (cookieSlug) return getProgramBySlug(cookieSlug);

  // Fallback: read host header directly
  const host = h.get("host") ?? "localhost:3000";
  return getProgramByDomain(host);
}
