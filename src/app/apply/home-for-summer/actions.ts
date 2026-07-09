"use server";

import { savePublicSurveyResponse } from "@/app/survey/[id]/actions";

export async function savePublicApplication(input: {
  email: string;
  answers: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const fullName =
    typeof input.answers.full_name === "string" ? input.answers.full_name.trim() : "";

  return savePublicSurveyResponse({
    programSlug: "catalyst",
    surveyType: "home-for-summer-application",
    email: input.email,
    fullName,
    consentVersion: "home-for-summer-v1",
    responses: input.answers,
  });
}
