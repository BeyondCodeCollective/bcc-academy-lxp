"use server";

import { after } from "next/server";
import { savePublicSurveyResponse } from "@/app/survey/[id]/actions";
import { sendApplicationConfirmationEmail } from "@/lib/email";

export async function savePublicApplication(input: {
  email: string;
  answers: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const fullName =
    typeof input.answers.full_name === "string" ? input.answers.full_name.trim() : "";

  const result = await savePublicSurveyResponse({
    programSlug: "catalyst",
    surveyType: "home-for-summer-application",
    email: input.email,
    fullName,
    consentVersion: "home-for-summer-v1",
    responses: input.answers,
  });

  // Receipt for the applicant — sent AFTER the application is safely stored and
  // outside the response, so the send can never delay or fail a submission.
  // sendApplicationConfirmationEmail swallows its own errors for the same reason.
  if (result.ok) {
    after(() =>
      sendApplicationConfirmationEmail({
        to: input.email,
        firstName: fullName.split(/\s+/)[0] || undefined,
        programName: "Catalyst",
        applicationName: "Home for the Summer",
      }),
    );
  }

  return result;
}
