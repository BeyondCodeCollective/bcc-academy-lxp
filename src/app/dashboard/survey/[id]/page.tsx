import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { SurveyWizard } from "@/components/survey-wizard";
import { PLATFORM_AUTH_SURVEYS } from "@/lib/surveys/platform";
import { SurveyComplete } from "./survey-complete";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: surveyId } = await params;
  const program = await getProgram();

  const surveyConfig =
    PLATFORM_AUTH_SURVEYS[surveyId] ??
    program.surveys?.find((s) => s.id === surveyId);
  if (!surveyConfig) redirect("/dashboard");

  let existingResponses: Record<string, unknown> | null = null;
  let userId: string | undefined;
  let initialAnswers: Record<string, unknown> | undefined;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) redirect("/");
    userId = session.user.id;

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

    // Pre-fill the Security+ pre-survey from the account + a prior intake so
    // learners don't re-type what we already know. Only seed when they haven't
    // started this survey yet; every field stays fully editable.
    if (surveyId === "comptia-security-pre" && !existingResponses) {
      const seed: Record<string, unknown> = {};
      const { data: student } = await supabase
        .from("students")
        .select("first_name, last_name, email")
        .eq("id", session.user.id)
        .maybeSingle();
      if (student) {
        const name = [student.first_name, student.last_name].filter(Boolean).join(" ").trim();
        if (name) seed.full_name = name;
        if (student.email) seed.email = student.email;
      }
      // Employment: reuse the intake answer, keeping only options this survey
      // also offers (the intake adds a couple we don't — drop those rather than
      // force a bad mapping).
      const { data: intake } = await supabase
        .from("survey_responses")
        .select("responses")
        .eq("student_id", session.user.id)
        .eq("survey_type", "bcc-learner-intake")
        .not("completed_at", "is", null)
        .maybeSingle();
      const intakeEmp = (intake?.responses as Record<string, unknown> | null)?.employment_status;
      if (Array.isArray(intakeEmp)) {
        const allowed = new Set([
          "Employed full-time", "Employed part-time", "Unemployed",
          "Looking for work", "Student", "Other",
        ]);
        const mapped = intakeEmp.filter((v): v is string => typeof v === "string" && allowed.has(v));
        if (mapped.length) seed.employment_status = mapped;
      }
      if (Object.keys(seed).length) initialAnswers = seed;
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl py-4">
      <div className="mb-4 px-4 sm:px-5">
        <h1 className="text-3xl font-bold text-ink tracking-tight">
          {surveyConfig.title}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {surveyConfig.description}
        </p>
      </div>
      <SurveyWizard
        surveyId={surveyId}
        programSlug={program.slug}
        existingResponses={existingResponses}
        userId={userId}
        initialAnswers={initialAnswers}
      />
    </div>
  );
}
