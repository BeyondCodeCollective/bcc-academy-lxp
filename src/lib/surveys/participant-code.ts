// Participant codes: what staff see in place of a learner's identity on
// surveys flagged `participantCoded` (and always on the per-session pulse
// check). The code lives on students.participant_code and is stamped onto each
// response row by a DB trigger; see 20261104000000_participant_codes.sql.

import { getEveryProgramConfig } from "@/lib/programs";
import { PLATFORM_AUTH_SURVEYS } from "./platform";

/** Shown when a row predates its code (only possible before the backfill). */
export const NO_PARTICIPANT_CODE = "No code";

// Answer keys that identify a person on their own or in combination. ZIP plus
// birthday re-identifies most people in a 20-person cohort, so they go too.
const IDENTIFYING_KEYS = new Set([
  "full_name",
  "first_name",
  "last_name",
  "preferred_name",
  "email",
  "phone",
  "zip",
  "zip_code",
  "date_of_birth",
  "dob",
  "address",
]);

export function isParticipantCodedSurvey(surveyId: string): boolean {
  if (PLATFORM_AUTH_SURVEYS[surveyId]?.participantCoded) return true;
  return getEveryProgramConfig().some((p) =>
    (p.surveys ?? []).some((s) => s.id === surveyId && s.participantCoded),
  );
}

type Identified = {
  full_name: string;
  email: string;
  responses: Record<string, unknown>;
  participant_code?: string;
};

/** Replace who-said-it with the participant code. Strips identifying answers
 *  too, so a "Full name" question in the form can't undo the anonymity. */
export function withParticipantCode<T extends Identified>(
  row: T,
  code: string | null,
): T & { participant_code: string } {
  const label = code || NO_PARTICIPANT_CODE;
  const responses = Object.fromEntries(
    Object.entries(row.responses ?? {}).filter(([k]) => !IDENTIFYING_KEYS.has(k)),
  );
  return { ...row, full_name: label, email: "", participant_code: label, responses };
}
