import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server";
import { canSwitchPrograms } from "@/lib/roles";
import { getDashboardSurveyResponses } from "../../actions";
import { getSurveySchema } from "@/lib/surveys/schemas";
import { PLATFORM_AUTH_SURVEYS, PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import { getAllPrograms } from "@/lib/programs";
import type { SurveyConfig } from "@/lib/programs/types";
import { SurveyDashboard } from "./survey-dashboard";

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

export default async function SurveyDashboardPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const { surveyId } = await params;

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

  const survey = findSurveyConfig(surveyId);
  const schema = getSurveySchema(surveyId);
  if (!survey || !schema) notFound();

  const responses = await getDashboardSurveyResponses(surveyId);
  const programs = getAllPrograms().map((p) => ({ slug: p.slug, name: p.name }));

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl space-y-6 px-5 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-[#E54D2E] uppercase mb-1">
            Survey Insights
          </p>
          <h1 className="text-2xl font-bold text-neutral-900 truncate">{survey.title}</h1>
        </div>
        <Link
          href="/dashboard/admin/surveys"
          className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors shrink-0"
        >
          ← All surveys
        </Link>
      </div>
      <SurveyDashboard
        surveyId={surveyId}
        surveyTitle={survey.title}
        schema={schema}
        responses={responses}
        programs={programs}
      />
    </div>
  );
}
