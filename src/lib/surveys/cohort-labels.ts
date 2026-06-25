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
