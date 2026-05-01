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
  /** Renders as a single-line <input> instead of a textarea. Use for short values like ZIP codes. */
  short?: boolean;
};

export type LikertQuestion = {
  type: "likert";
  id: string;
  label: string;
  statements: string[];
  scale: string[];
  /** Anchor labels shown inline above each statement's scale row so
   *  respondents don't have to remember which end is high/low. */
  scaleAnchors?: { low: string; high: string };
  required?: boolean;
};

export type MonthYearQuestion = {
  type: "month-year";
  id: string;
  label: string;
  /** Inclusive range for the year dropdown. Defaults to current year -100 .. current year. */
  minYear?: number;
  maxYear?: number;
  required?: boolean;
};

export type ConsentQuestion = {
  type: "consent";
  id: string;
  label: string;
  /** Lead paragraph rendered above any bullets + footer. */
  text: string;
  /** Optional bulleted key points. Renders as a <ul> below `text`. */
  bullets?: string[];
  /** Optional trailing paragraph rendered below the bullets. */
  footer?: string;
  confirmLabel?: string;
  required?: boolean;
};

export type DualLikertQuestion = {
  type: "dual-likert";
  id: string;
  label: string;
  scale: string[];
  beforeLabel: string;
  nowLabel: string;
  scaleAnchors?: { low: string; high: string };
  statements: string[];
  required?: boolean;
};

export type DateQuestion = {
  type: "date";
  id: string;
  label: string;
  min?: string;
  max?: string;
  required?: boolean;
};

export type SurveyQuestion =
  | RadioQuestion
  | MultiSelectQuestion
  | TextQuestion
  | LikertQuestion
  | MonthYearQuestion
  | ConsentQuestion
  | DualLikertQuestion
  | DateQuestion;

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
    } else if (q.type === "date") {
      if (!val || typeof val !== "string" || !val.trim()) return false;
    } else if (q.type === "likert") {
      const likertVal = val as Record<string, string> | undefined;
      if (!likertVal) return false;
      for (const stmt of q.statements) {
        if (!likertVal[stmt]) return false;
      }
    } else if (q.type === "dual-likert") {
      if (!q.required) return true;
      const val = answers[q.id] as Record<string, { before?: string; now?: string }> | undefined;
      if (!val) return false;
      if (!q.statements.every((s) => !!(val[s]?.before && val[s]?.now))) return false;
    } else if (q.type === "month-year") {
      const my = val as { month: string; year: string } | undefined;
      if (!my || !my.month || !my.year) return false;
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
    case "month-year":
      return (
        <MonthYearField
          question={question}
          value={value as { month: string; year: string } | undefined}
          onChange={onChange}
        />
      );
    case "dual-likert":
      return (
        <DualLikertField
          question={question}
          value={value as Record<string, { before?: string; now?: string }>}
          onChange={onChange}
        />
      );
    case "date":
      return <DateField question={question} value={value as string} onChange={onChange} />;
  }
}

const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

function linkifyEmails(text: string): React.ReactNode {
  const parts = text.split(EMAIL_RE);
  return parts.map((part, i) =>
    EMAIL_RE.test(part) ? (
      <a key={i} href={`mailto:${part}`} className="underline hover:text-neutral-900">
        {part}
      </a>
    ) : (
      part
    )
  );
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
  const checkboxId = `consent-${question.id}`;
  const descId = `${checkboxId}-text`;
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <div id={descId} className="text-sm text-neutral-700 space-y-2 mb-4">
        <p>{question.text}</p>
        {question.bullets && question.bullets.length > 0 && (
          <ul className="list-disc space-y-1.5 pl-5 marker:text-neutral-400">
            {question.bullets.map((b) => (
              <li key={b}>{linkifyEmails(b)}</li>
            ))}
          </ul>
        )}
        {question.footer && (
          <p className="pt-1 text-xs text-neutral-600">{question.footer}</p>
        )}
      </div>
      <label htmlFor={checkboxId} className="flex items-center gap-2 cursor-pointer">
        <input
          id={checkboxId}
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          aria-required={question.required || undefined}
          aria-describedby={descId}
          className="rounded border-neutral-300 h-4 w-4"
        />
        <span className="text-sm font-medium text-neutral-900">
          {question.confirmLabel ?? "I understand and agree to participate."}
        </span>
        {question.required && (
          <span aria-hidden="true" className="text-red-500 text-xs">
            *
          </span>
        )}
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
        {question.required && (
          <span aria-hidden="true" className="text-red-500 ml-0.5">
            *
          </span>
        )}
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
        {question.required && (
          <span aria-hidden="true" className="text-red-500 ml-0.5">
            *
          </span>
        )}
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
  const inputId = `text-${question.id}`;
  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-medium text-neutral-900 mb-2 block">
        {question.label}
        {question.required && (
          <span aria-hidden="true" className="text-red-500 ml-0.5">
            *
          </span>
        )}
      </label>
      {question.short ? (
        <input
          id={inputId}
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          aria-required={question.required || undefined}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
        />
      ) : (
        <textarea
          id={inputId}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          rows={3}
          aria-required={question.required || undefined}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all resize-none"
        />
      )}
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

  const { scaleAnchors } = question;
  const scaleHint = scaleAnchors
    ? `Scale: ${scaleAnchors.low} to ${scaleAnchors.high}.`
    : "";

  return (
    <fieldset>
      <legend className="text-sm font-medium text-neutral-900 mb-3">
        {question.label}
        {question.required && (
          <span aria-hidden="true" className="text-red-500 ml-0.5">
            *
          </span>
        )}
      </legend>

      <div className="space-y-3">
        {question.statements.map((stmt, idx) => {
          const groupId = `${question.id}-stmt-${idx}`;
          const selected = responses[stmt];
          return (
            <div
              key={stmt}
              className="rounded-xl border border-neutral-200 bg-white p-4"
            >
              <p id={groupId} className="text-sm text-neutral-800 mb-3">
                {stmt}
              </p>
              <div
                role="radiogroup"
                aria-labelledby={groupId}
                aria-required={question.required || undefined}
                className="flex justify-between"
              >
                {question.scale.map((s) => {
                  const isSelected = selected === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`${s} of ${question.scale.length}${scaleHint ? `. ${scaleHint}` : ""}`}
                      onClick={() => setResponse(stmt, s)}
                      className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-neutral-900 text-white"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {scaleAnchors && (
                <div
                  aria-hidden="true"
                  className="mt-1.5 flex justify-between text-[11px] text-neutral-400"
                >
                  <span>{scaleAnchors.low.replace(/^\d+ — /, "")}</span>
                  <span>{scaleAnchors.high.replace(/^\d+ — /, "")}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function DualLikertField({
  question,
  value,
  onChange,
}: {
  question: DualLikertQuestion;
  value: Record<string, { before?: string; now?: string }> | undefined;
  onChange: (val: Record<string, { before?: string; now?: string }>) => void;
}) {
  const responses = value ?? {};
  const { scaleAnchors } = question;

  function setResponse(stmt: string, side: "before" | "now", val: string) {
    const current = responses[stmt] ?? {};
    onChange({ ...responses, [stmt]: { ...current, [side]: val } });
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-neutral-900 mb-3">
        {question.label}
        {question.required && (
          <span aria-hidden="true" className="text-red-500 ml-0.5">*</span>
        )}
      </legend>
      <div className="space-y-3">
        {question.statements.map((stmt, idx) => {
          const selected = responses[stmt] ?? {};
          const groupIdBefore = `${question.id}-${idx}-before`;
          const groupIdNow = `${question.id}-${idx}-now`;
          return (
            <div key={stmt} className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-sm text-neutral-800 mb-4">{stmt}</p>
              <div className="flex flex-col md:flex-row gap-4">
                {/* BEFORE column */}
                <div className="flex-1">
                  <p id={groupIdBefore} className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                    {question.beforeLabel}
                  </p>
                  <div role="radiogroup" aria-labelledby={groupIdBefore} className="flex justify-between">
                    {question.scale.map((s) => {
                      const isSelected = selected.before === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={`${question.beforeLabel}: ${s}`}
                          onClick={() => setResponse(stmt, "before", s)}
                          className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${
                            isSelected
                              ? "bg-neutral-900 text-white"
                              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  {scaleAnchors && (
                    <div aria-hidden="true" className="mt-1.5 flex justify-between text-[11px] text-neutral-400">
                      <span>{scaleAnchors.low}</span>
                      <span>{scaleAnchors.high}</span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px bg-neutral-200" />
                <div className="md:hidden h-px bg-neutral-100" />

                {/* RIGHT NOW column */}
                <div className="flex-1">
                  <p id={groupIdNow} className="text-[11px] font-semibold uppercase tracking-wide text-[#E54D2E] mb-2">
                    {question.nowLabel}
                  </p>
                  <div role="radiogroup" aria-labelledby={groupIdNow} className="flex justify-between">
                    {question.scale.map((s) => {
                      const isSelected = selected.now === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={`${question.nowLabel}: ${s}`}
                          onClick={() => setResponse(stmt, "now", s)}
                          className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${
                            isSelected
                              ? "bg-[#E54D2E] text-white"
                              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  {scaleAnchors && (
                    <div aria-hidden="true" className="mt-1.5 flex justify-between text-[11px] text-neutral-400">
                      <span>{scaleAnchors.low}</span>
                      <span>{scaleAnchors.high}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function DateField({
  question,
  value,
  onChange,
}: {
  question: DateQuestion;
  value: string | undefined;
  onChange: (val: string) => void;
}) {
  const inputId = `date-${question.id}`;
  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-medium text-neutral-900 mb-2 block">
        {question.label}
        {question.required && <span aria-hidden="true" className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={inputId}
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        min={question.min}
        max={question.max}
        aria-required={question.required || undefined}
        className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
      />
    </div>
  );
}

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function MonthYearField({
  question,
  value,
  onChange,
}: {
  question: MonthYearQuestion;
  value: { month: string; year: string } | undefined;
  onChange: (val: { month: string; year: string }) => void;
}) {
  const current = value ?? { month: "", year: "" };
  const now = new Date().getFullYear();
  const maxYear = question.maxYear ?? now;
  const minYear = question.minYear ?? now - 100;
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

  const selectClass =
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all";

  return (
    <div>
      <label className="text-sm font-medium text-neutral-900 mb-2 block">
        {question.label}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={current.month}
          onChange={(e) => onChange({ month: e.target.value, year: current.year })}
          className={selectClass}
          aria-label="Month"
        >
          <option value="">Month</option>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          value={current.year}
          onChange={(e) => onChange({ month: current.month, year: e.target.value })}
          className={selectClass}
          aria-label="Year"
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
