import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { canSwitchPrograms } from "@/lib/roles";
import { getDashboardSurveyStats, getDashboardSurveyResponses } from "../actions";
import type { BCCSurveyResponse } from "../actions";
import { PLATFORM_AUTH_SURVEYS, PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import { getAllPrograms } from "@/lib/programs";
import type { SurveyConfig } from "@/lib/programs/types";
import { getSurveySchema } from "@/lib/surveys/schemas";
import type { SurveyQuestion } from "@/components/survey-fields";
import { UnifiedSurveysDashboard } from "./unified-surveys-dashboard";

export const dynamic = "force-dynamic";

export default async function SurveysDashboardPage() {
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

  // Collect every survey config — platform-level plus program-specific —
  // then dedupe by id and keep only those with at least one response.
  const programSurveys: SurveyConfig[] = getAllPrograms().flatMap(
    (p) => p.surveys ?? [],
  );
  const allSurveysById = new Map<string, SurveyConfig>();
  for (const s of [
    ...Object.values(PLATFORM_AUTH_SURVEYS),
    ...Object.values(PLATFORM_PUBLIC_SURVEYS),
    ...programSurveys,
  ]) {
    if (!allSurveysById.has(s.id)) allSurveysById.set(s.id, s);
  }
  const surveysWithData = Array.from(allSurveysById.values())
    .filter((s) => stats.some((r) => r.survey_type === s.id))
    // Ordering: program-bound surveys first (they tend to be the most-trafficked
    // cohort/post surveys), then platform-level (workshop, learner intake) last.
    // Within each bucket, alphabetical-by-title is good enough.
    .sort((a, b) => a.title.localeCompare(b.title));

  // Fetch every survey's responses + schema in parallel. ~6 surveys, hundreds
  // of rows each — well within Supabase's limits.
  const sections = await Promise.all(
    surveysWithData.map(async (survey) => {
      const [responses] = await Promise.all([
        getDashboardSurveyResponses(survey.id),
      ]);
      const schema = getSurveySchema(survey.id);
      return {
        survey,
        schema,
        responses,
      } as {
        survey: SurveyConfig;
        schema: SurveyQuestion[] | null;
        responses: BCCSurveyResponse[];
      };
    }),
  );

  const allPrograms = getAllPrograms().map((p) => ({ slug: p.slug, name: p.name }));
  const totalResponses = sections.reduce((sum, s) => sum + s.responses.length, 0);

  return (
    <div className="min-h-[100dvh] bg-[#F7F4EE]">
      <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-5 py-12 md:py-16">
        <header className="flex items-start justify-between gap-6 mb-12 md:mb-16">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9B9388] mb-3">
              Beyond Code Collective
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold text-[#1F1B16] tracking-[-0.02em] leading-[0.95]">
              Survey Insights
            </h1>
          </div>
          <Link
            href="/dashboard/admin"
            className="text-[12px] text-[#6B6258] hover:text-[#1F1B16] transition-colors shrink-0 mt-2"
          >
            ← Back to admin
          </Link>
        </header>
        <UnifiedSurveysDashboard
          sections={sections}
          programs={allPrograms}
          totalResponses={totalResponses}
        />
      </div>
    </div>
  );
}
