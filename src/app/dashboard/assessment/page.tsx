import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { isAssessmentEnabledForLearner } from "@/lib/assessment/features";
import { AssessmentWizard } from "./assessment-wizard";
import { getAssessmentProgress } from "./actions";
import { EntryFlow } from "./entry-flow";
import { hasCompletedEntryFlow } from "./entry-actions";

export default async function AssessmentPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const svc = createServiceClient();

  const hostProgram = await getProgram();

  // The browsing host is not the learner's program: the apex always resolves to
  // marketing, which has no tracks, so keying on it bounced enrolled learners.
  // Resolve the program from their enrollments instead, and prefer the host
  // program when they are enrolled in it so a multi-program learner stays put.
  const { data: enrollmentRows } = await svc
    .from("student_tracks")
    .select("track_slug, program_id")
    .eq("student_id", ctx.userId);
  const enrollments = (enrollmentRows ?? []) as { track_slug: string; program_id: string | null }[];
  const programIds = [...new Set(enrollments.map((r) => r.program_id).filter((id): id is string => !!id))];
  const { data: programRows } = programIds.length
    ? await svc.from("programs").select("id, slug").in("id", programIds)
    : { data: [] as { id: string; slug: string }[] };
  const slugById = new Map((programRows ?? []).map((r) => [r.id as string, r.slug as string]));
  const tracksByProgram = new Map<string, string[]>();
  for (const r of enrollments) {
    const slug = r.program_id ? slugById.get(r.program_id) : undefined;
    if (slug) tracksByProgram.set(slug, [...(tracksByProgram.get(slug) ?? []), r.track_slug]);
  }
  const candidates = [...tracksByProgram.keys()].sort((x) => (x === hostProgram.slug ? -1 : 0));
  let programSlug = hostProgram.slug;
  let enabled = false;
  for (const slug of candidates) {
    if (await isAssessmentEnabledForLearner(slug, tracksByProgram.get(slug) ?? [])) {
      programSlug = slug;
      enabled = true;
      break;
    }
  }
  // Feature gate: redirect to dashboard if assessment isn't on for this learner
  if (!enabled) redirect("/dashboard");

  // Already completed → go to results
  const { data: existing } = await svc
    .from("assessment_results")
    .select("id")
    .eq("student_id", ctx.userId)
    .maybeSingle();
  if (existing) redirect("/dashboard/assessment/results");

  // Entry flow (intake + confidence baseline) comes before the assessment
  if (!(await hasCompletedEntryFlow(ctx.userId))) {
    return (
      <div className="min-h-screen bg-paper">
        <EntryFlow programSlug={programSlug} />
      </div>
    );
  }

  // Resume in-progress if any
  const progress = await getAssessmentProgress();

  return (
    <div className="min-h-screen bg-paper">
      <AssessmentWizard
        initialModule={progress?.current_module ?? 0}
        initialResponses={(progress?.responses_so_far as Record<string, number | string>) ?? {}}
        programSlug={programSlug}
      />
    </div>
  );
}
