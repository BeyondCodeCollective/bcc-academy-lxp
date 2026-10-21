import { parseCsv } from "@/lib/events-import";

// Custom parent survey for an event, uploaded as a CSV: `question,type,options`.
// type is rating (1-5), yesno, text or choice; choice options are split on "|".

export type SurveyQuestionType = "rating" | "yesno" | "text" | "choice";
export type SurveyQuestion = { prompt: string; type: SurveyQuestionType; options?: string[] };
export type SurveyAnswerValue = string | number | boolean | null;
export type SurveyAnswer = { prompt: string; type: SurveyQuestionType; value: SurveyAnswerValue };

export const MAX_SURVEY_QUESTIONS = 20;
export const SURVEY_SAMPLE_CSV = [
  "question,type,options",
  "How was the event for your family overall?,rating,",
  "Would you recommend it to another family?,yesno,",
  "Which activity did your child like most?,choice,Robotics|Game design|Web basics",
  "What could we do better?,text,",
].join("\n");

const TYPE_ALIASES: Record<string, SurveyQuestionType> = {
  rating: "rating",
  scale: "rating",
  yesno: "yesno",
  "yes/no": "yesno",
  "yes-no": "yesno",
  text: "text",
  open: "text",
  comment: "text",
  choice: "choice",
  select: "choice",
  "multiple choice": "choice",
};

export function parseSurveyCsv(text: string): { ok: true; questions: SurveyQuestion[] } | { ok: false; error: string } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, error: "Add a header row and at least one question." };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const qi = header.findIndex((h) => h === "question" || h === "prompt");
  if (qi < 0) return { ok: false, error: 'The first row must have a "question" column.' };
  const ti = header.indexOf("type");
  const oi = header.indexOf("options");

  const questions: SurveyQuestion[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const prompt = (row[qi] ?? "").trim();
    if (!prompt) continue;
    if (prompt.length > 300) return { ok: false, error: `Row ${i + 1}: question is over 300 characters.` };
    const rawType = ti >= 0 ? (row[ti] ?? "").trim().toLowerCase() : "";
    const type = rawType ? TYPE_ALIASES[rawType] : "text";
    if (!type) return { ok: false, error: `Row ${i + 1}: type "${rawType}" must be rating, yesno, text or choice.` };
    if (type === "choice") {
      const options = (oi >= 0 ? (row[oi] ?? "") : "")
        .split("|")
        .map((o) => o.trim())
        .filter(Boolean);
      if (options.length < 2 || options.length > 12) return { ok: false, error: `Row ${i + 1}: a choice needs 2 to 12 options separated by |.` };
      questions.push({ prompt, type, options });
    } else {
      questions.push({ prompt, type });
    }
  }
  if (questions.length === 0) return { ok: false, error: "No questions found." };
  if (questions.length > MAX_SURVEY_QUESTIONS) return { ok: false, error: `Use ${MAX_SURVEY_QUESTIONS} questions or fewer.` };
  return { ok: true, questions };
}

/** Check a family's answers against the event's questions; returns the snapshot to store. */
export function validateAnswers(
  questions: SurveyQuestion[],
  values: SurveyAnswerValue[],
): { ok: true; answers: SurveyAnswer[] } | { ok: false; error: string } {
  const answers: SurveyAnswer[] = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const raw = values[i] ?? null;
    let value: SurveyAnswerValue = null;
    if (raw !== null && raw !== "") {
      if (q.type === "rating") {
        if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1 || raw > 5) return { ok: false, error: "Pick a rating from 1 to 5." };
        value = raw;
      } else if (q.type === "yesno") {
        if (typeof raw !== "boolean") return { ok: false, error: "Answer yes or no." };
        value = raw;
      } else if (q.type === "choice") {
        if (typeof raw !== "string" || !q.options?.includes(raw)) return { ok: false, error: "Pick one of the options." };
        value = raw;
      } else {
        if (typeof raw !== "string") return { ok: false, error: "Answers must be text." };
        value = raw.trim().slice(0, 2000) || null;
      }
    }
    answers.push({ prompt: q.prompt, type: q.type, value });
  }
  if (answers.every((a) => a.value === null)) return { ok: false, error: "Answer at least one question." };
  return { ok: true, answers };
}
