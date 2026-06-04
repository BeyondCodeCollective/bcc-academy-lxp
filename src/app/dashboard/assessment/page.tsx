import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { AssessmentWizard } from "./assessment-wizard";
import { getAssessmentProgress } from "./actions";

export default async function AssessmentPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const svc = createServiceClient();

  // Already completed → go to results
  const { data: existing } = await svc
    .from("assessment_results")
    .select("id")
    .eq("student_id", ctx.userId)
    .maybeSingle();
  if (existing) redirect("/dashboard/assessment/results");

  // Resume in-progress if any
  const progress = await getAssessmentProgress();
  const programSlug = "catalyst";

  return (
    <div className="min-h-screen bg-paper">
      <AssessmentWizard
        initialModule={progress?.current_module ?? 1}
        initialResponses={(progress?.responses_so_far as Record<string, number | string>) ?? {}}
        programSlug={programSlug}
      />
    </div>
  );
}
