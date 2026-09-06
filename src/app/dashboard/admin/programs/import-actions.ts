"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasCapability } from "@/lib/roles";
import { getProgramBySlug } from "@/lib/programs";
import { toSlug } from "@/lib/programs/slug";
import { easternToUtc } from "@/lib/utils";
import { ensureLandingForCourse } from "@/lib/landing-pages";
import { resolveSource } from "@/lib/course-import/source";
import { extractFileSource, MAX_FILE_BYTES } from "@/lib/course-import/file";
import { parseCourseDraft, type CourseDraft } from "@/lib/course-import/parse";
import { generateCourseDraft } from "@/lib/course-import/generate";
import { resolveHeroPhoto, generateCoverGraphic } from "@/lib/course-import/hero";
import { toSurveyQuestion, type DraftQuestion } from "@/lib/application-questions";

// Same three programs the manual builder allows — they're the ones that surface
// on the bccacademy.io hub. See COURSE_PROGRAM_SLUGS in ./actions.ts.
const COURSE_PROGRAM_SLUGS = ["catalyst", "beyond-code-centers", "atg", "bgc", "forte"] as const;

type Actor = {
  svc: ReturnType<typeof createServiceClient>;
  userId: string;
  role: string;
  programId: string | null;
};

// Admins may import; super-admins may file the course under any hub program,
// while a plain admin is confined to the program they belong to. Instructors
// are excluded — they can reach the admin panel but not create courses.
async function requireCourseCreator(): Promise<Actor> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role, program_id")
    .eq("id", user.id)
    .single<{ role: string; program_id: string | null }>();

  const role = student?.role ?? "";
  if (!hasCapability(role, "manage_students")) {
    throw new Error("Not authorized");
  }

  return { svc, userId: user.id, role, programId: student?.program_id ?? null };
}

export type PreviewResult =
  | { success: true; draft: CourseDraft; attendeeEmails: string[]; coverImageUrl?: string }
  | { success: false; error: string; needsPaste?: boolean };

/** Step 1: read the link (or text) and parse it. Writes nothing. */
export async function previewCourseImportAction(
  input: string,
): Promise<PreviewResult> {
  await requireCourseCreator();

  const resolved = await resolveSource(input);
  if (!resolved.ok) {
    return { success: false, error: resolved.error, needsPaste: resolved.needsPaste };
  }

  let draft: CourseDraft;
  try {
    draft = await parseCourseDraft(resolved.source);
  } catch (err) {
    console.error("[previewCourseImportAction] parse failed:", err);
    return {
      success: false,
      error: "Could not read that source. Try pasting the text directly.",
    };
  }

  return {
    success: true,
    draft,
    attendeeEmails:
      resolved.source.kind === "eventbrite" ? resolved.source.facts.attendeeEmails : [],
    coverImageUrl:
      resolved.source.kind === "eventbrite"
        ? resolved.source.facts.coverImageUrl
        : undefined,
  };
}

/** Step 1, file flavor: upload a PDF/DOCX/PPTX and parse it. Writes nothing.
 *  Takes FormData because server actions can't take a File directly. */
export async function previewCourseFileImportAction(
  formData: FormData,
): Promise<PreviewResult> {
  await requireCourseCreator();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a file first." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { success: false, error: "That file is over 15MB. Export a smaller version or paste the text." };
  }

  const resolved = await extractFileSource(file.name, Buffer.from(await file.arrayBuffer()));
  if (!resolved.ok) {
    return { success: false, error: resolved.error, needsPaste: resolved.needsPaste };
  }

  let draft: CourseDraft;
  try {
    draft = await parseCourseDraft(resolved.source);
  } catch (err) {
    console.error("[previewCourseFileImportAction] parse failed:", err);
    return {
      success: false,
      error: "Could not read that file. Try pasting the text directly.",
    };
  }

  return { success: true, draft, attendeeEmails: [] };
}

/** Step 1 of the generator: describe the program, get a reviewable draft.
 *  Writes nothing — the draft flows into the same review step and
 *  createCourseFromDraftAction as an import. */
export async function generateCourseDraftAction(
  description: string,
): Promise<PreviewResult> {
  await requireCourseCreator();

  if (!description.trim()) {
    return { success: false, error: "Describe the program first." };
  }

  try {
    const draft = await generateCourseDraft(description);
    return { success: true, draft, attendeeEmails: [] };
  } catch (err) {
    console.error("[generateCourseDraftAction] generation failed:", err);
    return {
      success: false,
      error: "Could not draft the program. Try again, or add more detail to the description.",
    };
  }
}

export type ImportResult =
  | {
      success: true;
      slug: string;
      joinUrl: string;
      allowlisted: number;
      landingSlug: string | null;
      landingCreated: boolean;
      /** Where the auto-set art came from, for the success message. */
      heroSource: "library" | "pexels" | null;
      coverGenerated: boolean;
      /** /apply/<slug> when the draft included an application; null otherwise
       *  (or when the application couldn't be created — the message says so). */
      applicationSlug: string | null;
      applicationError: string | null;
    }
  | { success: false; error: string };

/** Step 2: write the reviewed draft. Called only after an admin confirms it. */
export async function createCourseFromDraftAction(params: {
  draft: CourseDraft;
  programSlug: string;
  meetingLink?: string;
  coverImageUrl?: string;
  allowlistEmails?: string[];
}): Promise<ImportResult> {
  const { svc, role, programId: actorProgramId } = await requireCourseCreator();
  const { draft, programSlug } = params;

  if (!(COURSE_PROGRAM_SLUGS as readonly string[]).includes(programSlug)) {
    return { success: false, error: "Invalid program." };
  }
  if (!draft.name?.trim()) return { success: false, error: "Course name is required." };
  if (!draft.instructor?.trim())
    return { success: false, error: "Instructor is required." };
  if (!draft.startDate) return { success: false, error: "Start date is required." };

  // The whole point of the review step: a course with no dated sessions looks
  // complete everywhere and never appears on the calendar.
  if (!draft.sessions?.length) {
    return {
      success: false,
      error: "Add at least one session — without one the course won't appear on any calendar.",
    };
  }
  if (draft.sessions.some((s) => !s.date || !s.time)) {
    return { success: false, error: "Every session needs a date and a time." };
  }

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single<{ id: string }>();
  if (!programRow) {
    return { success: false, error: `Could not find the ${programSlug} program.` };
  }

  // A plain admin can only create inside their own program; super-admins roam.
  if (!hasCapability(role, "switch_programs") && actorProgramId !== programRow.id) {
    return {
      success: false,
      error: "You can only create courses in your own program.",
    };
  }

  const slug = toSlug(draft.name);
  if (!slug) return { success: false, error: "Could not derive a slug from the course name." };

  if (getProgramBySlug(programSlug).tracks.some((t) => t.slug === slug)) {
    return { success: false, error: `A course with this name already exists (slug: ${slug}).` };
  }
  const { data: existing } = await svc
    .from("track_overrides")
    .select("track_slug")
    .eq("program_id", programRow.id)
    .eq("track_slug", slug)
    .maybeSingle();
  if (existing) {
    return { success: false, error: `A course with this name already exists (slug: ${slug}).` };
  }

  // session_content has a UNIQUE (program_id, track, week_number) constraint, so
  // every session needs a distinct number. A parser that groups two sessions per
  // calendar week (Wed+Fri → week 1, week 1) produces duplicates and the insert
  // fails ("session details failed to save"). Sort chronologically and renumber
  // 1..N so each session is its own unit.
  const orderedSessions = [...draft.sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s, i) => ({ ...s, week: i + 1 }));
  const first = orderedSessions[0];
  // Importing a course that's already underway (e.g. mid-cohort) should mark the
  // sessions that have passed as completed rather than "upcoming".
  const todayIso = new Date().toISOString().slice(0, 10);

  const { error: trackError } = await svc.from("track_overrides").insert({
    program_id: programRow.id,
    track_slug: slug,
    name: draft.name.trim(),
    short_name: draft.shortName?.trim() || draft.name.trim(),
    description: draft.description?.trim() || null,
    instructor: draft.instructor.trim(),
    start_date: first.date,
    kickoff_time_utc: easternToUtc(first.date, first.time),
    total_weeks: draft.totalWeeks || draft.sessions.length,
    sessions_per_week: draft.sessionsPerWeek || 1,
    unit_label: draft.unitLabel || "Session",
    session_times: draft.sessionTimes ?? [],
    cover_image_url: params.coverImageUrl ?? null,
    phase: "core",
    sequential_gating: false,
    week_summaries: orderedSessions.map((s) => ({
      week: s.week,
      date: s.date,
      time: s.time,
      topic: s.topic,
      icon: "📅",
      durationMinutes: s.durationMinutes || 60,
    })),
  });

  if (trackError) {
    console.error("[createCourseFromDraftAction] track insert failed:", trackError);
    return { success: false, error: "Failed to create the course. Please try again." };
  }

  const { error: contentError } = await svc.from("session_content").insert(
    orderedSessions.map((s) => {
      const status = s.date < todayIso ? "completed" : "upcoming";
      return {
        track: slug,
        program_id: programRow.id,
        week_number: s.week,
        meeting_link: params.meetingLink?.trim() || null,
        status,
        status_2: status,
        title: s.week === 1 ? draft.sessionTitle || s.topic : s.topic,
        subtitle: s.week === 1 ? draft.sessionSubtitle || null : null,
        description: s.week === 1 ? draft.description?.trim() || null : null,
        objectives: s.week === 1 ? (draft.objectives ?? []) : [],
      };
    }),
  );
  if (contentError) {
    console.error("[createCourseFromDraftAction] session_content insert failed:", contentError);
    // The track exists and is usable; surface the partial state rather than
    // reporting a clean success.
    return {
      success: false,
      error: "Course created, but session details failed to save. Open Manage Course to finish it.",
    };
  }

  let allowlisted = 0;
  const emails = params.allowlistEmails ?? [];
  if (emails.length) {
    const { error: allowError, count } = await svc
      .from("allowed_signup_emails")
      .upsert(
        emails.map((email) => ({ email: email.trim().toLowerCase(), track_slug: slug })),
        { onConflict: "email,track_slug", ignoreDuplicates: true, count: "exact" },
      );
    if (allowError) {
      console.error("[createCourseFromDraftAction] allowlist failed:", allowError);
    } else {
      allowlisted = count ?? emails.length;
    }
  }

  // Same pairing the manual builder enforces: a cohort with no landing page has
  // no way for anyone to sign up for it. The drafted copy was reviewed on the
  // same screen as the course; the schedule is derived from the sessions here
  // rather than drafted, so it can't disagree with the calendar.
  const landing = await ensureLandingForCourse(svc, slug, draft.name.trim(), programSlug, {
    headline: draft.landing?.headline,
    subhead: draft.landing?.subhead,
    eyebrow: draft.landing?.eyebrow,
    bodySections: (draft.landing?.bodySections ?? []).filter(
      (s) => s.heading.trim() && s.body.trim(),
    ),
    schedule: orderedSessions.map((s) => ({
      // Noon UTC so the label can't slip a day in any server timezone.
      label: new Date(`${s.date}T12:00:00Z`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      title: s.topic,
    })),
  });

  // The application form, when the brief asked for one. Created before the
  // landing page is dressed so the Apply button can point at it. Failure here
  // never sinks the course — the admin can build the form by hand.
  let applicationSlug: string | null = null;
  let applicationError: string | null = null;
  const appDraft = draft.application;
  if (appDraft?.wanted) {
    // A choice question with fewer than two options renders as a required
    // field nobody can answer — the whole form becomes unsubmittable. The
    // manual builder rejects these; the importer drops them and says so.
    const needsOptions = (k: string) => k === "radio" || k === "multi-select" || k === "select";
    const labeled = (appDraft.questions ?? []).filter((q) => q.label?.trim());
    const validQuestions = labeled.filter(
      (q) => !needsOptions(q.kind) || (q.options ?? []).filter((o) => o.trim()).length >= 2,
    );
    const dropped = labeled.length - validQuestions.length;
    if (dropped > 0) {
      applicationError = `${dropped} question${dropped === 1 ? "" : "s"} had too few answer options and ${dropped === 1 ? "was" : "were"} left out — add options under Manage → Applications.`;
    }
    if (validQuestions.length === 0) {
      applicationError = "The application had no questions — build it under Manage → Applications.";
    } else {
      const questions = validQuestions.map((q, i) =>
        toSurveyQuestion({
          id: `q-${i + 1}`,
          kind: q.kind,
          label: q.label,
          options: q.options ?? [],
          required: q.required,
        } satisfies DraftQuestion),
      );
      const { error: appError } = await svc.from("applications").insert({
        slug,
        program_id: programRow.id,
        track_slug: slug,
        title: draft.name.trim(),
        description: draft.description?.trim() || null,
        questions,
        notify_email: appDraft.notifyEmail?.trim() || null,
        // End of day Eastern; easternToUtc follows DST so a winter deadline
        // doesn't close an hour early.
        closes_at: appDraft.deadline ? easternToUtc(appDraft.deadline, "23:59") : null,
      });
      if (appError) {
        console.error("[createCourseFromDraftAction] application insert failed:", appError);
        applicationError =
          appError.code === "23505"
            ? `An application already exists at /apply/${slug} — link it under Manage → Applications.`
            : "The application form couldn't be created — build it under Manage → Applications.";
      } else {
        applicationSlug = slug;
      }
    }
  }

  // Auto-art, part of the same creation flow: a hero photo for the landing
  // page (curated library first, Pexels fallback) and a branded cover
  // illustration for the course banner + OG card. Best-effort — a course with
  // no art is exactly what we shipped before, so failures never surface.
  const [heroPhoto, coverGraphic] = await Promise.all([
    resolveHeroPhoto(svc, draft),
    generateCoverGraphic(svc, draft, programSlug),
  ]);

  // Art only dresses a landing page this flow just created — never clobber
  // choices an admin made on an existing page. The Apply CTA is different:
  // the application was created THIS run, so even a pre-existing landing page
  // must point at it — otherwise visitors keep enrolling directly and the
  // selection process is silently bypassed.
  if (landing.slug) {
    const updates = {
      ...(landing.created && heroPhoto ? { hero_image_url: heroPhoto.url } : {}),
      ...(landing.created && coverGraphic ? { og_image: coverGraphic } : {}),
      ...(applicationSlug
        ? { apply_url: `/apply/${applicationSlug}`, apply_cta_label: "Apply now" }
        : {}),
    };
    if (Object.keys(updates).length > 0) {
      await svc
        .from("landing_pages")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("slug", landing.slug);
    }
  }

  // Course banner: an Eventbrite cover the admin reviewed stays authoritative.
  if (coverGraphic && !params.coverImageUrl) {
    await svc
      .from("track_overrides")
      .update({ cover_image_url: coverGraphic })
      .eq("program_id", programRow.id)
      .eq("track_slug", slug);
  }

  revalidatePath("/dashboard", "page");
  revalidatePath("/dashboard/admin", "page");
  revalidatePath(`/dashboard/track/${slug}`, "page");
  if (applicationSlug) revalidatePath("/dashboard/admin/applications");
  if (landing.created) revalidatePath("/dashboard/admin/landing");

  return {
    success: true,
    slug,
    joinUrl: `https://bccacademy.io/join/${programSlug}?track=${slug}`,
    allowlisted,
    landingSlug: landing.slug,
    landingCreated: landing.created,
    heroSource: heroPhoto?.source ?? null,
    coverGenerated: Boolean(coverGraphic),
    applicationSlug,
    applicationError,
  };
}
