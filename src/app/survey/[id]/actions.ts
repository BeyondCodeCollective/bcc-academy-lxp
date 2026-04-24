"use server";

import { createServiceClient } from "@/lib/supabase/server";

// Public (unauthenticated) survey submission.
// Writes to public_survey_responses; uniqueness on (program_id, survey_type,
// email) means a second submission from the same email replaces the first.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP3_RE = /^\d{3}$/;

type Result = { ok: true } | { ok: false; error: string };

export async function savePublicSurveyResponse(input: {
  programSlug: string;
  surveyType: string;
  email: string;
  fullName: string;
  consentVersion: string;
  responses: Record<string, unknown>;
}): Promise<Result> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  if (!EMAIL_RE.test(email)) return { ok: false, error: "Invalid email address." };
  if (!fullName) return { ok: false, error: "Full name is required." };
  if (!input.surveyType) return { ok: false, error: "Missing survey type." };
  if (!input.programSlug) return { ok: false, error: "Missing program." };
  if (!input.consentVersion) return { ok: false, error: "Missing consent version." };

  // Defense in depth: enforce that we never store more than 3 digits of ZIP
  // even if a client somehow sends a full one.
  const scrubbedResponses = { ...input.responses };
  const rawZip = scrubbedResponses.zip_code;
  if (typeof rawZip === "string") {
    const digits = rawZip.replace(/\D/g, "").slice(0, 3);
    if (!ZIP3_RE.test(digits)) {
      return { ok: false, error: "ZIP must be 3 digits." };
    }
    scrubbedResponses.zip_code = digits;
  }

  const svc = createServiceClient();

  const { data: programRow, error: programErr } = await svc
    .from("programs")
    .select("id")
    .eq("slug", input.programSlug)
    .single();

  if (programErr || !programRow?.id) {
    return { ok: false, error: "Program not found." };
  }

  const nowIso = new Date().toISOString();

  const { error: upsertErr } = await svc
    .from("public_survey_responses")
    .upsert(
      {
        program_id: programRow.id,
        survey_type: input.surveyType,
        email,
        full_name: fullName,
        responses: scrubbedResponses,
        consent_version: input.consentVersion,
        consent_at: nowIso,
        completed_at: nowIso,
        updated_at: nowIso,
        withdrawn_at: null,
      },
      { onConflict: "program_id,survey_type,email" },
    );

  if (upsertErr) {
    // Log only the error code/message — never the submitted PII.
    console.error("public_survey_responses upsert failed:", {
      code: upsertErr.code,
      message: upsertErr.message,
    });
    return { ok: false, error: "Could not save your response. Please try again." };
  }

  return { ok: true };
}
