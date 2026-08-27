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
import { parseCourseDraft, type CourseDraft } from "@/lib/course-import/parse";
import { generateCourseDraft } from "@/lib/course-import/generate";

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
  // no way for anyone to sign up for it. Imported and AI-generated courses used
  // to skip this and land without a page.
  const landing = await ensureLandingForCourse(svc, slug, draft.name.trim(), programSlug);

  revalidatePath("/dashboard", "page");
  revalidatePath("/dashboard/admin", "page");
  revalidatePath(`/dashboard/track/${slug}`, "page");
  if (landing.created) revalidatePath("/dashboard/admin/landing");

  return {
    success: true,
    slug,
    joinUrl: `https://bccacademy.io/join/${programSlug}?track=${slug}`,
    allowlisted,
    landingSlug: landing.slug,
    landingCreated: landing.created,
  };
}
