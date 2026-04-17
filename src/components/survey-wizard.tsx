"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { saveSurveyResponse } from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";

// ─── Survey Question Definitions ──────────────────────────────────────────────

type RadioQuestion = {
  type: "radio";
  id: string;
  label: string;
  options: string[];
  required?: boolean;
};

type MultiSelectQuestion = {
  type: "multi-select";
  id: string;
  label: string;
  options: string[];
  required?: boolean;
};

type TextQuestion = {
  type: "text";
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
};

type LikertQuestion = {
  type: "likert";
  id: string;
  label: string;
  statements: string[];
  scale: string[];
  required?: boolean;
};

type ConsentQuestion = {
  type: "consent";
  id: string;
  label: string;
  text: string;
  required?: boolean;
};

type SurveyQuestion =
  | RadioQuestion
  | MultiSelectQuestion
  | TextQuestion
  | LikertQuestion
  | ConsentQuestion;

type SurveyPage = {
  title: string;
  subtitle?: string;
  questions: SurveyQuestion[];
};

// ─── Survey Pages ─────────────────────────────────────────────────────────────
//
// Pages 1–4 are shared across every program (demographics, background, digital
// access, digital experience). The final page is program-specific — ATG is
// oriented around breaking into IT careers, Forge is oriented around AI skills.

const SHARED_PAGES: SurveyPage[] = [
  {
    title: "Consent + About You",
    subtitle: "Your responses are confidential and help us improve our program.",
    questions: [
      {
        type: "consent",
        id: "consent",
        label: "Data Use & Consent",
        text: "Your responses are confidential. We use this information only to improve our program. By completing this survey, you agree to allow Beyond Code Collective to use your anonymous responses for program reporting and improvement.",
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
    ],
  },
  {
    title: "Background",
    subtitle: "Tell us a bit about your situation.",
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
        label: "What is your current employment status? Check all that apply.",
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
    title: "Digital Access",
    subtitle: "Help us understand your current access to technology.",
    questions: [
      {
        type: "multi-select",
        id: "device_access",
        label:
          "What devices do you have regular access to right now? Select all that apply.",
        options: [
          "Smartphone (iPhone, Android, etc.)",
          "Laptop",
          "Desktop computer",
          "Tablet",
          "I don't have regular access to any of these",
        ],
        required: true,
      },
      {
        type: "text",
        id: "computer_access",
        label:
          "Where do you usually go when you need to use a computer or get online? Do you have any challenges getting access?",
        placeholder: "Tell us about your typical access to computers and internet...",
        required: true,
      },
    ],
  },
  {
    title: "Digital Experience",
    subtitle:
      "For each statement below, select how much you agree or disagree. There are no right or wrong answers.",
    questions: [
      {
        type: "likert",
        id: "digital_experience",
        label: "Digital Experience",
        scale: [
          "Strongly Agree",
          "Agree",
          "Neutral",
          "Disagree",
          "Strongly Disagree",
        ],
        statements: [
          "I feel comfortable using a computer or tablet on my own.",
          "I feel comfortable using technology.",
          "I know how to search for information online and check if it's reliable.",
          "I feel confident sending a professional email.",
          "I understand how to stay safe online (passwords, scams, privacy).",
          "I can use tools like Google Docs, Sheets, or MS Word for school or work.",
          "I feel like technology is something I can learn and control.",
          "I could use technology to help me reach a goal (job, school, or creative).",
          "I'm excited to use new technologies.",
        ],
        required: true,
      },
    ],
  },
];

const FORGE_FINAL_PAGE: SurveyPage = {
  title: "AI Experience",
  subtitle:
    "These questions help us understand your current understanding of AI. You don't need any prior experience — just answer based on where you are right now.",
  questions: [
    {
      type: "likert",
      id: "ai_experience",
      label: "AI Tools",
      scale: [
        "Strongly Agree",
        "Agree",
        "Neutral",
        "Disagree",
        "Strongly Disagree",
      ],
      statements: [
        "I'm familiar with everyday AI tools (e.g. ChatGPT, Google Gemini, Snapchat AI).",
        "I'm familiar with coding AI tools (e.g. Codex, Replit, Loveable).",
        "I know what AI tools are and have a basic idea of how they work.",
        "I see learning AI tools as a skill worth developing seriously.",
        "I feel confident I could learn to use AI tools well.",
        "AI feels relevant to my future goals.",
      ],
      required: true,
    },
    {
      type: "text",
      id: "ai_perspective",
      label:
        "What is your perspective and experience with AI? Tell us more in a few sentences.",
      placeholder: "Share your thoughts on AI...",
      required: true,
    },
    {
      type: "text",
      id: "anything_else",
      label: "Is there anything else important for us to know?",
      placeholder: "Optional — share anything else you'd like us to know.",
      required: false,
    },
  ],
};

const ATG_FINAL_PAGE: SurveyPage = {
  title: "Tech Career Path",
  subtitle:
    "These questions help us understand your interest and readiness for a career in tech. There are no right or wrong answers.",
  questions: [
    {
      type: "likert",
      id: "tech_career_readiness",
      label: "Tech Career Readiness",
      scale: [
        "Strongly Agree",
        "Agree",
        "Neutral",
        "Disagree",
        "Strongly Disagree",
      ],
      statements: [
        "I'm familiar with what IT professionals do day-to-day.",
        "I know what the CompTIA Tech+ certification is and why it matters.",
        "I see learning IT skills as a realistic path for me.",
        "I feel confident I could pass a tech certification exam with the right prep.",
        "I've researched what tech jobs are available and what they pay.",
        "I know at least one person who works in IT or tech.",
        "Transitioning from athletics into a tech career feels achievable for me.",
      ],
      required: true,
    },
    {
      type: "text",
      id: "tech_motivation",
      label:
        "What draws you to a career in tech? Tell us more in a few sentences.",
      placeholder: "Share what's motivating you to pursue tech...",
      required: true,
    },
    {
      type: "text",
      id: "anything_else",
      label: "Is there anything else important for us to know?",
      placeholder: "Optional — share anything else you'd like us to know.",
      required: false,
    },
  ],
};

function getSurveyPages(programSlug: string): SurveyPage[] {
  const finalPage = programSlug === "atg" ? ATG_FINAL_PAGE : FORGE_FINAL_PAGE;
  return [...SHARED_PAGES, finalPage];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  surveyId: string;
  programSlug: string;
  existingResponses?: Record<string, unknown> | null;
}

export function SurveyWizard({ surveyId, programSlug, existingResponses }: Props) {
  const router = useRouter();
  const storageKey = `survey-${surveyId}-progress`;
  const SURVEY_PAGES = getSurveyPages(programSlug);

  const [page, setPage] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved).page ?? 0;
        } catch { /* ignore */ }
      }
    }
    return 0;
  });

  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    if (existingResponses) return existingResponses;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved).answers ?? {};
        } catch { /* ignore */ }
      }
    }
    return {};
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentPage = SURVEY_PAGES[page];
  const isLastPage = page === SURVEY_PAGES.length - 1;

  const saveProgress = useCallback(
    (newAnswers: Record<string, unknown>, newPage: number) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ answers: newAnswers, page: newPage })
        );
      }
    },
    [storageKey]
  );

  function updateAnswer(questionId: string, value: unknown) {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    saveProgress(updated, page);
  }

  function isPageValid(): boolean {
    if (!currentPage) return false;
    for (const q of currentPage.questions) {
      if (!q.required) continue;
      const val = answers[q.id];
      if (q.type === "consent") {
        if (val !== true) return false;
      } else if (q.type === "multi-select") {
        if (!Array.isArray(val) || val.length === 0) return false;
      } else if (q.type === "likert") {
        const likertQ = q as LikertQuestion;
        const likertVal = val as Record<string, string> | undefined;
        if (!likertVal) return false;
        for (const stmt of likertQ.statements) {
          if (!likertVal[stmt]) return false;
        }
      } else {
        if (!val || (typeof val === "string" && !val.trim())) return false;
      }
    }
    return true;
  }

  function handleNext() {
    if (!isPageValid()) return;
    if (isLastPage) {
      handleSubmit();
    } else {
      const nextPage = page + 1;
      setPage(nextPage);
      saveProgress(answers, nextPage);
    }
  }

  function handleBack() {
    if (page > 0) {
      const prevPage = page - 1;
      setPage(prevPage);
      saveProgress(answers, prevPage);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      await saveSurveyResponse(surveyId, answers, programSlug);
      // Clear localStorage on success
      if (typeof window !== "undefined") {
        localStorage.removeItem(storageKey);
      }
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit survey");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-neutral-900">
            Page {page + 1} of {SURVEY_PAGES.length}
          </p>
          <p className="text-xs text-neutral-400">
            {Math.round(((page + 1) / SURVEY_PAGES.length) * 100)}%
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-neutral-900 transition-all duration-300"
            style={{
              width: `${((page + 1) / SURVEY_PAGES.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900">
          {currentPage.title}
        </h2>
        {currentPage.subtitle && (
          <p className="mt-1 text-sm text-neutral-500">
            {currentPage.subtitle}
          </p>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {currentPage.questions.map((q) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(val) => updateAnswer(q.id, val)}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      {/* Navigation */}
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
          disabled={!isPageValid() || submitting}
          className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
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

// ─── Question Renderers ───────────────────────────────────────────────────────

function QuestionRenderer({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  switch (question.type) {
    case "consent":
      return <ConsentField question={question} value={value as boolean} onChange={onChange} />;
    case "radio":
      return <RadioField question={question} value={value as string} onChange={onChange} />;
    case "multi-select":
      return <MultiSelectField question={question} value={value as string[]} onChange={onChange} />;
    case "text":
      return <TextField question={question} value={value as string} onChange={onChange} />;
    case "likert":
      return <LikertField question={question} value={value as Record<string, string>} onChange={onChange} />;
  }
}

function ConsentField({
  question,
  value,
  onChange,
}: {
  question: ConsentQuestion;
  value: boolean | undefined;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm text-neutral-600 mb-3">{question.text}</p>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-neutral-300 h-4 w-4"
        />
        <span className="text-sm font-medium text-neutral-900">
          I understand and agree to participate.
        </span>
        {question.required && <span className="text-red-500 text-xs">*</span>}
      </label>
    </div>
  );
}

function RadioField({
  question,
  value,
  onChange,
}: {
  question: RadioQuestion;
  value: string | undefined;
  onChange: (val: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-neutral-900 mb-2">
        {question.label}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </legend>
      <div className="space-y-1.5">
        {question.options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 cursor-pointer transition-colors ${
              value === opt
                ? "border-neutral-900 bg-neutral-900/5"
                : "border-neutral-200 bg-white hover:border-neutral-300"
            }`}
          >
            <input
              type="radio"
              name={question.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="h-3.5 w-3.5 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <span className="text-sm text-neutral-700">{opt}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function MultiSelectField({
  question,
  value,
  onChange,
}: {
  question: MultiSelectQuestion;
  value: string[] | undefined;
  onChange: (val: string[]) => void;
}) {
  const selected = value ?? [];

  function toggle(opt: string) {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt));
    } else {
      onChange([...selected, opt]);
    }
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-neutral-900 mb-2">
        {question.label}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </legend>
      <div className="space-y-1.5">
        {question.options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 cursor-pointer transition-colors ${
              selected.includes(opt)
                ? "border-neutral-900 bg-neutral-900/5"
                : "border-neutral-200 bg-white hover:border-neutral-300"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <span className="text-sm text-neutral-700">{opt}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TextField({
  question,
  value,
  onChange,
}: {
  question: TextQuestion;
  value: string | undefined;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-neutral-900 mb-2 block">
        {question.label}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        rows={3}
        className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all resize-none"
      />
    </div>
  );
}

function LikertField({
  question,
  value,
  onChange,
}: {
  question: LikertQuestion;
  value: Record<string, string> | undefined;
  onChange: (val: Record<string, string>) => void;
}) {
  const responses = value ?? {};

  function setResponse(statement: string, scaleValue: string) {
    onChange({ ...responses, [statement]: scaleValue });
  }

  return (
    <div>
      <p className="text-sm font-medium text-neutral-900 mb-3">
        {question.label}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </p>

      {/* Mobile: card-based layout */}
      <div className="space-y-3">
        {question.statements.map((stmt) => (
          <div
            key={stmt}
            className="rounded-xl border border-neutral-200 bg-white p-3.5"
          >
            <p className="text-sm text-neutral-700 mb-2.5">{stmt}</p>
            <div className="flex flex-wrap gap-1.5">
              {question.scale.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setResponse(stmt, s)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    responses[stmt] === s
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
