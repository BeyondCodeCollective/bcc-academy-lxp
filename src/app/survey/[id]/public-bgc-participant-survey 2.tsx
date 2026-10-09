"use client";

import {
  BGC_PARTICIPANT_2026_ABOUT,
  BGC_PARTICIPANT_2026_EXPERIENCE,
  BGC_PARTICIPANT_2026_THOUGHTS,
} from "@/lib/surveys/schemas";
import { PublicSurveyWizard, type Page } from "./public-survey-wizard";

// Black Girls Code 2026 Participant Survey.
//
// No contact page: respondents are 7–18 and the survey is anonymous (see the
// `anonymous` flag on its config — the save action fills the identity in).

export const CONSENT_VERSION = "bgc-participant-2026-v1";

const PAGES: Page[] = [
  { kind: "questions", title: "About you", questions: BGC_PARTICIPANT_2026_ABOUT },
  {
    kind: "questions",
    title: "Your program",
    subtitle: "There are no right or wrong answers.",
    questions: BGC_PARTICIPANT_2026_EXPERIENCE,
  },
  { kind: "questions", title: "Anything else?", questions: BGC_PARTICIPANT_2026_THOUGHTS },
];

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicBgcParticipantSurvey({ surveyId, programSlug }: Props) {
  return (
    <PublicSurveyWizard
      surveyId={surveyId}
      programSlug={programSlug}
      pages={PAGES}
      consentVersion={CONSENT_VERSION}
      successTitle="Thank you!"
      successBody="Your answers help us make Black Girls Code programs even better."
    />
  );
}
