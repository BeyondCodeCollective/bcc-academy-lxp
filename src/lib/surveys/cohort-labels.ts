import { getHomeProgramForTrack } from "@/lib/programs";

// Canonical cohort labels for the Beyond Code Centers spring-2026 AI tracks.
// These MUST match the `program_variant` radio options the public surveys
// collect (see schemas.ts) so authenticated and public responses land in the
// SAME Survey Insights cohort bucket. Without this, an auth survey would be
// tagged with the TS-config track *name* ("AI for Digital Natives"), which is
// a different string from the public option ("AI Fundamentals for Digital
// Natives") — silently splitting one cohort into two.
export const BCC_TRACK_VARIANT_LABELS: Record<string, string> = {
  "ai-fundamentals": "AI Fundamentals",
  "ai-digital-natives": "AI Fundamentals for Digital Natives",
  "comptia-security": "Comptia Security+",
};

// Collapse a raw cohort value (a stored program_variant / _cohort_track, which
// may be a slug OR an already-human label) to its canonical label. Used at READ
// time in Survey Insights so a slug bucket ("comptia-security") and a label
// bucket ("Comptia Security+") never split one cohort in two. Unknown values
// pass through trimmed.
export function normalizeCohortLabel(raw: string): string {
  const trimmed = raw.trim();
  return BCC_TRACK_VARIANT_LABELS[trimmed] ?? trimmed;
}

// Surveys that belong to exactly ONE cohort by construction — an application
// or agreement for a specific course can't be any other cohort. Used as the
// last rung of the read-time tagging chain (enrollment → allowlist → this),
// so responses from people with no enrollment yet (public applicants, invited
// signers) still land in the right bucket instead of "Untagged".
export const SURVEY_COHORT_DEFAULTS: Record<string, string> = {
  "security-plus-application": "Comptia Security+",
  "comptia-security-agreement": "Comptia Security+",
  "comptia-security-pre": "Comptia Security+",
  "network-plus-post": "CompTIA Network+",
};

// Resolve a cohort label from a student's track enrollments, preferring a
// track whose home program matches `programSlug` (mirrors how submission picks
// the relevant track). Canonical variant labels win so auth + public responses
// group together; otherwise fall back to the track's display name, then slug.
// Returns undefined when the student has no enrollments to derive from.
export function deriveCohortLabel(
  trackSlugs: string[],
  programSlug: string,
): string | undefined {
  if (trackSlugs.length === 0) return undefined;
  const chosen =
    trackSlugs.find((s) => getHomeProgramForTrack(s)?.slug === programSlug) ??
    trackSlugs[0];
  return (
    BCC_TRACK_VARIANT_LABELS[chosen] ??
    getHomeProgramForTrack(chosen)?.tracks.find((t) => t.slug === chosen)?.name ??
    chosen
  );
}
