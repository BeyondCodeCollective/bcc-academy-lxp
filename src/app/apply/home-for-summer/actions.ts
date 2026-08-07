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

/**
 * Applications are closed (cohort filled 2026-08-07), but the page still
 * captures interest: email + ZIP joins the newsletter so future cohorts of
 * this and similar programs have a warm list. Stored as a public survey
 * response for Insights, and subscribed to the newsletter audience.
 */
export async function saveInterestSignup(input: {
  email: string;
  zip: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const zip = input.zip.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!/^\d{5}(-\d{4})?$/.test(zip)) {
    return { ok: false, error: "Please enter a valid ZIP code." };
  }

  const result = await savePublicSurveyResponse({
    programSlug: "catalyst",
    surveyType: "program-interest",
    email,
    fullName: "",
    consentVersion: "program-interest-v1",
    responses: { email, zip, source: "home-for-summer-closed" },
  });

  if (result.ok) {
    after(async () => {
      const { subscribeToNewsletter } = await import("@/lib/mailchimp");
      await subscribeToNewsletter({ email, programSlug: "catalyst" });
    });
  }
  return result;
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
