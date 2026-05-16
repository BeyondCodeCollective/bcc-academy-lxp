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
import { InsightsDashboard } from "./insights-dashboard";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
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
    .sort((a, b) => a.title.localeCompare(b.title));

  const sections = await Promise.all(
    surveysWithData.map(async (survey) => {
      const responses = await getDashboardSurveyResponses(survey.id);
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
    <div className="min-h-[100dvh] bg-paper">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-5 md:max-w-5xl md:py-14">
        <header className="mb-10 flex items-start justify-between gap-6 md:mb-12">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
              Beyond Code Collective
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
              Insights
            </h1>
          </div>
          <Link
            href="/dashboard/admin"
            className="mt-2 shrink-0 text-xs text-neutral-500 transition-colors hover:text-neutral-900"
          >
            &larr; Back to admin
          </Link>
        </header>
        <InsightsDashboard
          sections={sections}
          programs={allPrograms}
          totalResponses={totalResponses}
        />
      </div>
    </div>
  );
}
