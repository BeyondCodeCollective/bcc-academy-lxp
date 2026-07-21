import type { SupabaseClient } from "@supabase/supabase-js";

// Demographic fields collected inside a survey's `responses` JSON are needed
// for grant reporting, which reads flat `students` columns. This copies them up
// onto the student record so exports and the People page can see them.
//
// Fill-only, never clobber: a later survey that omits a field (or a blank
// answer) must not wipe a value an earlier survey captured. So we only write a
// column that is currently null/empty, and only from a non-empty answer.

type ProfileAnswers = {
  zip_code?: unknown;
  date_of_birth?: unknown;
  state?: unknown;
};

const ZIP5 = /^\d{5}$/;

function cleanStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

/** YYYY-MM-DD or null. Accepts what the survey date inputs emit. */
function cleanDate(v: unknown): string | null {
  const s = cleanStr(v);
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function cleanZip(v: unknown): string | null {
  const s = cleanStr(v);
  if (!s) return null;
  const digits = s.replace(/\D/g, "").slice(0, 5);
  return ZIP5.test(digits) ? digits : null;
}

/**
 * Promote zip / date_of_birth / state from a survey response onto the student
 * row. `responses` is the raw survey blob. Silent no-op when the student has no
 * account yet (public surveys taken before signup) or the row read fails —
 * this must never break a survey submission.
 */
export async function promoteProfileFields(
  svc: SupabaseClient,
  studentId: string,
  responses: Record<string, unknown>,
): Promise<void> {
  const answers = responses as ProfileAnswers;
  const incoming: Record<string, string> = {};
  const zip = cleanZip(answers.zip_code);
  const dob = cleanDate(answers.date_of_birth);
  const state = cleanStr(answers.state);
  if (zip) incoming.zip = zip;
  if (dob) incoming.date_of_birth = dob;
  if (state) incoming.state = state.toUpperCase().slice(0, 32);
  if (Object.keys(incoming).length === 0) return;

  const { data: current, error } = await svc
    .from("students")
    .select("zip, date_of_birth, state")
    .eq("id", studentId)
    .maybeSingle<{ zip: string | null; date_of_birth: string | null; state: string | null }>();
  if (error || !current) return;

  // Only fill columns that are currently empty.
  const patch: Record<string, string> = {};
  if (incoming.zip && !current.zip) patch.zip = incoming.zip;
  if (incoming.date_of_birth && !current.date_of_birth) patch.date_of_birth = incoming.date_of_birth;
  if (incoming.state && !current.state) patch.state = incoming.state;
  if (Object.keys(patch).length === 0) return;

  const { error: updErr } = await svc.from("students").update(patch).eq("id", studentId);
  if (updErr) {
    console.error("promoteProfileFields update failed:", {
      code: updErr.code,
      message: updErr.message,
    });
  }
}

/** Resolve a student id from a lowercased email, or null. */
export async function studentIdByEmail(
  svc: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data } = await svc
    .from("students")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}
