"use client";

import { MASS_POST_PAGES } from "@/lib/surveys/schemas";
import { PublicSurveyWizard, type Page } from "./public-survey-wizard";

// MASS Fall 2026 — post-program survey, taken through the public link so the
// cohort needs no login. Questions live in schemas.ts (MASS_POST_PAGES).

export const CONSENT_VERSION = "mass-2026-v1";

const PAGES: Page[] = [
  { kind: "contact" },
  ...MASS_POST_PAGES.map((p): Page => ({ kind: "questions", ...p })),
];

export function PublicMassPost({ surveyId, programSlug }: { surveyId: string; programSlug: string }) {
  return (
    <PublicSurveyWizard
      surveyId={surveyId}
      programSlug={programSlug}
      pages={PAGES}
      consentVersion={CONSENT_VERSION}
      contactSubtitle="Use the same email you used for the pre-program survey so we can see your growth."
      successTitle="Thank you for being part of MASS."
      successBody="Your answers shape how we improve future cohorts. We are grateful you learned with us."
    />
  );
}
