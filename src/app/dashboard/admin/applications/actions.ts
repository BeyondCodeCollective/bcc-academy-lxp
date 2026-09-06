"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { canSwitchPrograms } from "@/lib/roles";
import { toSlug } from "@/lib/programs/slug";
import { sendAcceptanceEmail } from "@/lib/email";
import type { SubmissionStatus } from "@/lib/applications";
import type { SurveyQuestion } from "@/components/survey-fields";

// Same tier as landing pages: applications are public marketing surfaces.
async function requireReviewer(): Promise<{
  svc: ReturnType<typeof createServiceClient>;
  email: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (!canSwitchPrograms(student?.role ?? "")) throw new Error("Not authorized");
  return { svc, email: user.email ?? "" };
}

export type ApplicationInput = {
  title: string;
  description: string;
  trackSlug: string;
  notifyEmail: string;
  closesAt: string; // YYYY-MM-DD or ""
  questions: SurveyQuestion[];
};

function questionErrors(questions: SurveyQuestion[]): string | null {
  if (!questions.length) return "Add at least one question.";
  const ids = new Set<string>();
  for (const q of questions) {
    if (!q.label?.trim()) return "Every question needs a label.";
    if (ids.has(q.id)) return "Duplicate question ids — reload and try again.";
    ids.add(q.id);
    if (
      (q.type === "radio" || q.type === "multi-select" || q.type === "select") &&
      (!("options" in q) || q.options.length < 2)
    ) {
      return `"${q.label}" needs at least two options.`;
    }
  }
  return null;
}

export async function createApplicationAction(
  input: ApplicationInput,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const { svc } = await requireReviewer();

  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  const qError = questionErrors(input.questions);
  if (qError) return { ok: false, error: qError };

  const slug = toSlug(input.title);
  if (!slug) return { ok: false, error: "Could not derive a slug from the title." };

  const { error } = await svc.from("applications").insert({
    slug,
    title: input.title.trim(),
    description: input.description.trim() || null,
    track_slug: input.trackSlug.trim() || null,
    notify_email: input.notifyEmail.trim() || null,
    // End of day Eastern, matching how the platform treats course dates.
    closes_at: input.closesAt ? `${input.closesAt}T23:59:59-04:00` : null,
    questions: input.questions,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `An application with this title already exists (slug: ${slug}).` };
    }
    console.error("[createApplicationAction] failed:", error);
    return { ok: false, error: "Could not create the application. Please try again." };
  }

  revalidatePath("/dashboard/admin/applications");
  return { ok: true, slug };
}

export async function setApplicationOpenAction(
  slug: string,
  open: boolean,
): Promise<{ ok: boolean }> {
  const { svc } = await requireReviewer();
  await svc
    .from("applications")
    .update({ open, updated_at: new Date().toISOString() })
    .eq("slug", slug);
  revalidatePath("/dashboard/admin/applications");
  revalidatePath(`/dashboard/admin/applications/${slug}`);
  revalidatePath(`/apply/${slug}`);
  return { ok: true };
}

/** Review decision. Accepting also allowlists the applicant for the linked
 *  course, so they can sign in the moment they get the news — and they start
 *  showing up on the Signups page like any other registrant. */
export async function setSubmissionStatusAction(
  submissionId: string,
  status: SubmissionStatus,
): Promise<{ ok: boolean; error?: string }> {
  const { svc, email: reviewer } = await requireReviewer();

  const { data: sub } = await svc
    .from("application_submissions")
    .select("email, full_name, status, application_id, applications(slug, title, track_slug)")
    .eq("id", submissionId)
    .maybeSingle<{
      email: string;
      full_name: string | null;
      status: SubmissionStatus;
      application_id: string;
      applications: { slug: string; title: string; track_slug: string | null } | null;
    }>();
  if (!sub) return { ok: false, error: "Submission not found." };
  const wasAccepted = sub.status === "accepted";

  const { error } = await svc
    .from("application_submissions")
    .update({
      status,
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);
  if (error) {
    console.error("[setSubmissionStatusAction] failed:", error);
    return { ok: false, error: "Could not update the submission." };
  }

  const trackSlug = sub.applications?.track_slug;
  if (status === "accepted" && trackSlug) {
    const { error: allowError } = await svc.from("allowed_signup_emails").upsert(
      { email: sub.email, track_slug: trackSlug },
      { onConflict: "email,track_slug", ignoreDuplicates: true },
    );
    if (allowError) {
      console.error("[setSubmissionStatusAction] allowlist failed:", allowError);
    }
  }

  // The acceptance email, once — flipping someone accepted → waitlisted →
  // accepted again shouldn't congratulate them twice.
  if (status === "accepted" && !wasAccepted && sub.applications) {
    const applicationTitle = sub.applications.title;
    let joinUrl: string | undefined;
    if (trackSlug) {
      const { data: track } = await svc
        .from("track_overrides")
        .select("programs(slug)")
        .eq("track_slug", trackSlug)
        .limit(1)
        .maybeSingle<{ programs: { slug: string } | null }>();
      if (track?.programs?.slug) {
        joinUrl = `https://bccacademy.io/join/${track.programs.slug}?track=${trackSlug}`;
      }
    }
    const to = sub.email;
    const name = sub.full_name ?? "";
    after(async () => {
      await sendAcceptanceEmail({ to, name, applicationTitle, joinUrl });
    });
  }

  if (sub.applications?.slug) {
    revalidatePath(`/dashboard/admin/applications/${sub.applications.slug}`);
  }
  return { ok: true };
}
