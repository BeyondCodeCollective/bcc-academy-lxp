import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server";
import { canSwitchPrograms } from "@/lib/roles";
import { getDashboardSurveyStats, getDashboardSurveyResponses } from "../../actions";
import { getSurveySchema, SHARED_DEMOGRAPHIC_IDS, DEMOGRAPHIC_ALIASES } from "@/lib/surveys/schemas";
import { PLATFORM_AUTH_SURVEYS, PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import { getAllPrograms } from "@/lib/programs";
import type { SurveyConfig } from "@/lib/programs/types";
import { AllSurveysView } from "./all-surveys-view";

export const dynamic = "force-dynamic";

function findSurveyConfig(surveyId: string): SurveyConfig | null {
  const platform = PLATFORM_AUTH_SURVEYS[surveyId] ?? PLATFORM_PUBLIC_SURVEYS[surveyId];
  if (platform) return platform;
  for (const p of getAllPrograms()) {
    const s = (p.surveys ?? []).find((x) => x.id === surveyId);
    if (s) return s;
  }
  return null;
}

export default async function AllSurveysPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect("/");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", session.user.id)
    .single();
  if (!canSwitchPrograms(student?.role ?? "student")) redirect("/dashboard/admin");

  const stats = await getDashboardSurveyStats();

  // Group totals per surveyId
  const byId = new Map<
    string,
    { surveyId: string; total: number; perProgram: { slug: string; name: string; count: number }[] }
  >();
  for (const s of stats) {
    const existing = byId.get(s.survey_type) ?? {
      surveyId: s.survey_type,
      total: 0,
      perProgram: [],
    };
    existing.total += s.count;
    const found = existing.perProgram.find((p) => p.slug === s.program_slug);
    if (found) found.count += s.count;
    else
      existing.perProgram.push({
        slug: s.program_slug,
        name: s.program_name,
        count: s.count,
      });
    byId.set(s.survey_type, existing);
  }

  // Pull all responses across all surveys (parallel) for the demographic rollup.
  // For 5 surveys with hundreds of responses, this is cheap.
  const surveyIds = Array.from(byId.keys());
  const allResponses = (
    await Promise.all(surveyIds.map((id) => getDashboardSurveyResponses(id)))
  ).flat();

  // Build demographic rollup. For each shared demographic id, count occurrences
  // across every response, normalizing aliased ids (mid_gender → gender).
  const demographicCounts: Record<string, Map<string, number>> = {};
  for (const id of SHARED_DEMOGRAPHIC_IDS) demographicCounts[id] = new Map();
  for (const r of allResponses) {
    for (const [key, val] of Object.entries(r.responses)) {
      const normalized = DEMOGRAPHIC_ALIASES[key] ?? key;
      if (!SHARED_DEMOGRAPHIC_IDS.includes(normalized)) continue;
      if (typeof val === "string" && val.length > 0) {
        const m = demographicCounts[normalized];
        m.set(val, (m.get(val) ?? 0) + 1);
      } else if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === "string") {
            const m = demographicCounts[normalized];
            m.set(item, (m.get(item) ?? 0) + 1);
          }
        }
      }
    }
  }

  const surveys = surveyIds
    .map((id) => {
      const config = findSurveyConfig(id);
      const schema = getSurveySchema(id);
      const data = byId.get(id)!;
      return {
        id,
        title: config?.title ?? id,
        total: data.total,
        perProgram: data.perProgram,
        hasSchema: !!schema,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Serialize Maps for client component
  const demographics = SHARED_DEMOGRAPHIC_IDS.map((id) => ({
    id,
    counts: Array.from(demographicCounts[id].entries())
      .map(([option, count]) => ({ option, count }))
      .sort((a, b) => b.count - a.count),
  })).filter((d) => d.counts.length > 0);

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl space-y-6 px-5 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#E54D2E] uppercase mb-1">
            Survey Insights
          </p>
          <h1 className="text-2xl font-bold text-neutral-900">All Surveys</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Cross-survey rollup. Click any survey for detailed visualizations.
          </p>
        </div>
        <Link
          href="/dashboard/admin/surveys"
          className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          ← Back to surveys
        </Link>
      </div>
      <AllSurveysView
        surveys={surveys}
        totalResponses={allResponses.length}
        demographics={demographics}
      />
    </div>
  );
}
