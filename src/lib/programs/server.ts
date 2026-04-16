import { headers, cookies } from "next/headers";
import { getProgramBySlug, getProgramByDomain, isKnownProgramHost } from "./index";
import type { ProgramConfig } from "./types";

/**
 * Get the current program config in a server component or server action.
 *
 * Priority:
 * 1. If host is a recognized program subdomain (e.g. forge.bccacademy.io),
 *    the URL wins — explicit navigation is the strongest signal.
 * 2. Otherwise (localhost, vercel previews, etc.), honor the
 *    program-override cookie set by the super-admin switcher.
 * 3. Fall back to the middleware-set header / cookie / host detection.
 */
export async function getProgram(): Promise<ProgramConfig> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";

  if (isKnownProgramHost(host)) {
    return getProgramByDomain(host);
  }

  const c = await cookies();
  const overrideSlug = c.get("program-override")?.value;
  if (overrideSlug) return getProgramBySlug(overrideSlug);

  const headerSlug = h.get("x-program-slug");
  if (headerSlug) return getProgramBySlug(headerSlug);

  const cookieSlug = c.get("program-slug")?.value;
  if (cookieSlug) return getProgramBySlug(cookieSlug);

  return getProgramByDomain(host);
}
