import { headers, cookies } from "next/headers";
import { getProgramBySlug, getProgramByDomain, isKnownProgramHost } from "./index";
import type { ProgramConfig } from "./types";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Get the current program config in a server component or server action.
 *
 * Resolution order (first match wins):
 *  1. Recognized production host (e.g. atg.bccacademy.io) — URL is the
 *     strongest signal and can't be faked by a cookie.
 *  2. `program-override` cookie — set by the super-admin program switcher
 *     in the admin panel; only honored on non-production hosts.
 *  3. `x-program-slug` request header — set by middleware on every request
 *     so server actions (which don't receive the original URL) can read it.
 *  4. `program-slug` cookie — fallback for requests where the header hasn't
 *     propagated yet (e.g. first render on a cold edge node).
 *  5. Domain-based lookup on the raw host — handles unknown subdomains and
 *     local dev (falls back to the default program for the domain).
 *
 * For client components inside /dashboard: use `useProgram()` from
 * @/lib/programs/context — the layout already provides it via ProgramProvider.
 * For client components outside /dashboard (e.g. public survey pages):
 * use `useProgramSlug()` from @/lib/programs/use-program-slug.
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

// Resolves the current program's database UUID. Use this in server actions
// that write to tables with a program_id FK — saves every action from
// re-querying programs by slug.
export async function getProgramId(): Promise<string> {
  const program = await getProgram();
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("programs")
    .select("id")
    .eq("slug", program.slug)
    .single();
  if (error || !data) throw new Error(`Program not found: ${program.slug}`);
  return data.id;
}
