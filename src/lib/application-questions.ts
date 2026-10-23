// The shared question vocabulary for application forms — one converter from
// the builder/importer draft shape to the SurveyQuestion the renderer draws.
// Pure module: imported by server actions and client components alike.

import type { SurveyQuestion } from "@/components/survey-fields";

export const QUESTION_KINDS = [
  { value: "text", label: "Long answer" },
  { value: "text-short", label: "Short answer" },
  { value: "radio", label: "Pick one" },
  { value: "multi-select", label: "Pick any" },
  { value: "select", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "consent", label: "Consent checkbox" },
] as const;

export type QuestionKind = (typeof QUESTION_KINDS)[number]["value"];

export type DraftQuestion = {
  id: string;
  kind: QuestionKind;
  label: string;
  options: string[];
  required: boolean;
};

export function needsOptions(kind: QuestionKind): boolean {
  return kind === "radio" || kind === "multi-select" || kind === "select";
}

export function toSurveyQuestion(q: DraftQuestion): SurveyQuestion {
  const options = q.options.map((o) => o.trim()).filter(Boolean);
  const base = { id: q.id, label: q.label.trim(), required: q.required };
  switch (q.kind) {
    case "text":
      return { ...base, type: "text" };
    case "text-short":
      return { ...base, type: "text", short: true };
    case "radio":
      return { ...base, type: "radio", options };
    case "multi-select":
      return { ...base, type: "multi-select", options };
    case "select":
      return { ...base, type: "select", options };
    case "date":
      return { ...base, type: "date" };
    case "consent":
      // Consent must be affirmative to mean anything. The label doubles as
      // the lead text; the checkbox line is a standard confirmation.
      return {
        ...base,
        type: "consent",
        text: q.label.trim(),
        confirmLabel: "I understand and agree",
        required: true,
      };
  }
}

export function newDraftQuestion(): DraftQuestion {
  return {
    id: `q-${crypto.randomUUID().slice(0, 8)}`,
    kind: "text",
    label: "",
    options: [],
    required: true,
  };
}

/** Inverse of toSurveyQuestion for the kinds the builder can draw. Returns
 *  null for anything richer (likert, file, month-year, zip text…): those are
 *  kept untouched by the edit screen and can only be switched on or off. */
export function toDraftQuestion(q: SurveyQuestion): DraftQuestion | null {
  const base = { id: q.id, label: q.label, required: Boolean(q.required) };
  switch (q.type) {
    case "text":
      return q.zip ? null : { ...base, kind: q.short ? "text-short" : "text", options: [] };
    case "radio":
      return { ...base, kind: "radio", options: q.options };
    case "multi-select":
      return { ...base, kind: "multi-select", options: q.options };
    case "select":
      return { ...base, kind: "select", options: q.options };
    case "date":
      return { ...base, kind: "date", options: [] };
    case "consent":
      return { ...base, kind: "consent", options: [], required: true };
    default:
      return null;
  }
}
