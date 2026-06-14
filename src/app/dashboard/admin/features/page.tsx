import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { FeatureToggles } from "./feature-toggles";
import { SurveyLinksSection } from "./survey-links-section";
import { getProgram } from "@/lib/programs/server";
import { PageHeader } from "@/components/page-header";

const PROGRAM_LABELS: Record<string, string> = {
  catalyst:  "Catalyst",
  atg:       "After the Game",
  forte:     "Upskill Bahamas",
  forge:     "Beyond Code Centers",
};

export default async function FeaturesPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!canSwitchPrograms(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const svc = createServiceClient();
  const program = await getProgram();

  const { data: programs } = await svc
    .from("programs")
    .select("id, slug, name")
    .order("slug");

  const programSlugs = (programs ?? []).map((p) => p.slug as string);

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

  const { data: progFlagRows } = await svc
    .from("program_features")
    .select("program_slug, assessment_enabled")
    .in("program_slug", programSlugs);

  const programFlagsMap: Record<string, boolean> = {};
  for (const row of progFlagRows ?? []) {
    programFlagsMap[row.program_slug as string] = row.assessment_enabled as boolean;
  }

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

  // Unviewed assessment count for the badge
  const { count: unviewedAssessments } = await svc
    .from("assessment_results")
    .select("*", { count: "exact", head: true })
    .is("facilitator_viewed_at", null);

  const orderedSlugs = ["catalyst", "atg", "forte", "forge"].filter((s) =>
    programSlugs.includes(s)
  );
  const remaining = programSlugs.filter((s) => !orderedSlugs.includes(s));

  // Survey configs for the current program
  const surveyConfigs = (program.surveys ?? []).map((s) => ({ id: s.id, title: s.title }));

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 space-y-12">
      <PageHeader
        title="Tools"
        subtitle="Links, settings, and features for managing the platform."
      />

      {/* Survey & Form Links */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Survey &amp; form links
        </h2>
        <SurveyLinksSection surveyConfigs={surveyConfigs} />
      </section>

      {/* Pathway Assessments */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Pathway assessments
        </h2>
        <div className="divide-y divide-rule overflow-hidden panel">
          <a
            href="/dashboard/admin/assessments"
            className="group flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-paper-tint-soft transition-colors"
          >
            <div>
              <p className="text-[14px] font-semibold text-ink">Learner pathway profiles</p>
              <p className="text-[12px] text-ink-faint">View and review submitted assessments</p>
            </div>
            <span className="flex items-center gap-2 shrink-0">
              {(unviewedAssessments ?? 0) > 0 && (
                <span className="bg-accent px-2 py-0.5 text-xs font-semibold text-white">
                  {unviewedAssessments} new
                </span>
              )}
              <span className="text-ink-faint group-hover:text-ink-soft transition-colors">→</span>
            </span>
          </a>
        </div>

        <div className="mt-2">
          <FeatureToggles
            programs={[...orderedSlugs, ...remaining]}
            programLabels={PROGRAM_LABELS}
            programFlagsMap={programFlagsMap}
            programTracks={programTracks}
            trackFlagsMap={trackFlagsMap}
          />
        </div>
      </section>
    </div>
  );
}
