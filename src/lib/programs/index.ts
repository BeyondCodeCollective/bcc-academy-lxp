import { atgConfig } from "./atg";
import { forgeConfig } from "./forge";
import { forteConfig } from "./forte";
import { catalystConfig } from "./catalyst";
import { marketingConfig, MARKETING_SLUG } from "./marketing";
import type { ProgramConfig, TrackConfig } from "./types";

const PROGRAMS: Record<string, ProgramConfig> = {
  atg: atgConfig,
  forge: forgeConfig,
  forte: forteConfig,
  catalyst: catalystConfig,
};

// Marketing is intentionally NOT in PROGRAMS (so it's excluded from
// getAllPrograms and the program switcher). It's resolved separately so
// the apex domain renders marketing pages rather than a program login.
const SPECIAL_CONFIGS: Record<string, ProgramConfig> = {
  [MARKETING_SLUG]: marketingConfig,
};

/**
 * Map hostnames to program slugs.
 * Localhost defaults to the DEFAULT_PROGRAM env var or "atg".
 */
const DOMAIN_MAP: Record<string, string> = {
  "atg.bccacademy.io": "atg",
  "forge.bccacademy.io": "forge",
  "forte.bccacademy.io": "forte",
  "catalyst.bccacademy.io": "catalyst",
  "bccacademy.io": MARKETING_SLUG,
  "www.bccacademy.io": MARKETING_SLUG,
};

/**
 * Returns true when the host is a recognized program subdomain.
 * Used to decide whether the override cookie should win or the URL.
 *
 * The marketing apex (`bccacademy.io`) is intentionally excluded: it
 * resolves to marketing by default, but we want the program-override
 * cookie to win there so super-admins can preview a program from the
 * apex (e.g. before IT has provisioned that program's subdomain).
 */
export function isKnownProgramHost(host: string): boolean {
  const bare = host.replace(/:\d+$/, "");
  const slug = DOMAIN_MAP[bare] ?? DOMAIN_MAP[host];
  return slug !== undefined && slug !== MARKETING_SLUG;
}

/**
 * Resolve a hostname to a program config.
 * Falls back to ATG if the domain isn't recognized.
 */
export function getProgramByDomain(host: string): ProgramConfig {
  // Strip port for localhost matching
  const bare = host.replace(/:\d+$/, "");
  const slug = DOMAIN_MAP[bare] ?? DOMAIN_MAP[host] ?? process.env.DEFAULT_PROGRAM ?? "atg";
  return SPECIAL_CONFIGS[slug] ?? PROGRAMS[slug] ?? PROGRAMS.atg;
}

/**
 * Get a program config by its slug.
 */
export function getProgramBySlug(slug: string): ProgramConfig {
  return SPECIAL_CONFIGS[slug] ?? PROGRAMS[slug] ?? PROGRAMS.atg;
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

// Pre-launch kill-switch for the AI Tutor. Flip back to `false` once we're
// ready to re-enable per-program tutor configs. While true: the
// /dashboard/tutor route 404s, /api/tutor refuses requests, the dashboard
// nav hides the link, and the welcome email omits the tutor blurb.
export const TUTOR_DISABLED_PRELAUNCH = true;

export function isTutorAvailable(program: ProgramConfig): boolean {
  if (TUTOR_DISABLED_PRELAUNCH) return false;
  return program.tutorConfig?.enabled !== false;
}
