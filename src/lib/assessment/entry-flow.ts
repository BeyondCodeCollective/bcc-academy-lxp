// src/lib/assessment/entry-flow.ts
//
// LPAT entry flow copy and option sets. Intake fields belong to the Catalyst
// record; confidence fields belong to the LPAT record. Nothing is scored.

export type Option<V extends string | number> = { value: V; label: string };

export const CAREER_STAGE_OPTIONS = [
  { value: "first_job_or_direction", label: "Looking for my first job or still figuring out my direction" },
  { value: "outside_tech_moving_in", label: "Working outside tech and want to move into it" },
  { value: "between_jobs_or_returning", label: "Between jobs or coming back after a break" },
  { value: "in_tech_growing", label: "Already working in tech and want to grow" },
] as const satisfies readonly Option<string>[];

export const DIGITAL_COMFORT_OPTIONS = [
  { value: "new", label: "New to these" },
  { value: "get_by", label: "I can get by" },
  { value: "comfortable", label: "Comfortable" },
  { value: "very_comfortable", label: "Very comfortable, I help others" },
] as const satisfies readonly Option<string>[];

export const TECH_EXPOSURE_OPTIONS = [
  { value: "not_yet", label: "Not yet" },
  { value: "a_little", label: "A little, on my own or in a class" },
  { value: "some", label: "Some, through projects or a job" },
  { value: "technical_role", label: "Yes, in a technical role" },
] as const satisfies readonly Option<string>[];

export const CONFIDENCE_OPTIONS = [
  { value: 1, label: "Not yet confident" },
  { value: 2, label: "A little confident" },
  { value: 3, label: "Fairly confident" },
  { value: 4, label: "Very confident" },
] as const satisfies readonly Option<number>[];

export const ENTRY_COPY = {
  welcome: "A couple quick questions so we can meet you where you are, then your assessment. Nothing here is graded.",
  careerStage: { prompt: "Where are you right now?", helper: "Pick the closest. There is no wrong answer." },
  digitalComfort: { prompt: "How comfortable are you with everyday work tools like email, documents, and video calls?" },
  techExposure: { prompt: "Have you done any hands on tech or coding work?" },
  techHelper: "This just tells us where to meet you. It is not a test.",
  confidenceTraining: "Right now, how confident are you that you can handle the work of a tech training program?",
  confidenceJob: "Right now, how confident are you that you could get hired for a tech role?",
  confidenceHelper: "There are no wrong answers, and this can change. We ask again at the end to see how it moves.",
} as const;

const values = <T extends readonly Option<string | number>[]>(o: T) => o.map((x) => x.value) as (string | number)[];

export const VALID = {
  careerStage: values(CAREER_STAGE_OPTIONS),
  digitalComfort: values(DIGITAL_COMFORT_OPTIONS),
  techExposure: values(TECH_EXPOSURE_OPTIONS),
  confidence: values(CONFIDENCE_OPTIONS),
};

export type EntryFlowAnswers = {
  careerStage: string;
  digitalComfort: string;
  techExposure: string;
  confidenceTraining: number;
  confidenceJob: number;
};
