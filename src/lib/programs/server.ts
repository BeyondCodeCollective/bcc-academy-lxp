import { headers } from "next/headers";
import { getProgramBySlug } from "./index";
import type { ProgramConfig } from "./types";

/**
 * Get the current program config in a server component or server action.
 * Reads the program slug set by middleware via the x-program-slug header.
 */
export async function getProgram(): Promise<ProgramConfig> {
  const h = await headers();
  const slug = h.get("x-program-slug") ?? "atg";
  return getProgramBySlug(slug);
}
