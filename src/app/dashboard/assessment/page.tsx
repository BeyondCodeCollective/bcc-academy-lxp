import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { isAssessmentEnabledForLearner } from "@/lib/assessment/features";
import { AssessmentWizard } from "./assessment-wizard";
import { getAssessmentProgress } from "./actions";

export default async function AssessmentPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const svc = createServiceClient();

  // Resolve enrolled track slugs for the current user
  const { data: enrollmentRows } = await svc
    .from("student_tracks")
    .select("track_slug")
    .eq("student_id", ctx.userId);
  const enrolledTrackSlugs = (enrollmentRows ?? []).map((r) => r.track_slug as string);

  // Feature gate — redirect to dashboard if assessment isn't on for this learner
  const program = await getProgram();
  const enabled = await isAssessmentEnabledForLearner(program.slug, enrolledTrackSlugs);
  if (!enabled) redirect("/dashboard");

  // Already completed → go to results
  const { data: existing } = await svc
    .from("assessment_results")
    .select("id")
    .eq("student_id", ctx.userId)
    .maybeSingle();
  if (existing) redirect("/dashboard/assessment/results");

  // Resume in-progress if any
  const progress = await getAssessmentProgress();

  return (
    <div className="min-h-screen bg-paper">
      <AssessmentWizard
        initialModule={progress?.current_module ?? 0}
        initialResponses={(progress?.responses_so_far as Record<string, number | string>) ?? {}}
        programSlug={program.slug}
      />
    </div>
  );
}
