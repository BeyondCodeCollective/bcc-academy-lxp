import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Cohort } from "@/lib/types";

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
    .select(
      "id, email, first_name, last_name, avatar_url, role, cohort_id, onboarding_completed, welcome_seen_at, cohorts(id, name, display_name, start_date, end_date, total_weeks, created_at)"
    )
    .eq("id", session.user.id)
    .maybeSingle<SessionStudent>();

  const result = {
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    student: student ?? null,
  };
  _profileStore.set(userId, { data: result, ts: Date.now() });
  return result;
});
