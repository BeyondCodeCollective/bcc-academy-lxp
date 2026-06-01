import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SurveyWizard } from "@/components/survey-wizard";
import { SECURITY_PLUS_APPLICATION_SURVEY_ID } from "@/lib/surveys/platform";

export const dynamic = "force-dynamic";

const SURVEY_ID = SECURITY_PLUS_APPLICATION_SURVEY_ID;

export default async function SecurityPlusApplicationPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/");

  const { data } = await supabase
    .from("survey_responses")
    .select("responses, completed_at")
    .eq("student_id", session.user.id)
    .eq("survey_type", SURVEY_ID)
    .maybeSingle();

  const existingResponses = (data?.responses as Record<string, unknown>) ?? null;

  if (data?.completed_at) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16">
        <div className="border border-rule bg-surface-elevated p-8 sm:p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-6">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-3">
            Application received.
          </h2>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto">
            We&apos;ll review every application and share decisions no later than one week after the submission deadline. Selected participants will be onboarded for the July start.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-2">
          Catalyst · Security+ Cohort
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Apply for CompTIA Security+
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600 max-w-[55ch]">
          This application is for Network+ graduates. It helps us understand where you&apos;re headed, what you need from a training program, and how Security+ fits into your career path.
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          Plan for 10–15 minutes. Be honest — we&apos;re not looking for polished, we&apos;re looking for a real picture of where you are and what you need.
        </p>
        <p className="mt-3 text-xs text-neutral-400">
          Decisions will be shared no later than one week after the submission deadline. July start.
        </p>
      </div>

      <SurveyWizard
        surveyId={SURVEY_ID}
        programSlug="catalyst"
        existingResponses={existingResponses}
        userId={session.user.id}
      />
    </div>
  );
}
