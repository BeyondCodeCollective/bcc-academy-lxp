"use client";

import { type SurveyQuestion } from "@/components/survey-fields";
import { PublicSurveyWizard, type Page } from "./public-survey-wizard";

// Field Ready Lab (a Catalyst Lab): one-page session feedback, given at the
// end of the session. Public, no login; the contact page makes name and email
// required.

const SCALE = (low: string, high: string) => [`1 (${low})`, "2", "3", "4", `5 (${high})`];

export const CONSENT_VERSION = "beyond-the-music-v1";

const PAGES: Page[] = [
  { kind: "contact" },
  {
    kind: "questions",
    title: "Today's session",
    questions: [
      {
        type: "radio",
        id: "btm_session_value",
        label: "How valuable was today's session for you?",
        options: SCALE("Not at all valuable", "Extremely valuable"),
        required: true,
      },
      {
        type: "radio",
        id: "btm_apply_30_days",
        label: "How likely are you to apply something from this session in the next 30 days?",
        options: SCALE("Not at all likely", "Extremely likely"),
        required: true,
      },
      {
        type: "radio",
        id: "btm_attend_future",
        label: "How likely are you to attend future Beyond Code Collective programming?",
        options: SCALE("Not at all likely", "Extremely likely"),
        required: true,
      },
      {
        type: "text",
        id: "btm_keep_change_add",
        label: "What's one thing we should keep, change, or add for the next Catalyst Lab?",
        required: false,
      },
    ] as SurveyQuestion[],
  },
];

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicBeyondTheMusic({ surveyId, programSlug }: Props) {
  return (
    <PublicSurveyWizard
      surveyId={surveyId}
      programSlug={programSlug}
      pages={PAGES}
      consentVersion={CONSENT_VERSION}
      successTitle="Thank you!"
      successBody="Your feedback shapes the next Catalyst Lab."
    />
  );
}
