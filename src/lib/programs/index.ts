import { catalystConfig } from "./catalyst";
import { atgConfig } from "./atg";
import { forteConfig } from "./forte";
import { beyondCodeCentersConfig } from "./beyond-code-centers";
import { bgcConfig } from "./bgc";
import { marketingConfig, MARKETING_SLUG } from "./marketing";
import type { ProgramConfig, TrackConfig } from "./types";

const PROGRAMS: Record<string, ProgramConfig> = {
  catalyst: catalystConfig,
};

// Marketing, Forte, and BGC are intentionally NOT in PROGRAMS (so they're
// excluded from getAllPrograms and the program switcher). They're resolved
// separately: marketing → apex domain; forte → /join/forte; bgc → /join/bgc
// and the BGC camp landing pages. BGC (Black Girls Code) is its own org, not a
// Catalyst track.
//
// Beyond the Game (slug `atg`) and Beyond Code Centers are standalone programs
// — their tracks no longer aggregate into Catalyst. Registered here so they're
// switchable and own their tracks via getHomeProgramForTrack.
const SPECIAL_CONFIGS: Record<string, ProgramConfig> = {
  [MARKETING_SLUG]: marketingConfig,
  atg: atgConfig,
  forte: forteConfig,
  "beyond-code-centers": beyondCodeCentersConfig,
  bgc: bgcConfig,
};

/**
 * Map hostnames to program slugs.
 *
 * All programs run on bccacademy.io. The apex serves marketing for
 * unauthenticated visitors; program context is carried by the
 * program-slug cookie (set by middleware) or the program-override
 * cookie (super-admin switcher).
 */
const DOMAIN_MAP: Record<string, string> = {
  "bccacademy.io": MARKETING_SLUG,
  "www.bccacademy.io": MARKETING_SLUG,
};

/**
 * Always returns false — there are no program subdomains.
 * Kept so callers (auth callback) don't need to change.
 */
export function isKnownProgramHost(_host: string): boolean {
  return false;
}

/**
 * Resolve a hostname to a program config.
 * Falls back to Catalyst if the domain isn't recognized.
 */
export function getProgramByDomain(host: string): ProgramConfig {
  const bare = host.replace(/:\d+$/, "");
  const slug = DOMAIN_MAP[bare] ?? DOMAIN_MAP[host] ?? process.env.DEFAULT_PROGRAM ?? "catalyst";
  return SPECIAL_CONFIGS[slug] ?? PROGRAMS[slug] ?? PROGRAMS.catalyst;
}

/**
 * Get a program config by its slug.
 */
export function getProgramBySlug(slug: string): ProgramConfig {
  return SPECIAL_CONFIGS[slug] ?? PROGRAMS[slug] ?? PROGRAMS.catalyst;
}

/**
 * Get all registered program configs.
 */
export function getAllPrograms(): ProgramConfig[] {
  return Object.values(PROGRAMS);
}

/**
 * Full program configs for every program a new student could self-join
 * (Catalyst + Forte). Used by the "No account found" CTA list on /login
 * so a Forte invitee who lost their join link can still self-route to
 * the right program instead of accidentally signing up for Catalyst.
 */
export function getJoinablePrograms(): ProgramConfig[] {
  const joinable: ProgramConfig[] = [...Object.values(PROGRAMS)];
  for (const [slug, cfg] of Object.entries(SPECIAL_CONFIGS)) {
    if (slug !== MARKETING_SLUG) joinable.push(cfg);
  }
  return joinable;
}

/**
 * Find a track config within a program by its slug.
 */
export function getTrackBySlug(program: ProgramConfig, trackSlug: string): TrackConfig | undefined {
  return program.tracks.find((t) => t.slug === trackSlug);
}

/**
 * Find the "home" program for a track — the original config the track was
 * authored in. Catalyst spreads tracks from other programs (ATG, Forge,
 * Forte), so a track resolved via Catalyst doesn't tell you where it
 * actually lives.
 *
 * Walks the special configs first (forte) and then registered programs,
 * skipping Catalyst itself — those are the underlying owners. Falls back
 * to Catalyst when nothing else claims the track (e.g. additionalTracks
 * that only live in Catalyst's config).
 */
export function getHomeProgramForTrack(trackSlug: string): ProgramConfig | undefined {
  for (const cfg of Object.values(SPECIAL_CONFIGS)) {
    if (cfg.slug === MARKETING_SLUG) continue;
    if (cfg.tracks.some((t) => t.slug === trackSlug)) return cfg;
  }
  for (const cfg of Object.values(PROGRAMS)) {
    if (cfg.slug === "catalyst") continue;
    if (cfg.tracks.some((t) => t.slug === trackSlug)) return cfg;
  }
  return PROGRAMS.catalyst?.tracks.some((t) => t.slug === trackSlug)
    ? PROGRAMS.catalyst
    : undefined;
}

/**
 * Returns true when the slug is a known TS-config program (PROGRAMS or
 * SPECIAL_CONFIGS). Used by resolveBaseProgram() to decide whether to
 * fall through to the DB lookup for is_dynamic programs.
 */
export function hasTsConfigSlug(slug: string): boolean {
  return slug in PROGRAMS || slug in SPECIAL_CONFIGS;
}

export type { ProgramConfig, TrackConfig, WeekConfig, SessionInfo } from "./types";

// Pre-launch kill-switch for the AI Tutor. Flip back to `false` once we're
// ready to re-enable per-program tutor configs. While true: the
// /dashboard/tutor route 404s, /api/tutor refuses requests, the dashboard
// nav hides the link, and the welcome email omits the tutor blurb.
export const TUTOR_DISABLED_PRELAUNCH = false;

export function isTutorAvailable(program: ProgramConfig): boolean {
  if (TUTOR_DISABLED_PRELAUNCH) return false;
  // Opt-in: a program only gets the tutor if it explicitly enables it with a
  // tutorConfig. This keeps the unguarded generic prompt from reaching programs
  // that haven't been given (and tested with) their own system prompt — only
  // Forte/Upskill Bahamas is enabled today.
  return program.tutorConfig?.enabled === true;
}
