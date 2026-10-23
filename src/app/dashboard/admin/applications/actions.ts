"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  requireManager,
  allowedProgramIdsForActor,
  allowedTrackSlugsForActor,
} from "../actions-shared";
import { toSlug } from "@/lib/programs/slug";
import { easternToUtc } from "@/lib/utils";
import { sendAcceptanceEmail } from "@/lib/email";
import type { SubmissionStatus } from "@/lib/applications";
import type { SurveyQuestion } from "@/components/survey-fields";

// Same tier as landing pages: every manager, bounded to their own program.
// requireManager (actions-shared) also enforces the preview-as-student block
// and the master bypass — the hand-rolled gate this replaced skipped both.
type Actor = Awaited<ReturnType<typeof requireManager>>;

async function requireReviewer(): Promise<Actor & { email: string }> {
  const actor = await requireManager();
  const { data } = await actor.svc
    .from("students")
    .select("email")
    .eq("id", actor.userId)
    .single<{ email: string | null }>();
  return { ...actor, email: data?.email ?? "" };
}

// An application belongs to a program. A program admin may touch only their
// own; one filed under no program is super-admin territory.
function assertApplicationInActorProgram(actor: Actor, programId: string | null): void {
  const allowed = allowedProgramIdsForActor(actor);
  if (allowed === null) return;
  if (!programId || !allowed.includes(programId)) {
    throw new Error("Not authorized for this application");
  }
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
  const actor = await requireReviewer();
  const { svc } = actor;

  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  const qError = questionErrors(input.questions);
  if (qError) return { ok: false, error: qError };

  // Stamp the owning program so the admin who made it can see it again, the
  // way landing pages do. Null (platform-wide) stays a super-admin thing.
  const allowedIds = allowedProgramIdsForActor(actor);
  const programId = allowedIds === null ? null : actor.programId;
  if (allowedIds !== null && !programId) {
    return { ok: false, error: "Your account isn't attached to a program." };
  }
  // Accepting a submission allowlists the applicant for the linked course, so
  // the course has to be one this admin runs.
  const trackSlug = input.trackSlug.trim();
  const allowedTracks = await allowedTrackSlugsForActor(actor, svc);
  if (trackSlug && allowedTracks && !allowedTracks.has(trackSlug)) {
    return { ok: false, error: "That course isn't in your program." };
  }

  const slug = toSlug(input.title);
  if (!slug) return { ok: false, error: "Could not derive a slug from the title." };

  const { error } = await svc.from("applications").insert({
    slug,
    program_id: programId,
    title: input.title.trim(),
    description: input.description.trim() || null,
    track_slug: trackSlug || null,
    notify_email: input.notifyEmail.trim() || null,
    // End of day Eastern; easternToUtc follows DST so a winter deadline
    // doesn't close an hour early.
    closes_at: input.closesAt ? easternToUtc(input.closesAt, "23:59") : null,
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

export type ApplicationUpdateInput = ApplicationInput & {
  /** Ids of questions switched off; kept in `questions` so past answers still read. */
  hiddenQuestions: string[];
};

/** Edit an existing application. The slug (the public URL) never changes, and
 *  every existing question must stay in the list: turn one off instead of
 *  deleting it, or the answers already submitted lose their labels. */
export async function updateApplicationAction(
  slug: string,
  input: ApplicationUpdateInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await requireReviewer();
  const { svc } = actor;

  const { data: app } = await svc
    .from("applications")
    .select("program_id, track_slug, questions")
    .eq("slug", slug)
    .maybeSingle<{ program_id: string | null; track_slug: string | null; questions: SurveyQuestion[] | null }>();
  if (!app) return { ok: false, error: "Application not found." };
  assertApplicationInActorProgram(actor, app.program_id);

  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  if (!input.questions.length) return { ok: false, error: "An application needs at least one question." };
  // likert / file / month-year questions carry no builder fields; they are
  // kept as stored, so only the kinds the builder draws are checked here.
  const builderKinds = new Set(["text", "radio", "multi-select", "select", "date", "consent"]);
  const editable = input.questions.filter((q) => builderKinds.has(q.type));
  const qError = editable.length ? questionErrors(editable) : null;
  if (qError) return { ok: false, error: qError };

  const kept = new Set(input.questions.map((q) => q.id));
  if (kept.size !== input.questions.length) return { ok: false, error: "Duplicate question ids — reload and try again." };
  if ((app.questions ?? []).some((q) => !kept.has(q.id))) {
    return { ok: false, error: "Existing questions can't be deleted. Turn them off instead." };
  }

  const trackSlug = input.trackSlug.trim();
  if (trackSlug && trackSlug !== app.track_slug) {
    const allowedTracks = await allowedTrackSlugsForActor(actor, svc);
    if (allowedTracks && !allowedTracks.has(trackSlug)) {
      return { ok: false, error: "That course isn't in your program." };
    }
  }

  const { error } = await svc
    .from("applications")
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
      track_slug: trackSlug || null,
      notify_email: input.notifyEmail.trim() || null,
      closes_at: input.closesAt ? easternToUtc(input.closesAt, "23:59") : null,
      questions: input.questions,
      hidden_questions: input.hiddenQuestions.filter((id) => kept.has(id)),
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug);
  if (error) {
    console.error("[updateApplicationAction] failed:", error);
    return { ok: false, error: "Could not save the application. Please try again." };
  }

  revalidatePath("/dashboard/admin/applications");
  revalidatePath(`/dashboard/admin/applications/${slug}`);
  revalidatePath(`/apply/${slug}`);
  return { ok: true };
}

export async function setApplicationOpenAction(
  slug: string,
  open: boolean,
): Promise<{ ok: boolean }> {
  const actor = await requireReviewer();
  const { svc } = actor;
  const { data: app } = await svc
    .from("applications")
    .select("program_id")
    .eq("slug", slug)
    .maybeSingle<{ program_id: string | null }>();
  if (!app) return { ok: false };
  assertApplicationInActorProgram(actor, app.program_id);
  const { error } = await svc
    .from("applications")
    .update({ open, updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) {
    console.error("[setApplicationOpenAction] failed:", error);
    return { ok: false };
  }
  revalidatePath("/dashboard/admin/applications");
  revalidatePath(`/dashboard/admin/applications/${slug}`);
  revalidatePath(`/apply/${slug}`);
  return { ok: true };
}

/** Review decision. Accepting also allowlists the applicant for the linked
 *  course, so they can sign in the moment they get the news — and they start
 *  showing up on the Signups page like any other registrant. `notify: false`
 *  accepts and allowlists without sending the acceptance email, for staff who
 *  tell people themselves. */
export async function setSubmissionStatusAction(
  submissionId: string,
  status: SubmissionStatus,
  { notify = true }: { notify?: boolean } = {},
): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireReviewer();
  const { svc, email: reviewer } = actor;

  const { data: sub } = await svc
    .from("application_submissions")
    .select("email, full_name, status, application_id, applications(slug, title, track_slug, program_id)")
    .eq("id", submissionId)
    .maybeSingle<{
      email: string;
      full_name: string | null;
      status: SubmissionStatus;
      application_id: string;
      applications: {
        slug: string;
        title: string;
        track_slug: string | null;
        program_id: string | null;
      } | null;
    }>();
  if (!sub) return { ok: false, error: "Submission not found." };
  assertApplicationInActorProgram(actor, sub.applications?.program_id ?? null);
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
  if (status === "accepted" && notify && !wasAccepted && sub.applications) {
    const applicationTitle = sub.applications.title;
    let joinUrl: string | undefined;
    if (trackSlug) {
      // track_overrides is keyed (program_id, track_slug) — scope by the
      // application's program when it has one, so a slug shared across
      // programs can't send the applicant to the wrong door.
      let query = svc
        .from("track_overrides")
        .select("programs(slug)")
        .eq("track_slug", trackSlug);
      if (sub.applications.program_id) {
        query = query.eq("program_id", sub.applications.program_id);
      }
      const { data: track } = await query
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
