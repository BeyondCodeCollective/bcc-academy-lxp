"use client";

import { useState } from "react";
import { type SurveyQuestion } from "@/components/survey-fields";
import {
  PublicSurveyWizard,
  INPUT_CLASS,
  type Page,
  type ContactPageContext,
} from "./public-survey-wizard";
import {
  WORKSHOP_NAMES,
  WORKSHOP_LOCATIONS as WORKSHOP_LOCATION_OPTIONS,
} from "@/lib/surveys/schemas";

// BCC Workshop Survey — post-workshop feedback for standalone workshops
// (1–8 hours). Takes ~3–5 minutes. Mirrors the content spec in
// .context/attachments/BCC Workshop Survey.pdf

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

export const CONSENT_VERSION = "workshop-v1";

const CONSENT_LEAD =
  "Your answers are private. They are only used to help us improve our programs.";

const CONSENT_BULLETS = [
  "We may share results with our partners and funders, but your name will never be attached to your answers.",
  "You can email info@beyondcodecollective.org anytime to see, change, or delete your answers.",
];

const CONSENT_FOOTER =
  "For more information, visit wearebcc.org/en/privacy. Your use of this platform is also governed by the BCC Terms of Use and Privacy Policy. Full platform-specific details at /privacy.";

const PAGES: Page[] = [
  // Page 0 — Consent
  {
    kind: "questions",
    title: "Before we begin",
    subtitle:
      "Thanks for being here today! Before you go, take a few minutes to share your thoughts. Your honest answers help us make our programs better for everyone.",
    questions: [
      {
        type: "consent",
        id: "consent_to_participate",
        label: "Consent",
        text: CONSENT_LEAD,
        bullets: CONSENT_BULLETS,
        footer: CONSENT_FOOTER,
        confirmLabel: "Yes, I want to take this survey.",
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 1 — Contact + Workshop Details
  { kind: "contact" },

  // Page 2 — Tell Us About Today
  {
    kind: "questions",
    title: "Tell Us About Today",
    subtitle:
      "For each statement below, please rate yourself. Scale: 1 = Not at all · 5 = Very much.",
    questions: [
      {
        type: "likert",
        id: "learning_outcomes",
        label: "Rate yourself on the following",
        scale: LIKERT_1_5,
        scaleAnchors: { low: "1 — Not at all", high: "5 — Very much" },
        statements: [
          "I understand the main ideas from today.",
          "I feel ready to use what I learned.",
          "Learning about this topic will help me grow personally and professionally.",
        ],
        required: true,
      },
      {
        type: "text",
        id: "best_part",
        label: "What was the best part of today's workshop?",
        placeholder: "Tell us what stood out…",
        required: true,
      },
      {
        type: "text",
        id: "still_unsure",
        label:
          "Is there anything from today that you're still not sure about?",
        placeholder:
          "Example: \"I'm still not sure how to use AI workflow tools on my own.\" Leave blank if everything felt clear.",
        required: false,
      },
      {
        type: "likert",
        id: "workshop_rating",
        label: "How would you rate today's workshop overall?",
        scale: LIKERT_1_5,
        scaleAnchors: { low: "1 — Not useful", high: "5 — Very useful" },
        statements: ["Overall workshop rating"],
        required: true,
      },
    ] as SurveyQuestion[],
  },

  // Page 3 — What's Next for You
  {
    kind: "questions",
    title: "What's Next for You",
    questions: [
      {
        type: "text",
        id: "plan_to_do",
        label:
          "What is one thing you plan to do because of this workshop?",
        placeholder:
          "Try to be as specific as you can. Example: \"I'm going to try building a simple website this weekend.\"",
        required: true,
      },
      {
        type: "multi-select",
        id: "want_next",
        label:
          "What would you want to learn or do next with Beyond Code Collective? Select all that apply.",
        options: [
          "Another workshop on a related topic",
          "A longer multi-week program",
          "1:1 coaching",
          "Help connecting to others learning the same thing",
          "Just stay in touch about future opportunities",
          "Not sure yet — keep me posted",
          "Other",
        ],
        required: true,
      },
      {
        type: "likert",
        id: "recommend_bcc",
        label:
          "How likely are you to recommend Beyond Code Collective?",
        scale: LIKERT_1_5,
        scaleAnchors: {
          low: "1 — Not likely at all",
          high: "5 — I'd definitely recommend it",
        },
        statements: ["Likelihood to recommend"],
        required: true,
      },
      {
        type: "text",
        id: "anything_else",
        label: "Anything else you want to share? (Optional)",
        placeholder: "Any other thoughts, questions, or ideas?",
        required: false,
      },
    ] as SurveyQuestion[],
  },
];

// ---------------------------------------------------------------------------
// Workshop-specific contact page (name + email + workshop details)
// ---------------------------------------------------------------------------

function WorkshopContactPage(
  ctx: ContactPageContext & {
    setExtraValid: (valid: boolean) => void;
    setExtraResponses: (r: Record<string, string>) => void;
  },
) {
  const [workshopName, setWorkshopName] = useState("");
  const [workshopLocation, setWorkshopLocation] = useState("");
  const [workshopDate, setWorkshopDate] = useState("");

  function updateExtra(
    name: string,
    location: string,
    date: string,
  ) {
    const valid =
      name.trim().length > 0 && location.length > 0 && date.length > 0;
    ctx.setExtraValid(valid);
    ctx.setExtraResponses({
      workshop_name: name.trim(),
      workshop_location: location,
      workshop_date: date,
    });
  }

  function handleWorkshopName(v: string) {
    setWorkshopName(v);
    updateExtra(v, workshopLocation, workshopDate);
    ctx.clearError();
  }

  function handleWorkshopLocation(v: string) {
    setWorkshopLocation(v);
    updateExtra(workshopName, v, workshopDate);
    ctx.clearError();
  }

  function handleWorkshopDate(v: string) {
    setWorkshopDate(v);
    updateExtra(workshopName, workshopLocation, v);
    ctx.clearError();
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-ink">
          About you &amp; today&apos;s workshop
        </h2>
        <p className="mt-1 text-sm text-ink">
          So we can connect your feedback to the right workshop.
        </p>
      </div>
      <div className="space-y-5">
        <div>
          <label
            htmlFor="workshop-name"
            className="text-sm font-medium text-ink mb-2 block"
          >
            Workshop Name
            <span aria-hidden="true" className="text-red-500 ml-0.5">
              *
            </span>
          </label>
          <select
            id="workshop-name"
            value={workshopName}
            onChange={(e) => handleWorkshopName(e.target.value)}
            required
            aria-required="true"
            className={INPUT_CLASS}
          >
            <option value="" disabled>
              Choose your workshop…
            </option>
            {WORKSHOP_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-ink mb-2">
            Workshop Location
            <span aria-hidden="true" className="text-red-500 ml-0.5">
              *
            </span>
          </legend>
          <div className="space-y-1.5">
            {WORKSHOP_LOCATION_OPTIONS.map((loc) => (
              <label
                key={loc}
                className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 cursor-pointer transition-colors ${
                  workshopLocation === loc
                    ? "border-ink bg-ink/5"
                    : "border-rule bg-white hover:border-ink-faint"
                }`}
              >
                <input
                  type="radio"
                  name="workshop-location"
                  value={loc}
                  checked={workshopLocation === loc}
                  onChange={() => handleWorkshopLocation(loc)}
                  className="h-3.5 w-3.5 border-rule text-ink focus:ring-ink-faint"
                />
                <span className="text-sm text-ink">{loc}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="workshop-date"
            className="text-sm font-medium text-ink mb-2 block"
          >
            Today&apos;s Date
            <span aria-hidden="true" className="text-red-500 ml-0.5">
              *
            </span>
          </label>
          <input
            id="workshop-date"
            type="date"
            value={workshopDate}
            onChange={(e) => handleWorkshopDate(e.target.value)}
            required
            aria-required="true"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="contact-name"
            className="text-sm font-medium text-ink mb-2 block"
          >
            Your Name
            <span aria-hidden="true" className="text-red-500 ml-0.5">
              *
            </span>
          </label>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            required
            aria-required="true"
            value={ctx.fullName}
            onChange={(e) => ctx.onFullNameChange(e.target.value)}
            placeholder="First and last name"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="text-sm font-medium text-ink mb-2 block"
          >
            Email
            <span aria-hidden="true" className="text-red-500 ml-0.5">
              *
            </span>
          </label>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            required
            aria-required="true"
            value={ctx.email}
            onChange={(e) => ctx.onEmailChange(e.target.value)}
            placeholder="you@example.com"
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thin wrapper
// ---------------------------------------------------------------------------

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicWorkshopSurvey({ surveyId, programSlug }: Props) {
  return (
    <PublicSurveyWizard
      surveyId={surveyId}
      programSlug={programSlug}
      pages={PAGES}
      consentVersion={CONSENT_VERSION}
      renderContactPage={(ctx) => <WorkshopContactPage {...ctx} />}
      successTitle="Thank you!"
      successBody="Your voice matters and helps shape everything we build."
    />
  );
}
