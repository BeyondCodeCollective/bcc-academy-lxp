"use client";

import { type SurveyQuestion } from "@/components/survey-fields";
import { PublicSurveyWizard, type Page } from "./public-survey-wizard";

// CompTIA Security+ Midpoint Check-In — one short pulse taken in class at the
// halfway mark, so the second half can be adjusted while there's still time.
// Four questions, ~3 minutes.

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

export const CONSENT_VERSION = "security-midpoint-v1";

const CONSENT_LEAD =
  "This is a check-in, not a test. There's no grade attached and nothing here affects your standing in the program.";

const CONSENT_BULLETS = [
  "Your name stays with the BCC team. We share what we're hearing with your instructor as themes, not as a list of who said what.",
  "We read every response. If something needs fixing, we'd rather find out now than at the end.",
];

const CONSENT_FOOTER =
  "For more information, visit wearebcc.org/en/privacy. Your use of this platform is also governed by the BCC Terms of Use and Privacy Policy. Full platform-specific details at /privacy.";

const PAGES: Page[] = [
  // Page 0 — Consent
  {
    kind: "questions",
    title: "Halfway there",
    subtitle:
      "You're at the midpoint of Security+. Before we head into the back half, we want to hear how it's actually going for you.",
    questions: [
      {
        type: "consent",
        id: "consent_to_participate",
        label: "Consent",
        text: CONSENT_LEAD,
        bullets: CONSENT_BULLETS,
        footer: CONSENT_FOOTER,
        confirmLabel: "Got it. Let's do this.",
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 1 — Contact
  { kind: "contact" },

  // Page 2 — The check-in
  {
    kind: "questions",
    title: "How's it going?",
    subtitle: "Four questions. Say it plainly, we can take it.",
    questions: [
      {
        type: "text",
        id: "working_well",
        label: "What's working for you so far?",
        placeholder:
          "A topic that finally clicked, the labs, how Kobie runs class, the pace, your study group. Whatever you'd keep.",
        required: true,
      },
      {
        type: "text",
        id: "would_change",
        label: "What would you change if it were up to you?",
        placeholder:
          "Be straight with us. Nothing is too small, and there's still time to act on it.",
        required: false,
      },
      {
        type: "text",
        id: "most_helpful_next",
        label:
          "What's the one thing that would help you most between now and the exam?",
        placeholder:
          "More lab time, a review session on a specific domain, practice questions, someone to study with. Name the one thing.",
        required: true,
      },
      {
        type: "likert",
        id: "exam_confidence",
        label: "Right now, how are you feeling about the exam?",
        scale: LIKERT_1_5,
        scaleAnchors: {
          low: "1 — Not ready yet",
          high: "5 — I've got this",
        },
        statements: ["My confidence about passing the Security+ exam"],
        required: true,
      },
    ] as SurveyQuestion[],
  },
];

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicSecurityMidpoint({ surveyId, programSlug }: Props) {
  return (
    <PublicSurveyWizard
      surveyId={surveyId}
      programSlug={programSlug}
      pages={PAGES}
      consentVersion={CONSENT_VERSION}
      contactTitle="Who's checking in?"
      contactSubtitle="So we can follow up with you directly if you ask us to."
      successTitle="Thank you. Genuinely."
      successBody="We're reading these before the next class. See you in the back half."
    />
  );
}
