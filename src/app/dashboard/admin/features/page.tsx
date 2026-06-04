import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgramBySlug, getAllPrograms } from "@/lib/programs";
import { FeatureToggles } from "./feature-toggles";

const KNOWN_PROGRAM_SLUGS = ["catalyst", "atg", "forte", "forge"];

export default async function FeaturesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();

  // Load program-level flags
  const { data: progRows } = await svc
    .from("program_features")
    .select("*")
    .in("program_slug", KNOWN_PROGRAM_SLUGS);

  // Build all track slugs across known programs (TS config + DB overrides)
  const allTrackSlugs: string[] = [];
  const programTracks: Record<string, { slug: string; name: string }[]> = {};

  for (const slug of KNOWN_PROGRAM_SLUGS) {
    const prog = getProgramBySlug(slug);
    const tracks = (prog?.tracks ?? []).map((t) => ({ slug: t.slug, name: t.name }));
    programTracks[slug] = tracks;
    allTrackSlugs.push(...tracks.map((t) => t.slug));
  }

  // Also load any DB-only tracks (track_overrides) not in TS config
  const { data: overrideTracks } = await svc
    .from("track_overrides")
    .select("track_slug, name")
    .is("archived_at", null);

  for (const row of overrideTracks ?? []) {
    const trackSlug = row.track_slug as string;
    if (!allTrackSlugs.includes(trackSlug)) {
      // Find which program this track belongs to by checking program configs
      for (const slug of KNOWN_PROGRAM_SLUGS) {
        const prog = getProgramBySlug(slug);
        if (prog?.tracks.some((t) => t.slug === trackSlug)) {
          programTracks[slug] = [
            ...(programTracks[slug] ?? []),
            { slug: trackSlug, name: (row.name as string) ?? trackSlug },
          ];
          allTrackSlugs.push(trackSlug);
          break;
        }
      }
      // If not matched to a known program, add to catalyst as fallback
      if (!allTrackSlugs.includes(trackSlug)) {
        programTracks["catalyst"] = [
          ...(programTracks["catalyst"] ?? []),
          { slug: trackSlug, name: (row.name as string) ?? trackSlug },
        ];
        allTrackSlugs.push(trackSlug);
      }
    }
  }

  // Load track-level flags
  const { data: trackRows } = allTrackSlugs.length > 0
    ? await svc
        .from("track_features")
        .select("track_slug, assessment_enabled")
        .in("track_slug", allTrackSlugs)
    : { data: [] };

  const trackFlagsMap: Record<string, boolean> = {};
  for (const row of trackRows ?? []) {
    trackFlagsMap[row.track_slug as string] = row.assessment_enabled as boolean;
  }

  const programFlagsMap: Record<string, boolean> = {};
  for (const row of progRows ?? []) {
    programFlagsMap[row.program_slug as string] = row.assessment_enabled as boolean;
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-ink">Program Features</h1>
        <p className="text-sm text-ink/50 mt-1">
          Turn features on or off per program or per individual track. Changes take effect immediately.
        </p>
      </div>

      <FeatureToggles
        programs={KNOWN_PROGRAM_SLUGS}
        programFlagsMap={programFlagsMap}
        programTracks={programTracks}
        trackFlagsMap={trackFlagsMap}
      />
    </div>
  );
}
