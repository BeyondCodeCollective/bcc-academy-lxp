"use client";

// Shared survey question types and field renderers. Used by both the in-app
// SurveyWizard (authenticated dashboard) and the public survey wizard
// (catalyst.bccacademy.io post-survey). Keeping them in one file means a
// single source of truth for markup and styling.

export type RadioQuestion = {
  type: "radio";
  id: string;
  label: string;
  options: string[];
  required?: boolean;
};

export type MultiSelectQuestion = {
  type: "multi-select";
  id: string;
  label: string;
  options: string[];
  required?: boolean;
};

export type TextQuestion = {
  type: "text";
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
};

export type LikertQuestion = {
  type: "likert";
  id: string;
  label: string;
  statements: string[];
  scale: string[];
  required?: boolean;
};

export type ConsentQuestion = {
  type: "consent";
  id: string;
  label: string;
  text: string;
  confirmLabel?: string;
  required?: boolean;
};

export type SurveyQuestion =
  | RadioQuestion
  | MultiSelectQuestion
  | TextQuestion
  | LikertQuestion
  | ConsentQuestion;

export function isPageValid(
  questions: SurveyQuestion[],
  answers: Record<string, unknown>,
): boolean {
  for (const q of questions) {
    if (!q.required) continue;
    const val = answers[q.id];
    if (q.type === "consent") {
      if (val !== true) return false;
    } else if (q.type === "multi-select") {
      if (!Array.isArray(val) || val.length === 0) return false;
    } else if (q.type === "likert") {
      const likertVal = val as Record<string, string> | undefined;
      if (!likertVal) return false;
      for (const stmt of q.statements) {
        if (!likertVal[stmt]) return false;
      }
    } else {
      if (!val || (typeof val === "string" && !val.trim())) return false;
    }
  }
  return true;
}

export function QuestionRenderer({
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
          {question.confirmLabel ?? "I understand and agree to participate."}
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
