import { catalystConfig } from "./catalyst";
import { forteConfig } from "./forte";
import { marketingConfig, MARKETING_SLUG } from "./marketing";
import type { ProgramConfig, TrackConfig } from "./types";

const PROGRAMS: Record<string, ProgramConfig> = {
  catalyst: catalystConfig,
};

// Marketing and Forte are intentionally NOT in PROGRAMS (so they're excluded
// from getAllPrograms and the program switcher). They're resolved separately:
// marketing → apex domain; forte → /join/forte and auth callback only.
const SPECIAL_CONFIGS: Record<string, ProgramConfig> = {
  [MARKETING_SLUG]: marketingConfig,
  forte: forteConfig,
};

/**
 * Map hostnames to program slugs.
 *
 * With the Catalyst consolidation, all program subdomains are retired.
 * The apex (bccacademy.io) serves marketing for unauthenticated visitors;
 * the program-override cookie routes authenticated users to Catalyst.
 * Legacy subdomains redirect to the apex via DNS/Vercel config.
 */
const DOMAIN_MAP: Record<string, string> = {
  "bccacademy.io": MARKETING_SLUG,
  "www.bccacademy.io": MARKETING_SLUG,
  // Legacy subdomains — kept so existing bookmarks/links don't 404.
  // They resolve to the Catalyst program, same as the override cookie.
  "atg.bccacademy.io": "catalyst",
  "forge.bccacademy.io": "catalyst",
  "forte.bccacademy.io": "catalyst",
  "catalyst.bccacademy.io": "catalyst",
  "ai-fundamentals.bccacademy.io": "catalyst",
  "ai-digital-natives.bccacademy.io": "catalyst",
  "ai-automation.bccacademy.io": "catalyst",
};

/**
 * Returns true when the host is a recognized program subdomain.
 * Used to decide whether the override cookie should win or the URL.
 *
 * The marketing apex (`bccacademy.io`) is intentionally excluded: it
 * resolves to marketing by default, but we want the program-override
 * cookie to win there so authenticated users land in Catalyst.
 */
export function isKnownProgramHost(host: string): boolean {
  const bare = host.replace(/:\d+$/, "");
  const slug = DOMAIN_MAP[bare] ?? DOMAIN_MAP[host];
  return slug !== undefined && slug !== MARKETING_SLUG;
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
