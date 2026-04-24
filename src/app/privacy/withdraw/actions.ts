"use server";

import { createServiceClient } from "@/lib/supabase/server";

// Self-service withdrawal for public survey respondents.
// No auth (respondents don't have accounts). We delete every row matching
// the provided email across all programs + survey types. To avoid email
// enumeration we always return the same "if this email had a response…"
// message regardless of whether anything was deleted.
//
// Future hardening (flagged in PR): send a confirmation email so only the
// inbox owner can trigger deletion. Skipped in v1 because the downside of
// an accidental/adversarial delete is bounded (the respondent can just
// re-take the survey), and the privacy benefit of a working self-service
// flow outweighs the friction of building transactional email now.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Result = { ok: true } | { ok: false; error: string };

export async function withdrawPublicSurveyResponses(input: {
  email: string;
}): Promise<Result> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Invalid email address." };

  const svc = createServiceClient();

  const { error } = await svc
    .from("public_survey_responses")
    .delete()
    .eq("email", email);

  if (error) {
    console.error("withdrawPublicSurveyResponses error:", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  return { ok: true };
}
