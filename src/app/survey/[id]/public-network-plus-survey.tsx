"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import {
  QuestionRenderer,
  isPageValid as validatePage,
  type SurveyQuestion,
} from "@/components/survey-fields";
import { savePublicSurveyResponse } from "./actions";

// Structured questions for the CompTIA Network+ Post-Survey. Mirrors the
// content spec in .context/attachments/CompTIA Network+ Post Survey.pdf.
// Page 0 is the "Contact" step (email + name + consent); every other page is
// rendered by QuestionRenderer. The Security+ page has a showIf predicate
// that hides it when Q23 == "Not interested".

type QuestionsPage = {
  kind: "questions";
  title: string;
  subtitle?: string;
  questions: SurveyQuestion[];
  showIf?: (answers: Record<string, unknown>) => boolean;
};

type Page = { kind: "contact" } | QuestionsPage;

const LIKERT_1_5: string[] = ["1", "2", "3", "4", "5"];

const PAGES: Page[] = [
  { kind: "contact" },

  {
    kind: "questions",
    title: "About You",
    subtitle:
      "These questions help us understand who we're reaching. All responses are confidential.",
    questions: [
      {
        type: "text",
        id: "date_of_birth",
        label: "Date of birth (MM/DD/YYYY)",
        placeholder: "MM/DD/YYYY",
        required: true,
      },
      {
        type: "radio",
        id: "gender",
        label: "What is your gender?",
        options: [
          "Man",
          "Woman",
          "Non-binary",
          "Genderqueer / Gender non-conforming",
          "Transgender",
          "Prefer not to say",
          "Other",
        ],
        required: true,
      },
      {
        type: "multi-select",
        id: "race_ethnicity",
        label: "What is your race and/or ethnicity? Select all that apply.",
        options: [
          "American Indian or Alaska Native",
          "Asian",
          "Black or African American",
          "Hispanic or Latino",
          "Middle Eastern or North African",
          "Native Hawaiian or Pacific Islander",
          "White",
          "Other",
        ],
        required: true,
      },
      {
        type: "multi-select",
        id: "languages",
        label: "What languages do you speak at home? Select all that apply.",
        options: ["English", "Spanish", "Other"],
        required: true,
      },
      {
        type: "text",
        id: "zip_code",
        label: "First 3 digits of your ZIP code",
        placeholder: "e.g. 402",
        required: true,
      },
      {
        type: "radio",
        id: "education_level",
        label: "What is the highest level of education you have completed?",
        options: [
          "Some high school (no diploma)",
          "High school diploma or GED",
          "Some college (no degree)",
          "Associate degree",
          "Bachelor's degree",
          "Graduate or professional degree",
        ],
        required: true,
      },
    ],
  },

  {
    kind: "questions",
    title: "Background",
    subtitle: "Tell us a bit about your situation today.",
    questions: [
      {
        type: "radio",
        id: "first_gen_college",
        label:
          "If you started college today, would you be the first in your immediate family to attend or complete college?",
        options: ["Yes", "No", "Not applicable"],
        required: true,
      },
      {
        type: "multi-select",
        id: "employment_status",
        label: "What is your current employment status? Select all that apply.",
        options: [
          "Employed",
          "Unemployed",
          "Student",
          "Full-time",
          "Part-time",
          "Looking for work",
          "Not currently looking for work",
          "Other",
        ],
        required: true,
      },
      {
        type: "radio",
        id: "household_income",
        label: "What best describes your household income range?",
        options: [
          "Under $20,000",
          "$20,000 – $39,999",
          "$40,000 – $59,999",
          "$60,000 – $79,999",
          "$80,000 or more",
          "Prefer not to say",
        ],
        required: true,
      },
      {
        type: "radio",
        id: "disability",
        label: "Do you identify as a person with a disability?",
        options: ["Yes", "No", "Prefer not to say"],
        required: true,
      },
    ],
  },

  {
    kind: "questions",
    title: "How You Found Us",
    questions: [
      {
        type: "text",
        id: "how_heard",
        label: "How did you first hear about Beyond Code Collective?",
        placeholder: "Tell us how you found out about us...",
        required: true,
      },
      {
        type: "text",
        id: "why_enroll",
        label:
          "Is there anything specific that made you decide to enroll — a conversation, a moment, a person? Feel free to share.",
        placeholder: "Optional — share anything that stood out.",
        required: false,
      },
    ],
  },

  {
    kind: "questions",
    title: "Why You're Here",
    subtitle:
      "We want to understand what brought you here and how this program is fitting into your life.",
    questions: [
      {
        type: "multi-select",
        id: "primary_reasons",
        label: "What are your primary reasons for completing this program?",
        options: [
          "To get a new job in IT or tech",
          "To advance in my current role",
          "To earn a credential or certification",
          "To increase my income",
          "Personal interest or curiosity",
          "To support a career change",
          "Community or family encouragement",
          "To be a better resource at my current job",
        ],
        required: true,
      },
      {
        type: "likert",
        id: "motivation_factors",
        label:
          "Rate how much each factor motivated your participation (1 = Not at all motivated, 5 = Extremely motivated)",
        scale: LIKERT_1_5,
        statements: [
          "Job placement / career opportunity",
          "Financial stability / increased earning potential",
          "Building skills for personal growth",
          "Gaining a recognized credential",
        ],
        required: true,
      },
    ],
  },

  {
    kind: "questions",
    title: "Your Experience So Far",
    subtitle:
      "For each statement, tell us where you stand on a scale of 1 (Strongly disagree) to 5 (Strongly agree).",
    questions: [
      {
        type: "likert",
        id: "experience_ratings",
        label: "Please rate each statement about your experience in this program to date.",
        scale: LIKERT_1_5,
        statements: [
          "I feel more confident in my technical knowledge since starting this program.",
          "The Tech+ content gave me a strong foundation for Network+.",
          "The pace of this program works for my schedule and learning style.",
          "I feel supported by the instructors and program team.",
          "The material I'm learning feels relevant to real-world work.",
          "I feel a sense of belonging within this cohort.",
        ],
        required: true,
      },
      {
        type: "text",
        id: "most_valuable",
        label: "What has been the most valuable part of this program for you so far?",
        placeholder: "Tell us what's been working...",
        required: true,
      },
      {
        type: "text",
        id: "improvement",
        label:
          "Is there anything in the program that has felt challenging, unclear, or could be improved?",
        placeholder: "Be candid — this helps us make the program better.",
        required: false,
      },
    ],
  },

  {
    kind: "questions",
    title: "How We Can Support You",
    questions: [
      {
        type: "multi-select",
        id: "support_types",
        label: "What types of support would be most helpful to you right now?",
        options: [
          "One-on-one mentorship or coaching",
          "Job placement assistance or employer connections",
          "Study groups or peer accountability partners",
          "Exam prep resources and practice tests",
          "Resume and interview preparation",
          "More flexible scheduling or asynchronous content",
          "Mental health or wellness resources",
          "Financial assistance information (grants, stipends, etc.)",
          "Networking events or community connections",
        ],
        required: true,
      },
      {
        type: "radio",
        id: "time_available",
        label:
          "How often are you able to dedicate time to studying outside of scheduled sessions?",
        options: [
          "Daily",
          "A few times a week",
          "Once a week",
          "Rarely — my schedule makes it difficult",
          "I haven't been able to study outside of sessions",
        ],
        required: true,
      },
      {
        type: "text",
        id: "barriers",
        label:
          "Are there any barriers — personal, professional, financial, or logistical — that are making it harder to fully participate?",
        placeholder: "Optional — share anything you're not comfortable with.",
        required: false,
      },
    ],
  },

  {
    kind: "questions",
    title: "Looking Ahead — CompTIA Security+",
    subtitle:
      "We're exploring whether to offer Security+ after Network+. Your answer here helps us decide.",
    questions: [
      {
        type: "radio",
        id: "securityplus_interest",
        label: "How interested are you in continuing to Security+ after completing Network+?",
        options: [
          "Very interested — I'm planning to continue",
          "Somewhat interested — I'd like to know more first",
          "Undecided — depends on timing, and other factors",
          "Probably not at this time",
          "Not interested",
        ],
        required: true,
      },
    ],
  },

  {
    kind: "questions",
    title: "Security+ Details",
    subtitle:
      "These questions help us design a Security+ offering that works for you.",
    showIf: (a) => a.securityplus_interest !== "Not interested",
    questions: [
      {
        type: "multi-select",
        id: "securityplus_factors",
        label:
          "If we offered a Security+ cohort, what would matter most to you in deciding to join?",
        options: [
          "Schedule flexibility",
          "Time between Network+ completion and start date",
          "Continued access to the same instructors or cohort",
          "Clear job outcomes and employer partnerships",
          "Scholarship or financial support availability",
        ],
        required: true,
      },
      {
        type: "likert",
        id: "securityplus_career_impact",
        label:
          "Rate your agreement (1 = Strongly disagree, 5 = Strongly agree).",
        scale: LIKERT_1_5,
        statements: [
          "I feel earning a Security+ certification would meaningfully advance my career goals.",
        ],
        required: true,
      },
      {
        type: "text",
        id: "securityplus_feedback",
        label:
          "Is there anything you'd want us to know as we design a Security+ offering? What would make it feel worth it for you?",
        placeholder: "Optional — tell us what matters to you.",
        required: false,
      },
    ],
  },

  {
    kind: "questions",
    title: "Final Reflections",
    questions: [
      {
        type: "likert",
        id: "recommend_bcc",
        label:
          "How likely are you to recommend Beyond Code Collective to someone you know? (1 = Not at all likely, 5 = Extremely likely)",
        scale: LIKERT_1_5,
        statements: ["Likelihood to recommend"],
        required: true,
      },
      {
        type: "text",
        id: "anything_else",
        label:
          "Is there anything else you'd like us to know — about your experience, your goals, or what would help you succeed?",
        placeholder: "Optional — share anything you'd like us to know.",
        required: false,
      },
    ],
  },
];

// Bump this whenever the consent text below changes. The version is stored
// with each response so we can tell which notice a respondent agreed to.
export const CONSENT_VERSION = "v1";

const CONSENT_TEXT =
  "Beyond Code Collective (BCC) collects your name, email, and the answers below to improve this program and report aggregated outcomes to our funders. Your responses are stored securely and retained for up to 3 years. We do not sell your data or share individual responses outside BCC staff and program evaluators. You can request removal of your response at any time by visiting /privacy/withdraw or emailing privacy@bccacademy.io. Full details at /privacy.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  surveyId: string;
  programSlug: string;
}

export function PublicNetworkPlusSurvey({ surveyId, programSlug }: Props) {
  const storageKey = `public-survey-${programSlug}-${surveyId}`;

  const initialState = useMemo(() => {
    if (typeof window === "undefined") return { page: 0, answers: {} as Record<string, unknown>, email: "", fullName: "", consent: false };
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return { page: 0, answers: {} as Record<string, unknown>, email: "", fullName: "", consent: false };
    try {
      const parsed = JSON.parse(saved) as {
        page?: number;
        answers?: Record<string, unknown>;
        email?: string;
        fullName?: string;
        consent?: boolean;
      };
      return {
        page: parsed.page ?? 0,
        answers: parsed.answers ?? {},
        email: parsed.email ?? "",
        fullName: parsed.fullName ?? "",
        consent: parsed.consent ?? false,
      };
    } catch {
      return { page: 0, answers: {} as Record<string, unknown>, email: "", fullName: "", consent: false };
    }
  }, [storageKey]);

  const [page, setPage] = useState(initialState.page);
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialState.answers);
  const [email, setEmail] = useState(initialState.email);
  const [fullName, setFullName] = useState(initialState.fullName);
  const [consent, setConsent] = useState(initialState.consent);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const visiblePages = useMemo(() => {
    return PAGES.filter((p) => {
      if (p.kind !== "questions") return true;
      if (!p.showIf) return true;
      return p.showIf(answers);
    });
  }, [answers]);

  const currentPage = visiblePages[page];
  const isLastPage = page === visiblePages.length - 1;

  const persist = useCallback(
    (next: {
      page?: number;
      answers?: Record<string, unknown>;
      email?: string;
      fullName?: string;
      consent?: boolean;
    }) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          page: next.page ?? page,
          answers: next.answers ?? answers,
          email: next.email ?? email,
          fullName: next.fullName ?? fullName,
          consent: next.consent ?? consent,
        }),
      );
    },
    [storageKey, page, answers, email, fullName, consent],
  );

  function updateAnswer(id: string, val: unknown) {
    const updated = { ...answers, [id]: val };
    setAnswers(updated);
    persist({ answers: updated });
  }

  function contactPageValid(): boolean {
    return EMAIL_RE.test(email.trim()) && fullName.trim().length > 0 && consent;
  }

  function isCurrentValid(): boolean {
    if (!currentPage) return false;
    if (currentPage.kind === "contact") return contactPageValid();
    return validatePage(currentPage.questions, answers);
  }

  function handleNext() {
    if (!isCurrentValid()) return;
    if (isLastPage) {
      submit();
      return;
    }
    const next = page + 1;
    setPage(next);
    persist({ page: next });
  }

  function handleBack() {
    if (page === 0) return;
    const prev = page - 1;
    setPage(prev);
    persist({ page: prev });
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const result = await savePublicSurveyResponse({
        programSlug,
        surveyType: surveyId,
        email: email.trim(),
        fullName: fullName.trim(),
        consentVersion: CONSENT_VERSION,
        responses: { ...answers, consent },
      });
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit. Please try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 pb-20">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#E54D2E]/10">
            <Check className="h-6 w-6 text-[#E54D2E]" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Thank you.</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Your responses go directly into how we build and improve this
            program — for you, and for every cohort that comes after you.
          </p>
          <p className="mt-4 text-xs text-neutral-500">
            Change your mind?{" "}
            <a
              href="/privacy/withdraw"
              className="font-medium text-neutral-700 underline hover:text-neutral-900"
            >
              Remove my response
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-20">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-neutral-900">
            Page {page + 1} of {visiblePages.length}
          </p>
          <p className="text-xs text-neutral-400">
            {Math.round(((page + 1) / visiblePages.length) * 100)}%
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-[#1a1a1a] transition-all duration-300"
            style={{
              width: `${((page + 1) / visiblePages.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {currentPage?.kind === "contact" ? (
        <ContactPage
          email={email}
          fullName={fullName}
          consent={consent}
          onEmailChange={(v) => {
            setEmail(v);
            persist({ email: v });
          }}
          onFullNameChange={(v) => {
            setFullName(v);
            persist({ fullName: v });
          }}
          onConsentChange={(v) => {
            setConsent(v);
            persist({ consent: v });
          }}
        />
      ) : currentPage ? (
        <QuestionsPageView
          page={currentPage}
          answers={answers}
          onChange={updateAnswer}
        />
      ) : null}

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-200">
        <button
          onClick={handleBack}
          disabled={page === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!isCurrentValid() || submitting}
          className="inline-flex items-center gap-1 rounded-lg bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : isLastPage ? (
            <>
              <Check size={16} />
              Submit
            </>
          ) : (
            <>
              Next
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ContactPage({
  email,
  fullName,
  consent,
  onEmailChange,
  onFullNameChange,
  onConsentChange,
}: {
  email: string;
  fullName: string;
  consent: boolean;
  onEmailChange: (v: string) => void;
  onFullNameChange: (v: string) => void;
  onConsentChange: (v: boolean) => void;
}) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900">Contact</h2>
        <p className="mt-1 text-sm text-neutral-500">
          You've put in real work — and we want to make sure this program is
          working just as hard for you.
        </p>
      </div>
      <div className="space-y-5">
        <div>
          <label htmlFor="contact-email" className="text-sm font-medium text-neutral-900 mb-2 block">
            Email address
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
          />
        </div>
        <div>
          <label htmlFor="contact-name" className="text-sm font-medium text-neutral-900 mb-2 block">
            Full name
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            placeholder="First and last name"
            className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
          />
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm text-neutral-600 mb-3">{CONSENT_TEXT}</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => onConsentChange(e.target.checked)}
              className="rounded border-neutral-300 h-4 w-4"
            />
            <span className="text-sm font-medium text-neutral-900">
              I understand and agree to participate.
            </span>
            <span className="text-red-500 text-xs">*</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function QuestionsPageView({
  page,
  answers,
  onChange,
}: {
  page: QuestionsPage;
  answers: Record<string, unknown>;
  onChange: (id: string, val: unknown) => void;
}) {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900">{page.title}</h2>
        {page.subtitle && (
          <p className="mt-1 text-sm text-neutral-500">{page.subtitle}</p>
        )}
      </div>
      <div className="space-y-6">
        {page.questions.map((q) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(val) => onChange(q.id, val)}
          />
        ))}
      </div>
    </>
  );
}
