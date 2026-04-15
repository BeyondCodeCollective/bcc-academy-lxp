import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { SurveyWizard } from "@/components/survey-wizard";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: surveyId } = await params;
  const program = await getProgram();

  // Verify survey exists in program config
  const surveyConfig = program.surveys?.find((s) => s.id === surveyId);
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

    // If already completed, redirect back to dashboard
    if (data?.completed_at) redirect("/dashboard");

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
