"use server";

import { after } from "next/server";
import { savePublicSurveyResponse } from "@/app/survey/[id]/actions";
import { sendApplicationNotification } from "@/lib/email";
import { SBFT_APPLICATION_SURVEY_ID } from "@/lib/surveys/platform";

/** Reads a plain string answer, or undefined when absent/blank. */
function answer(answers: Record<string, unknown>, key: string): string | undefined {
  const v = answers[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

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

  const result = await savePublicSurveyResponse({
    programSlug: "bgc",
    surveyType: SBFT_APPLICATION_SURVEY_ID,
    email: input.email,
    fullName,
    consentVersion: "sbft-v1",
    responses: input.answers,
  });

  if (result.ok) {
    // Heads-up for the program owner, so applications surface without anyone
    // remembering to open admin → Insights.
    after(async () => {
      await sendApplicationNotification({
        to: "richard@wearebgc.org",
        name: fullName,
        email: input.email,
        applicationName: "She's Built for This",
        details: {
          Grade: answer(input.answers, "grade"),
          "Parent/guardian": answer(input.answers, "parent_full_name"),
          "Parent email": answer(input.answers, "parent_email"),
        },
      });
    });
  }

  return result;
}
