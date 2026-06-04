import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { FeatureToggles } from "./feature-toggles";

const PROGRAM_LABELS: Record<string, string> = {
  catalyst:  "Catalyst",
  atg:       "After the Game",
  forte:     "Beyond Code Centers",
  forge:     "Forge",
};

export default async function FeaturesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();

  // Use the DB as the only source of truth for which tracks belong to which program.
  // track_overrides is what the admin panel actually manages — don't use TS config here.
  const { data: programs } = await svc
    .from("programs")
    .select("id, slug, name")
    .order("slug");

  const programSlugs = (programs ?? []).map((p) => p.slug as string);

  // Load track_overrides grouped by program
  const { data: trackRows } = await svc
    .from("track_overrides")
    .select("track_slug, name, program_id")
    .is("archived_at", null);

  const programIdToSlug = Object.fromEntries(
    (programs ?? []).map((p) => [p.id as string, p.slug as string])
  );

  const programTracks: Record<string, { slug: string; name: string }[]> = {};
  for (const slug of programSlugs) {
    programTracks[slug] = [];
  }
  for (const row of trackRows ?? []) {
    const progSlug = programIdToSlug[row.program_id as string];
    if (progSlug) {
      programTracks[progSlug] = [
        ...(programTracks[progSlug] ?? []),
        { slug: row.track_slug as string, name: (row.name as string) ?? row.track_slug as string },
      ];
    }
  }

  // Load program-level feature flags
  const { data: progFlagRows } = await svc
    .from("program_features")
    .select("program_slug, assessment_enabled")
    .in("program_slug", programSlugs);

  const programFlagsMap: Record<string, boolean> = {};
  for (const row of progFlagRows ?? []) {
    programFlagsMap[row.program_slug as string] = row.assessment_enabled as boolean;
  }

  // Load track-level feature flags
  const allTrackSlugs = Object.values(programTracks).flat().map((t) => t.slug);
  const { data: trackFlagRows } = allTrackSlugs.length > 0
    ? await svc
        .from("track_features")
        .select("track_slug, assessment_enabled")
        .in("track_slug", allTrackSlugs)
    : { data: [] };

  const trackFlagsMap: Record<string, boolean> = {};
  for (const row of trackFlagRows ?? []) {
    trackFlagsMap[row.track_slug as string] = row.assessment_enabled as boolean;
  }

  // Show known programs in a sensible order; fall back to DB order for unknowns
  const orderedSlugs = ["catalyst", "atg", "forte", "forge"].filter((s) =>
    programSlugs.includes(s)
  );
  const remaining = programSlugs.filter((s) => !orderedSlugs.includes(s));

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-ink">Program Features</h1>
        <p className="text-sm text-ink/50 mt-1">
          Turn features on or off per program or per individual track. Changes take effect immediately.
        </p>
      </div>

      <FeatureToggles
        programs={[...orderedSlugs, ...remaining]}
        programLabels={PROGRAM_LABELS}
        programFlagsMap={programFlagsMap}
        programTracks={programTracks}
        trackFlagsMap={trackFlagsMap}
      />
    </div>
  );
}
