import type { SubmissionRow } from "@/app/dashboard/track/actions";

// A session's homework can come in numbered parts, each uploaded on its own.
// All parts share the session's one submissions row: files and links carry a
// `part` tag, and each part's written note lives in prompt_responses under
// "Part N", which the admin review and CSV already print as labeled answers.

export const partKey = (part: number) => `Part ${part}`;

/** Whether the learner has put anything in for this part. */
export function submissionHasPart(row: SubmissionRow | null, part: number): boolean {
  if (!row) return false;
  return (
    row.files?.some((f) => f.part === part) ||
    row.links?.some((l) => l.part === part) ||
    !!row.prompt_responses?.[partKey(part)]?.trim()
  );
}
