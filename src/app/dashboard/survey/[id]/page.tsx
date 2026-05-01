import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { SurveyWizard, BCC_INTAKE_SURVEY_ID } from "@/components/survey-wizard";
import { SurveyComplete } from "./survey-complete";

const BCC_INTAKE_CONFIG = {
  id: BCC_INTAKE_SURVEY_ID,
  title: "BCC Learner Intake",
  description: "A few quick questions to help us know who we're serving.",
};

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: surveyId } = await params;
  const program = await getProgram();

  // BCC intake is platform-level — not in program.surveys — handle it directly.
  const surveyConfig =
    surveyId === BCC_INTAKE_SURVEY_ID
      ? BCC_INTAKE_CONFIG
      : program.surveys?.find((s) => s.id === surveyId);
  if (!surveyConfig) redirect("/dashboard");

  let existingResponses: Record<string, unknown> | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) redirect("/");

    // Check for existing partial/complete response
    const { data } = await supabase
      .from("survey_responses")
      .select("responses, completed_at")
      .eq("student_id", session.user.id)
      .eq("survey_type", surveyId)
      .maybeSingle();

    if (data?.completed_at) {
      const completedAt = new Date(data.completed_at).getTime();
      const justCompleted = Date.now() - completedAt < 60_000;
      if (!justCompleted) redirect("/dashboard");
      return (
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
          <SurveyComplete />
        </div>
      );
    }

    existingResponses = (data?.responses as Record<string, unknown>) ?? null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl py-4">
      <div className="mb-4 px-4 sm:px-5">
        <h1 className="text-2xl font-bold text-neutral-900">
          {surveyConfig.title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {surveyConfig.description}
        </p>
      </div>
      <SurveyWizard
        surveyId={surveyId}
        programSlug={program.slug}
        existingResponses={existingResponses}
      />
    </div>
  );
}
