import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { FeatureToggles } from "./feature-toggles";

const KNOWN_PROGRAMS = ["catalyst", "atg", "forte", "forge"];

export default async function FeaturesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();

  // Load current feature flags for all known programs
  const { data: rows } = await svc
    .from("program_features")
    .select("*")
    .in("program_slug", KNOWN_PROGRAMS);

  // Build a map, filling in defaults for any programs not yet in the table
  const featuresMap: Record<string, { assessment_enabled: boolean; pre_survey_id: string | null; post_survey_id: string | null; mid_survey_id: string | null }> = {};
  for (const slug of KNOWN_PROGRAMS) {
    const row = (rows ?? []).find((r) => r.program_slug === slug);
    featuresMap[slug] = {
      assessment_enabled: row?.assessment_enabled ?? false,
      pre_survey_id: row?.pre_survey_id ?? null,
      post_survey_id: row?.post_survey_id ?? null,
      mid_survey_id: row?.mid_survey_id ?? null,
    };
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-ink">Program Features</h1>
        <p className="text-sm text-ink/50 mt-1">
          Turn features on or off per program. Changes take effect immediately — no deploy needed.
        </p>
      </div>

      <FeatureToggles programs={KNOWN_PROGRAMS} featuresMap={featuresMap} />
    </div>
  );
}
