"use server";

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { sendSignupNotification } from "@/lib/email";
import { subscribeToNewsletter } from "@/lib/mailchimp";
import { rateLimit } from "@/lib/rate-limit";

// Public (unauthenticated) survey submission.
// Writes to public_survey_responses; uniqueness on (program_id, survey_type,
// email) means a second submission from the same email replaces the first.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP5_RE = /^\d{5}$/;

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
  // Slug-shaped only — free-form values would let a script invent arbitrary
  // survey buckets that then surface in Survey Insights.
  if (!/^[a-z0-9-]{1,64}$/.test(input.surveyType)) {
    return { ok: false, error: "Missing survey type." };
  }
  // These rows feed funder-facing reports; keep a script from flooding the
  // table or mailbombing the learn-more notification path. The cap is per IP
  // per 10 minutes and generous enough for a whole classroom on venue wifi.
  if (JSON.stringify(input.responses).length > 20_000) {
    return { ok: false, error: "Response too large." };
  }
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";
  const rl = rateLimit({ key: ip, scope: "public-survey", max: 30, windowMs: 10 * 60_000 });
  if (!rl.ok) {
    return { ok: false, error: "Too many submissions — please try again in a few minutes." };
  }

  // Normalize ZIP to exactly 5 digits. Strip anything non-numeric a user
  // might paste, take the first 5, and reject if what's left isn't 5 digits.
  const scrubbedResponses = { ...input.responses };
  const rawZip = scrubbedResponses.zip_code;
  if (typeof rawZip === "string") {
    const digits = rawZip.replace(/\D/g, "").slice(0, 5);
    if (!ZIP5_RE.test(digits)) {
      return { ok: false, error: "ZIP must be 5 digits." };
    }
    scrubbedResponses.zip_code = digits;
  }

  const svc = createServiceClient();

  // bccacademy.io (apex) resolves to the "marketing" program in code, but
  // marketing has no row in the programs DB table — only atg/catalyst/forge/forte
  // do. Public surveys taken on the apex (e.g. the pre-survey at an event)
  // are recorded against Catalyst, the umbrella program that owns the
  // pre-survey config. Anyone hitting /survey/<id> from the apex should be
  // able to submit without needing to be "in a program."
  const lookupSlug =
    input.programSlug === "marketing" ? "catalyst" : input.programSlug;

  const { data: programRow, error: programErr } = await svc
    .from("programs")
    .select("id, name")
    .eq("slug", lookupSlug)
    .single<{ id: string; name: string | null }>();

  if (programErr || !programRow?.id) {
    return { ok: false, error: "Program not found." };
  }

  // "Learn More" homepage signups are newsletter leads, not survey responses.
  // Route them to Mailchimp (+ a staff heads-up) and do NOT write them to
  // public_survey_responses, so they live only in Mailchimp and never surface
  // in the portal / Survey Insights.
  if (input.surveyType === "learn-more") {
    const [firstName, ...rest] = fullName.split(/\s+/);
    await subscribeToNewsletter({
      email,
      firstName: firstName || undefined,
      lastName: rest.join(" ") || undefined,
      programSlug: lookupSlug,
    });
    await sendSignupNotification({
      name: fullName,
      email,
      programName: programRow.name ?? lookupSlug,
      source: typeof scrubbedResponses.source === "string" ? scrubbedResponses.source : undefined,
    });
    return { ok: true };
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
