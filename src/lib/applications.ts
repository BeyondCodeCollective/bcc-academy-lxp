// DB-driven applications — one row per application form, rendered by the
// generic /apply/[slug] template. Questions reuse the survey renderer's
// SurveyQuestion shape, so the same components draw and validate them.

import { createServiceClient } from "@/lib/supabase/server";
import type { SurveyQuestion } from "@/components/survey-fields";

export type Application = {
  id: string;
  slug: string;
  programId: string | null;
  trackSlug: string | null;
  title: string;
  description: string | null;
  questions: SurveyQuestion[];
  open: boolean;
  closesAt: string | null;
  notifyEmail: string | null;
  createdAt: string;
};

export type SubmissionStatus = "new" | "accepted" | "declined" | "waitlisted";

export type ApplicationSubmission = {
  id: string;
  applicationId: string;
  email: string;
  fullName: string | null;
  answers: Record<string, unknown>;
  status: SubmissionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

function rowToApplication(row: Record<string, unknown>): Application {
  return {
    id: row.id as string,
    slug: row.slug as string,
    programId: (row.program_id as string | null) ?? null,
    trackSlug: (row.track_slug as string | null) ?? null,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    questions: (row.questions as SurveyQuestion[] | null) ?? [],
    open: Boolean(row.open),
    closesAt: (row.closes_at as string | null) ?? null,
    notifyEmail: (row.notify_email as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export function rowToSubmission(row: Record<string, unknown>): ApplicationSubmission {
  return {
    id: row.id as string,
    applicationId: row.application_id as string,
    email: row.email as string,
    fullName: (row.full_name as string | null) ?? null,
    answers: (row.answers as Record<string, unknown> | null) ?? {},
    status: (row.status as SubmissionStatus) ?? "new",
    reviewedBy: (row.reviewed_by as string | null) ?? null,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function getApplicationBySlug(slug: string): Promise<Application | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("applications")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data ? rowToApplication(data as Record<string, unknown>) : null;
}

export async function listApplications(): Promise<Application[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });
  return ((data as Record<string, unknown>[]) ?? []).map(rowToApplication);
}

/** Server-side required/consent enforcement for public submissions. The
 *  client runs the survey renderer's isPageValid, but that lives in a client
 *  module and a direct POST skips the client entirely — without this check a
 *  crafted request could store blank answers or an unticked consent. */
export function answersSatisfyRequired(
  questions: SurveyQuestion[],
  answers: Record<string, unknown>,
): boolean {
  for (const q of questions) {
    if (!q.required) continue;
    const val = answers[q.id];
    if (q.type === "consent") {
      // Consent means an affirmative true — anything else is not consent.
      if (val !== true) return false;
    } else if (q.type === "multi-select") {
      if (!Array.isArray(val) || val.length === 0) return false;
    } else if (typeof val === "string") {
      if (!val.trim()) return false;
    } else if (val == null || val === false) {
      return false;
    }
  }
  return true;
}

/** An application is accepting submissions when it's open and (if a deadline
 *  is set) the deadline hasn't passed. */
export function isAccepting(app: Application): boolean {
  if (!app.open) return false;
  if (app.closesAt && new Date(app.closesAt).getTime() < Date.now()) return false;
  return true;
}
