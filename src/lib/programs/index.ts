import { atgConfig } from "./atg";
import { forgeConfig } from "./forge";
import { catalystConfig } from "./catalyst";
import type { ProgramConfig, TrackConfig } from "./types";

const PROGRAMS: Record<string, ProgramConfig> = {
  atg: atgConfig,
  forge: forgeConfig,
  catalyst: catalystConfig,
};

/**
 * Map hostnames to program slugs.
 * Localhost defaults to the DEFAULT_PROGRAM env var or "atg".
 */
const DOMAIN_MAP: Record<string, string> = {
  "atg.bccacademy.io": "atg",
  "forge.bccacademy.io": "forge",
  "catalyst.bccacademy.io": "catalyst",
};

/**
 * Returns true when the host is a recognized program subdomain.
 * Used to decide whether the override cookie should win or the URL.
 */
export function isKnownProgramHost(host: string): boolean {
  const bare = host.replace(/:\d+$/, "");
  return bare in DOMAIN_MAP || host in DOMAIN_MAP;
}

/**
 * Resolve a hostname to a program config.
 * Falls back to ATG if the domain isn't recognized.
 */
export function getProgramByDomain(host: string): ProgramConfig {
  // Strip port for localhost matching
  const bare = host.replace(/:\d+$/, "");
  const slug = DOMAIN_MAP[bare] ?? DOMAIN_MAP[host] ?? process.env.DEFAULT_PROGRAM ?? "atg";
  return PROGRAMS[slug] ?? PROGRAMS.atg;
}

/**
 * Get a program config by its slug.
 */
export function getProgramBySlug(slug: string): ProgramConfig {
  return PROGRAMS[slug] ?? PROGRAMS.atg;
}

/**
 * Get all registered program configs.
 */
export function getAllPrograms(): ProgramConfig[] {
  return Object.values(PROGRAMS);
}

/**
 * Find a track config within a program by its slug.
 */
export function getTrackBySlug(program: ProgramConfig, trackSlug: string): TrackConfig | undefined {
  return program.tracks.find((t) => t.slug === trackSlug);
}

export type { ProgramConfig, TrackConfig, WeekConfig, SessionInfo } from "./types";
