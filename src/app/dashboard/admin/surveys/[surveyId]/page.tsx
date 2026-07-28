import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseConfigured, createServiceClient } from "@/lib/supabase/server";
import { canViewInsights } from "@/lib/roles";
import { getDashboardSurveyResponses, getTrackSurveyResponses } from "../../actions";
import { getSurveySchema } from "@/lib/surveys/schemas";
import { PLATFORM_AUTH_SURVEYS, PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import { getEveryProgramConfig } from "@/lib/programs";
import type { SurveyConfig } from "@/lib/programs/types";
import { SurveyDashboard } from "./survey-dashboard";

export const dynamic = "force-dynamic";

function findSurveyConfig(surveyId: string): SurveyConfig | null {
  const platform = PLATFORM_AUTH_SURVEYS[surveyId] ?? PLATFORM_PUBLIC_SURVEYS[surveyId];
  if (platform) return platform;
  for (const p of getEveryProgramConfig()) {
    const s = (p.surveys ?? []).find((x) => x.id === surveyId);
    if (s) return s;
  }
  return null;
}

export default async function SurveyDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ surveyId: string }>;
  searchParams: Promise<{ returnTo?: string; returnLabel?: string; trackSlug?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const { surveyId } = await params;
  const { returnTo, returnLabel, trackSlug } = await searchParams;
  const backHref = returnTo ? decodeURIComponent(returnTo) : "/dashboard/admin/surveys";
  const backLabel = returnLabel ? `← ${decodeURIComponent(returnLabel)}` : "← All surveys";

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect("/");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", session.user.id)
    .single();
  // Admin and up: the responses themselves are scoped to the actor's program
  // server-side (resolveInsightsScope), so a program admin sees their own
  // program's answers and nobody else's.
  if (!canViewInsights(student?.role ?? "student")) redirect("/dashboard/admin");

  const survey = findSurveyConfig(surveyId);
  const schema = getSurveySchema(surveyId);
  if (!survey || !schema) notFound();

  const responses = trackSlug
    ? await getTrackSurveyResponses(surveyId, decodeURIComponent(trackSlug))
    : await getDashboardSurveyResponses(surveyId);
  const programs = getEveryProgramConfig().map((p) => ({ slug: p.slug, name: p.name }));

  return (
    <div className="min-h-[100dvh] bg-paper-tint-soft">
      <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-5 pt-12 pb-28 md:pt-16">
        <Link
          href={backHref}
          className="inline-flex text-xs text-ink-soft hover:text-ink transition-colors mb-8"
        >
          {backLabel}
        </Link>
        <SurveyDashboard
          surveyId={surveyId}
          surveyTitle={survey.title}
          schema={schema}
          responses={responses}
          programs={programs}
        />
      </div>
    </div>
  );
}
