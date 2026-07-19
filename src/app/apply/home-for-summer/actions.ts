"use server";

import { after } from "next/server";
import { savePublicSurveyResponse } from "@/app/survey/[id]/actions";
import {
  sendApplicationConfirmationEmail,
  sendApplicationNotification,
} from "@/lib/email";

const APPLICATION_NAME = "Home for the Summer";

/** Reads a plain string answer, or undefined when absent/blank. */
function answer(answers: Record<string, unknown>, key: string): string | undefined {
  const v = answers[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

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

  // Both emails go out AFTER the application is safely stored and outside the
  // response, so neither can delay or fail a submission. Both helpers also
  // swallow their own errors for the same reason.
  if (result.ok) {
    after(async () => {
      // Receipt for the applicant.
      await sendApplicationConfirmationEmail({
        to: input.email,
        firstName: fullName.split(/\s+/)[0] || undefined,
        programName: "Catalyst",
        applicationName: APPLICATION_NAME,
      });
      // Heads-up for the team, so applications surface without anyone
      // remembering to open admin → Insights.
      await sendApplicationNotification({
        name: fullName,
        email: input.email,
        applicationName: APPLICATION_NAME,
        details: {
          "Student status": answer(input.answers, "student_status"),
          University: answer(input.answers, "university"),
          Major: answer(input.answers, "major"),
          State: answer(input.answers, "state"),
          "Available for all sessions": answer(input.answers, "available_all_sessions"),
          "Heard about us": answer(input.answers, "heard_about_program"),
        },
      });
    });
  }

  return result;
}
