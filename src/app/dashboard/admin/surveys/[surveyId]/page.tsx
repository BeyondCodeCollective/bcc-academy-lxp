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
  searchParams,
}: {
  params: Promise<{ surveyId: string }>;
  searchParams: Promise<{ returnTo?: string; returnLabel?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const { surveyId } = await params;
  const { returnTo, returnLabel } = await searchParams;
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
  if (!canSwitchPrograms(student?.role ?? "student")) redirect("/dashboard/admin");

  const survey = findSurveyConfig(surveyId);
  const schema = getSurveySchema(surveyId);
  if (!survey || !schema) notFound();

  const responses = await getDashboardSurveyResponses(surveyId);
  const programs = getAllPrograms().map((p) => ({ slug: p.slug, name: p.name }));

  return (
    <div className="min-h-[100dvh] bg-[#F7F4EE]">
      <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-5 py-12 md:py-16">
        <Link
          href={backHref}
          className="inline-flex text-[12px] text-[#6B6258] hover:text-[#1F1B16] transition-colors mb-8"
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
