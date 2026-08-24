// Drafts a NEW course from a plain-English description. The inverse of
// parse.ts: there the model may only transcribe what the source states; here
// inventing the curriculum arc is the whole job. Logistics stay strict — a
// generated start date or instructor that was never stated would look
// authoritative and be wrong, so those still go to `missing`.
//
// The output is the same CourseDraft the importer produces, shown to an admin
// for review before anything is written. Nothing here writes to the database.

import { generateObject } from "ai";
import {
  SCHEMA,
  draftModelSettings,
  type CourseDraft,
  type DraftModelOptions,
} from "./parse";

// Same gateway routing as the tutor (src/app/api/tutor/route.ts).
const MODEL = "google/gemini-2.5-flash";

const SYSTEM = `You design courses for BCC Academy, a learning platform serving beginners through wisdom learners. Given a plain-English description of a program, draft the complete course.

YOUR JOB — invent these well:
- A clear course name (and a shortName under 30 chars).
- A learner-facing description: 2-4 warm, concrete sentences. No marketing hype, no jargon. Never use em dashes.
- 3-6 learning objectives: specific "you'll be able to…" outcomes, not topic labels.
- One session per unit, each with a specific topic. Topics must build week over week into a real arc: fundamentals first, a capstone or synthesis at the end. sessionTitle/sessionSubtitle introduce session 1.

NOT YOUR JOB — never invent logistics:
- If the description does not state a start date, meeting days/times, instructor, or session length, leave those fields empty (or 0) AND list their names in "missing". A plausible-looking guessed date is worse than a blank.
- If it DOES state them, expand the cadence into one dated entry per session: date YYYY-MM-DD, time HH:MM 24-hour Eastern (America/New_York). If a time is given with no timezone, treat it as Eastern and set timezoneStated to false; if a timezone is named, convert to Eastern and set timezoneStated to true.
- If a length is stated ("6 weeks", "3-day camp"), honor it exactly. Otherwise pick a sensible session count for the scope described and use it consistently (totalWeeks = session count).
- unitLabel: "Week" for weekly cohorts, "Day" for multi-day camps, "Session" otherwise.
- Even when dates are unknown, still return one sessions[] entry per unit with the topic filled in and date/time left empty — the admin fills the schedule during review.`;

export async function generateCourseDraft(
  description: string,
  opts?: DraftModelOptions,
): Promise<CourseDraft> {
  const { object } = await generateObject({
    ...draftModelSettings(opts, MODEL),
    schema: SCHEMA,
    system: SYSTEM,
    prompt: `Draft a course from this program description:\n\n${description.slice(0, 20000)}`,
  });
  return object;
}
