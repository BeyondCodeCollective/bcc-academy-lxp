import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// One shared rules vocabulary for course automation (the Brightspace lesson:
// content gating, badges, and agents all run off one condition engine there).
// Both automations read the same track_automation row:
//   completion rule  → auto-certificates
//   nudge rules      → scheduled engagement emails

export type CompletionRule = {
  /** "all" = every video week the course has; a number = at least N weeks. */
  lessons: "all" | number;
  /** Require at least N submissions. Omit to not require any. */
  submissions?: number;
};

export type NudgeRule = {
  /** "never-started" (enrolled, no activity) or "stalled" (started, went quiet). */
  id: "never-started" | "stalled";
  afterDays: number;
};

export type TrackAutomation = {
  programId: string;
  trackSlug: string;
  autoCertificate: boolean;
  completion: CompletionRule;
  nudgesEnabled: boolean;
  nudges: NudgeRule[];
};

export const DEFAULT_COMPLETION: CompletionRule = { lessons: "all" };
export const DEFAULT_NUDGES: NudgeRule[] = [
  { id: "never-started", afterDays: 7 },
  { id: "stalled", afterDays: 14 },
];

function parseRow(r: Record<string, unknown>): TrackAutomation {
  const completion = (r.completion ?? {}) as Partial<CompletionRule>;
  const nudges = Array.isArray(r.nudges) ? (r.nudges as NudgeRule[]) : DEFAULT_NUDGES;
  return {
    programId: r.program_id as string,
    trackSlug: r.track_slug as string,
    autoCertificate: !!r.auto_certificate,
    completion: {
      lessons:
        completion.lessons === "all" || typeof completion.lessons === "number"
          ? completion.lessons
          : "all",
      ...(typeof completion.submissions === "number"
        ? { submissions: completion.submissions }
        : {}),
    },
    nudgesEnabled: !!r.nudges_enabled,
    nudges: nudges.filter(
      (n) =>
        (n.id === "never-started" || n.id === "stalled") &&
        typeof n.afterDays === "number" &&
        n.afterDays >= 1,
    ),
  };
}

/**
 * Every track with any automation switched on. Fails soft to [] when the
 * table doesn't exist yet, so the cron and admin UI can deploy ahead of the
 * migration.
 */
export async function getEnabledAutomations(
  svc: SupabaseClient,
): Promise<TrackAutomation[]> {
  const { data, error } = await svc
    .from("track_automation")
    .select("*")
    .or("auto_certificate.eq.true,nudges_enabled.eq.true");
  if (error) {
    console.warn("[automation] rules unavailable:", error.message);
    return [];
  }
  return (data ?? []).map(parseRow);
}

/** The rules row for one course (admin UI), or null when none saved yet. */
export async function getTrackAutomation(
  svc: SupabaseClient,
  programId: string,
  trackSlug: string,
): Promise<TrackAutomation | null> {
  const { data, error } = await svc
    .from("track_automation")
    .select("*")
    .eq("program_id", programId)
    .eq("track_slug", trackSlug)
    .maybeSingle();
  if (error || !data) return null;
  return parseRow(data);
}
