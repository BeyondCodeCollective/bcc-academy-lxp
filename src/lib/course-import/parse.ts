// Parses pasted event copy into a draft course. The output is a DRAFT — it is
// shown to an admin for review before anything is written. Nothing here writes
// to the database.

import { generateObject, jsonSchema } from "ai";
import type { ImportSource } from "./source";

// Same gateway routing as the tutor (src/app/api/tutor/route.ts).
const MODEL = "google/gemini-2.5-flash";

/** Every course we run is Eastern. Stored as IANA so the offset follows DST —
 *  a fixed "EST" would put every summer course an hour off. */
export const COURSE_TIMEZONE = "America/New_York";

export type DraftSession = {
  week: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, 24h, Eastern
  topic: string;
  durationMinutes: number;
};

export type CourseDraft = {
  name: string;
  shortName: string;
  description: string;
  instructor: string;
  startDate: string;
  totalWeeks: number;
  sessionsPerWeek: number;
  unitLabel: string;
  sessionTimes: string[];
  sessions: DraftSession[];
  objectives: string[];
  sessionTitle: string;
  sessionSubtitle: string;
  /** Fields the source never stated. Rendered as blanks the admin must fill,
   *  never silently defaulted to a plausible-looking value. */
  missing: string[];
  timezoneStated: boolean;
};

export const SCHEMA = jsonSchema<{
  name: string;
  shortName: string;
  description: string;
  instructor: string;
  startDate: string;
  totalWeeks: number;
  sessionsPerWeek: number;
  unitLabel: string;
  sessionTimes: string[];
  sessions: DraftSession[];
  objectives: string[];
  sessionTitle: string;
  sessionSubtitle: string;
  missing: string[];
  timezoneStated: boolean;
}>({
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "shortName",
    "description",
    "instructor",
    "startDate",
    "totalWeeks",
    "sessionsPerWeek",
    "unitLabel",
    "sessionTimes",
    "sessions",
    "objectives",
    "sessionTitle",
    "sessionSubtitle",
    "missing",
    "timezoneStated",
  ],
  properties: {
    name: { type: "string", description: "Full course title as written in the source." },
    shortName: { type: "string", description: "Under 30 chars, for nav and calendar chips." },
    description: { type: "string", description: "Learner-facing overview. Keep the source's voice." },
    instructor: { type: "string", description: "Instructor or host. Empty string if not stated." },
    startDate: { type: "string", description: "YYYY-MM-DD of the first session. Empty string if not stated." },
    totalWeeks: { type: "integer", description: "Number of sessions/units. 1 for a one-day event." },
    sessionsPerWeek: { type: "integer" },
    unitLabel: { type: "string", description: '"Session", "Week", or "Day".' },
    sessionTimes: {
      type: "array",
      items: { type: "string" },
      description: 'Display strings, e.g. "Mondays 11:00 AM-12:30 PM ET".',
    },
    sessions: {
      type: "array",
      description:
        "One entry per session. REQUIRED — a course with no sessions never appears on the calendar.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["week", "date", "time", "topic", "durationMinutes"],
        properties: {
          week: { type: "integer", description: "1-indexed." },
          date: { type: "string", description: "YYYY-MM-DD." },
          time: { type: "string", description: "HH:MM 24-hour, Eastern." },
          topic: { type: "string" },
          durationMinutes: { type: "integer" },
        },
      },
    },
    objectives: {
      type: "array",
      items: { type: "string" },
      description: "Learning objectives — the 'what you'll learn' bullets.",
    },
    sessionTitle: { type: "string" },
    sessionSubtitle: { type: "string", description: "One line. Empty string if none." },
    missing: {
      type: "array",
      items: { type: "string" },
      description:
        "Field names the source never stated (e.g. 'startDate', 'instructor'). Do not invent values for these.",
    },
    timezoneStated: {
      type: "boolean",
      description: "True only if the source explicitly named a timezone.",
    },
  },
});

const SYSTEM = `You convert event descriptions into structured course data for a learning platform.

Rules:
- Use ONLY what the source says. Never invent a date, time, instructor, or duration.
- If the source does not state something, leave the field empty (or 0) AND list its name in "missing".
- All times are Eastern (America/New_York). If the source gives a time with no timezone, treat it as Eastern and set timezoneStated to false. If it names a timezone, convert to Eastern and set timezoneStated to true.
- If the source gives a time in another zone (e.g. "8:00 AM PDT"), convert it to Eastern.
- "sessions" must contain one entry per session with a real date. This drives the calendar; an empty array makes the course invisible.
- For a recurring course, expand the cadence into individual dated sessions.
- Keep the source's wording in description and objectives. Do not add marketing language.`;


/** Model settings, so an eval run can pin them without changing production.
 *  Omitted fields keep exactly the values the product ships with. */
export type DraftModelOptions = {
  model?: string;
  /** 0 for reproducible eval runs. Unset in production, as it always was. */
  temperature?: number;
  seed?: number;
};

/** Spread into generateObject. Only includes what the caller actually set, so
 *  the default call is byte-for-byte the one that shipped before. */
export function draftModelSettings(opts: DraftModelOptions | undefined, fallbackModel: string) {
  return {
    model: opts?.model ?? fallbackModel,
    ...(opts?.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(opts?.seed !== undefined ? { seed: opts.seed } : {}),
  };
}

export async function parseCourseDraft(
  source: ImportSource,
  opts?: DraftModelOptions,
): Promise<CourseDraft> {
  // Structured facts from Eventbrite beat model inference for the fields that
  // hurt most when wrong, so hand them over as ground truth.
  const factBlock =
    source.kind === "eventbrite"
      ? `\n\nAUTHORITATIVE FACTS (from the Eventbrite API — trust these over the prose):
title: ${source.facts.name}
start (local): ${source.facts.startLocal}
end (local): ${source.facts.endLocal}
timezone: ${source.facts.timezone}`
      : "";

  // PDFs go to the model as raw bytes — Gemini reads them natively, so the
  // layout (tables, schedules) survives where a text dump would scramble it.
  const { object } = await generateObject({
    ...draftModelSettings(opts, MODEL),
    schema: SCHEMA,
    system: SYSTEM,
    ...(source.kind === "pdf"
      ? {
          messages: [
            {
              role: "user" as const,
              content: [
                { type: "text" as const, text: `Convert this into course data.${factBlock}` },
                {
                  type: "file" as const,
                  data: source.dataBase64,
                  mediaType: "application/pdf",
                  filename: source.fileName,
                },
              ],
            },
          ],
        }
      : {
          prompt: `Convert this into course data.${factBlock}\n\nSOURCE:\n${source.text.slice(0, 20000)}`,
        }),
  });

  // The Eventbrite API is authoritative for time; don't let the model's copy of
  // it survive if they disagree.
  if (source.kind === "eventbrite") {
    object.timezoneStated = true;
    if (!object.name) object.name = source.facts.name;
  }

  return object;
}
