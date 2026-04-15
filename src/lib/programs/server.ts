import { headers, cookies } from "next/headers";
import { getProgramBySlug, getProgramByDomain } from "./index";
import type { ProgramConfig } from "./types";

/**
 * Get the current program config in a server component or server action.
 * Tries multiple detection methods:
 * 1. program-override cookie (super_admin program switcher — takes highest priority)
 * 2. x-program-slug header (set by middleware from domain)
 * 3. program-slug cookie (set by middleware)
 * 4. Host header (direct domain detection as fallback)
 */
export async function getProgram(): Promise<ProgramConfig> {
  const c = await cookies();

  // Super-admin program switcher override (set from admin panel)
  const overrideSlug = c.get("program-override")?.value;
  if (overrideSlug) return getProgramBySlug(overrideSlug);

  const h = await headers();

  // Try middleware-set header
  const headerSlug = h.get("x-program-slug");
  if (headerSlug) return getProgramBySlug(headerSlug);

  // Try cookie
  const cookieSlug = c.get("program-slug")?.value;
  if (cookieSlug) return getProgramBySlug(cookieSlug);

  // Fallback: read host header directly
  const host = h.get("host") ?? "localhost:3000";
  return getProgramByDomain(host);
}
