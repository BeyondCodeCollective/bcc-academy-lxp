import type { SurveyQuestion } from "@/components/survey-fields";

/**
 * Heading for one exported response column. Response keys are question ids
 * (`q3`) or an id plus a statement/side suffix for likert grids (`q5_Statement`,
 * `q6_Statement_now`); the heading is the question's label with the suffix
 * appended. Keys the schema doesn't know (full_name, email, ...) pass through.
 */
export function surveyColumnHeading(key: string, schema: SurveyQuestion[] | null): string {
  let best: SurveyQuestion | undefined;
  for (const q of schema ?? []) {
    if (key !== q.id && !key.startsWith(`${q.id}_`)) continue;
    if (!best || q.id.length > best.id.length) best = q;
  }
  if (!best) return key;
  const suffix = key.slice(best.id.length).replace(/^_/, "").replace(/_/g, " / ");
  return suffix ? `${best.label} / ${suffix}` : best.label;
}
