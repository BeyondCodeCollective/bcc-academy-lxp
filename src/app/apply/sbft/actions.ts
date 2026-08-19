"use server";

import { savePublicSurveyResponse } from "@/app/survey/[id]/actions";
import { SBFT_APPLICATION_SURVEY_ID } from "@/lib/surveys/platform";

export async function savePublicApplication(input: {
  email: string;
  answers: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // The wizard collects the student's name in two fields; the shared response
  // row wants one, so join them here rather than asking for a third.
  const first =
    typeof input.answers.student_first_name === "string"
      ? input.answers.student_first_name.trim()
      : "";
  const last =
    typeof input.answers.student_last_name === "string"
      ? input.answers.student_last_name.trim()
      : "";
  const fullName = [first, last].filter(Boolean).join(" ");

  return savePublicSurveyResponse({
    programSlug: "bgc",
    surveyType: SBFT_APPLICATION_SURVEY_ID,
    email: input.email,
    fullName,
    consentVersion: "sbft-v1",
    responses: input.answers,
  });
}
