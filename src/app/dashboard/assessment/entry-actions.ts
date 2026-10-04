// src/app/dashboard/assessment/entry-actions.ts
"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { VALID, type EntryFlowAnswers, type ExitConfidenceAnswers } from "@/lib/assessment/entry-flow";
import { isExitConfidencePending } from "@/lib/assessment/exit-confidence";

export async function hasCompletedEntryFlow(studentId: string): Promise<boolean> {
  const svc = createServiceClient();
  const [intake, confidence] = await Promise.all([
    svc.from("catalyst_intake").select("student_id").eq("student_id", studentId).maybeSingle(),
    svc.from("lpat_confidence").select("student_id").eq("student_id", studentId).eq("phase", "entry").maybeSingle(),
  ]);
  return !!intake.data && !!confidence.data;
}

export async function saveEntryFlow(answers: EntryFlowAnswers, programSlug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (
    !VALID.careerStage.includes(answers.careerStage) ||
    !VALID.digitalComfort.includes(answers.digitalComfort) ||
    !VALID.techExposure.includes(answers.techExposure) ||
    !VALID.confidence.includes(answers.confidenceTraining) ||
    !VALID.confidence.includes(answers.confidenceJob)
  ) {
    throw new Error("Invalid answer");
  }

  const svc = createServiceClient();

  // Two records, one key. ignoreDuplicates keeps a retry idempotent and means
  // the baseline can never be overwritten.
  const { error: intakeError } = await svc.from("catalyst_intake").upsert(
    {
      student_id: user.id,
      program_slug: programSlug,
      career_stage: answers.careerStage,
      digital_comfort: answers.digitalComfort,
      tech_exposure: answers.techExposure,
    },
    { onConflict: "student_id", ignoreDuplicates: true }
  );
  if (intakeError) throw new Error(intakeError.message);

  const { error: confidenceError } = await svc.from("lpat_confidence").upsert(
    {
      student_id: user.id,
      phase: "entry",
      training: answers.confidenceTraining,
      job: answers.confidenceJob,
    },
    { onConflict: "student_id,phase", ignoreDuplicates: true }
  );
  if (confidenceError) throw new Error(confidenceError.message);

  return { success: true };
}

export async function saveExitConfidence(answers: ExitConfidenceAnswers) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!VALID.confidence.includes(answers.confidenceTraining) || !VALID.confidence.includes(answers.confidenceJob)) {
    throw new Error("Invalid answer");
  }
  if (!(await isExitConfidencePending(user.id))) {
    throw new Error("Exit check-in is not available");
  }

  // phase 'exit' is its own row, so the entry baseline is never touched.
  // ignoreDuplicates keeps a retry idempotent.
  const svc = createServiceClient();
  const { error } = await svc.from("lpat_confidence").upsert(
    {
      student_id: user.id,
      phase: "exit",
      training: answers.confidenceTraining,
      job: answers.confidenceJob,
    },
    { onConflict: "student_id,phase", ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);

  return { success: true };
}
