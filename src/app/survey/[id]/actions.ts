"use server";

import { createServiceClient } from "@/lib/supabase/server";

// Public (unauthenticated) survey submission.
// Writes to public_survey_responses; uniqueness on (program_id, survey_type,
// email) means a second submission from the same email replaces the first.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Result = { ok: true } | { ok: false; error: string };

export async function savePublicSurveyResponse(input: {
  programSlug: string;
  surveyType: string;
  email: string;
  fullName: string;
  responses: Record<string, unknown>;
}): Promise<Result> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  if (!EMAIL_RE.test(email)) return { ok: false, error: "Invalid email address." };
  if (!fullName) return { ok: false, error: "Full name is required." };
  if (!input.surveyType) return { ok: false, error: "Missing survey type." };
  if (!input.programSlug) return { ok: false, error: "Missing program." };

  const svc = createServiceClient();

  const { data: programRow, error: programErr } = await svc
    .from("programs")
    .select("id")
    .eq("slug", input.programSlug)
    .single();

  if (programErr || !programRow?.id) {
    return { ok: false, error: "Program not found." };
  }

  const { error: upsertErr } = await svc
    .from("public_survey_responses")
    .upsert(
      {
        program_id: programRow.id,
        survey_type: input.surveyType,
        email,
        full_name: fullName,
        responses: input.responses,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "program_id,survey_type,email" },
    );

  if (upsertErr) {
    console.error("public_survey_responses upsert failed:", upsertErr);
    return { ok: false, error: "Could not save your response. Please try again." };
  }

  return { ok: true };
}
