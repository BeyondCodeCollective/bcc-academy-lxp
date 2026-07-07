import { cache } from "react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { determineRole } from "@/lib/auth/admins";
import type { Cohort } from "@/lib/types";

// Single source for the student columns the session needs — reused by the
// normal read and the self-heal re-read so they never drift.
const STUDENT_SELECT =
  "id, email, first_name, last_name, avatar_url, role, cohort_id, onboarding_completed, welcome_seen_at, cohorts(id, name, display_name, start_date, end_date, total_weeks, created_at)";

export type SessionStudent = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: "student" | "instructor" | "admin" | "super_admin" | null;
  cohort_id: string | null;
  onboarding_completed: boolean | null;
  welcome_seen_at: string | null;
  cohorts: Cohort | null;
};

export type SessionContext = {
  userId: string;
  userEmail: string | null;
  student: SessionStudent | null;
};

/**
 * Cross-request TTL cache so the dashboard layout skips the students table
 * query on every navigation. The student profile (name, role, avatar) barely
 * changes within a session; a 60s window of staleness is acceptable for a
 * dramatically faster click-through experience.
 */
const _profileStore = new Map<string, { data: SessionContext; ts: number }>();
const _PROFILE_TTL = 60_000;

// Deduped across a single request via React `cache`, so the dashboard layout
// and dashboard page share one round-trip instead of each fetching session +
// student independently.
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  // Check cross-request cache before hitting the students table.
  const userId = session.user.id;
  const cached = _profileStore.get(userId);
  if (cached && Date.now() - cached.ts < _PROFILE_TTL) {
    return cached.data;
  }

  const { data: student } = await supabase
    .from("students")
    .select(STUDENT_SELECT)
    .eq("id", session.user.id)
    .maybeSingle<SessionStudent>();

  // Self-heal: a valid session with no profile row is a "ghost" — the user is
  // logged in but lands nowhere ("no student record"). This can happen if the
  // auth-callback upsert ever fails or an auth user is created out-of-band.
  // Guarantee the invariant "authenticated ⇒ profile exists" right here, the
  // chokepoint every dashboard surface flows through. deferred-setup refines
  // cohort/program/enrollment afterwards; role is the email-list truth.
  const healed = !student ? await ensureProfile(session.user.id, session.user.email) : student;

  const result = {
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    student: healed ?? null,
  };
  _profileStore.set(userId, { data: result, ts: Date.now() });

  // Bump last_activity_at so admins can distinguish active learners from
  // bouncers — unlike last_seen_at (written only on login in the auth
  // callback), this advances as the learner navigates the dashboard. We only
  // reach here on a cache miss, so this fires at most once per _PROFILE_TTL
  // (60s) per user. Fire-and-forget via the service client; never block.
  if (healed) {
    void createServiceClient()
      .from("students")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", userId);
  }

  return result;
});

/**
 * Drop a user's cached profile so the next getSessionContext re-reads the
 * students table. Call after mutating your own row (e.g. saving your name)
 * so a page reload doesn't see stale data for up to _PROFILE_TTL — without
 * this, the name-capture modal reappears blank right after "Continue".
 */
export function bustProfileCache(userId: string): void {
  _profileStore.delete(userId);
}

/**
 * Create the missing students row for an authenticated user. Uses the service
 * client (RLS would block a self-insert) and defaults the home program to
 * Catalyst, the hub — cookies + deferred-setup correct the real program/cohort
 * on the same request. Idempotent: ignoreDuplicates means a racing writer wins
 * harmlessly. Returns the resulting row (or null if even the program lookup
 * fails, leaving the caller no worse off than before).
 */
async function ensureProfile(
  userId: string,
  email: string | null | undefined,
): Promise<SessionStudent | null> {
  const admin = createServiceClient();
  const { data: hub } = await admin
    .from("programs")
    .select("id")
    .eq("slug", "catalyst")
    .maybeSingle();
  if (!hub?.id) return null;

  await admin.from("students").upsert(
    {
      id: userId,
      email: email ?? "",
      first_name: "",
      last_name: "",
      role: determineRole(email ?? ""),
      program_id: hub.id,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  const { data } = await admin
    .from("students")
    .select(STUDENT_SELECT)
    .eq("id", userId)
    .maybeSingle<SessionStudent>();
  return data ?? null;
}
