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

// Deduped across a single request via React `cache`, so the dashboard layout
// and dashboard page share one round-trip instead of each fetching session +
// student independently.
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, email, first_name, last_name, avatar_url, role, cohort_id, onboarding_completed, welcome_seen_at, cohorts(id, name, display_name, start_date, end_date, total_weeks, created_at)"
    )
    .eq("id", session.user.id)
    .maybeSingle<SessionStudent>();

  return {
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    student: student ?? null,
  };
});
