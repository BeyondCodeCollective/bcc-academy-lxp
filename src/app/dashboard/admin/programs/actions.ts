"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasCapability } from "@/lib/roles";
import { getProgramBySlug, getHomeProgramForTrack } from "@/lib/programs";
import { toSlug } from "@/lib/programs/slug";
import { easternToUtc } from "@/lib/utils";
import { ensureLandingForCourse } from "@/lib/landing-pages";

// Bust every cached surface that lists or renders course metadata so edits made
// in Manage Courses (rename, hide/show, create) show up immediately. Without
// this the admin home serves a stale render — the edit persists to the DB but
// the cached page keeps the old name until the route cache expires.
function revalidateCourseSurfaces(trackSlug?: string) {
  revalidatePath("/dashboard", "page");
  revalidatePath("/dashboard/admin", "page");
  if (trackSlug) {
    revalidatePath(`/dashboard/track/${trackSlug}`, "page");
    revalidatePath(`/dashboard/track/${trackSlug}/[week]`, "page");
  }
}

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (!hasCapability(student?.role ?? "", "switch_programs")) {
    throw new Error("Not authorized");
  }
  return svc;
}

export type CreateCourseResult =
  | {
      success: true;
      slug: string;
      joinUrl: string;
      /** Landing page paired with the course; null only if creating it failed. */
      landingSlug: string | null;
      /** False when a page already existed at that slug or for that course. */
      landingCreated: boolean;
    }
  | { success: false; error: string };

// Programs a builder course can be filed under. Catalyst, ATG, and Beyond
// Code Centers surface on the bccacademy.io hub (applyTrackOverrides); bgc
// and forte are standalone programs whose admins create courses from their
// own program context.
const COURSE_PROGRAM_SLUGS = ["catalyst", "beyond-code-centers", "atg", "bgc", "forte"] as const;

export async function createCourseAction(formData: {
  name: string;
  instructor: string;
  totalWeeks: number;
  sessionsPerWeek: number;
  phase?: string;
  /** Program the course is filed under. Defaults to Catalyst (the umbrella). */
  programSlug?: string;
}): Promise<CreateCourseResult> {
  const svc = await requireSuperAdmin();

  const { name, instructor, totalWeeks, sessionsPerWeek, phase } = formData;
  const programSlug = formData.programSlug ?? "catalyst";

  if (!name.trim()) return { success: false, error: "Course name is required." };
  if (!instructor.trim()) return { success: false, error: "Instructor name is required." };
  if (!Number.isFinite(totalWeeks) || !Number.isInteger(totalWeeks) || totalWeeks < 1 || totalWeeks > 52) return { success: false, error: "Weeks must be between 1 and 52." };
  if (!Number.isFinite(sessionsPerWeek) || !Number.isInteger(sessionsPerWeek) || sessionsPerWeek < 1 || sessionsPerWeek > 7) return { success: false, error: "Sessions per week must be between 1 and 7." };
  const slug = toSlug(name);
  if (!slug) return { success: false, error: "Could not derive a valid slug from the course name." };

  const { data: programRow } = await svc
    .from("programs")
    .select("id, is_dynamic")
    .eq("slug", programSlug)
    .single<{ id: string; is_dynamic: boolean | null }>();
  if (!programRow) {
    return { success: false, error: `Could not find the ${programSlug} program. Please contact an engineer.` };
  }

  // Admin-created organizations (is_dynamic) can hold courses too. They have no
  // TS config, so they're absent from COURSE_PROGRAM_SLUGS by definition —
  // authorize them off the DB flag instead of the hardcoded list.
  const isDynamicOrg = programRow.is_dynamic === true;
  if (!isDynamicOrg && !(COURSE_PROGRAM_SLUGS as readonly string[]).includes(programSlug)) {
    return { success: false, error: "Invalid program." };
  }

  // Uniqueness check: TS config tracks in the chosen program. Skipped for
  // dynamic orgs — getProgramBySlug() falls back to Catalyst for any slug it
  // doesn't know, so running this would compare against Catalyst's tracks and
  // reject valid course names.
  if (!isDynamicOrg) {
    const programTracks = getProgramBySlug(programSlug).tracks;
    if (programTracks.some((t) => t.slug === slug)) {
      return { success: false, error: `A course with this name already exists (slug: ${slug}).` };
    }
  }

  // Uniqueness check: existing track_overrides rows under the chosen program
  const { data: existing } = await svc
    .from("track_overrides")
    .select("track_slug")
    .eq("program_id", programRow.id)
    .eq("track_slug", slug)
    .maybeSingle();
  if (existing) {
    return { success: false, error: `A course with this name already exists (slug: ${slug}).` };
  }

  const { error: trackError } = await svc
    .from("track_overrides")
    .insert({
      program_id: programRow.id,
      track_slug: slug,
      name: name.trim(),
      instructor: instructor.trim(),
      total_weeks: totalWeeks,
      sessions_per_week: sessionsPerWeek,
      // Not scheduled until an admin sets a schedule (Edit Course) — a
      // creation-day default silently made every new course live immediately.
      start_date: null,
      phase: phase ?? "core",
    });

  if (trackError) {
    console.error("[createCourseAction] track_overrides insert failed:", trackError);
    return { success: false, error: "Failed to create course. Please try again." };
  }

  // The pair is the unit: a cohort with no landing page has no way for anyone
  // to sign up for it, and saving a landing page has created its course since
  // #1029. This closes the other direction so the two can't be made apart.
  const landing = await ensureLandingForCourse(svc, slug, name.trim(), programSlug);

  revalidateCourseSurfaces(slug);
  if (landing.created) revalidatePath("/dashboard/admin/landing");
  return {
    success: true,
    slug,
    joinUrl: `https://bccacademy.io/join/${programSlug}?track=${slug}`,
    landingSlug: landing.slug,
    landingCreated: landing.created,
  };
}


// Hide / show a course. Reversible, never deletes. Backed by hidden_courses,
// keyed by (program_slug, track_slug) so it works for BOTH hardcoded TS-config
// tracks and DB/builder courses — no track_overrides row required.
export async function hideCourseAction(
  programSlug: string,
  trackSlug: string,
): Promise<{ success: boolean; error?: string }> {
  const svc = await requireSuperAdmin();
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();

  const { error } = await svc.from("hidden_courses").upsert(
    {
      program_slug: programSlug,
      track_slug: trackSlug,
      hidden_at: new Date().toISOString(),
      hidden_by: user?.id ?? null,
    },
    { onConflict: "program_slug,track_slug" },
  );

  if (error) {
    console.error("[hideCourseAction] failed:", error);
    return { success: false, error: "Failed to hide course." };
  }
  revalidateCourseSurfaces(trackSlug);
  return { success: true };
}

export async function showCourseAction(
  _programSlug: string,
  trackSlug: string,
): Promise<{ success: boolean; error?: string }> {
  const svc = await requireSuperAdmin();

  // Un-hide everywhere — clear any hidden row for this course regardless of
  // which program it was hidden under.
  const { error } = await svc
    .from("hidden_courses")
    .delete()
    .eq("track_slug", trackSlug);

  if (error) {
    console.error("[showCourseAction] failed:", error);
    return { success: false, error: "Failed to show course." };
  }
  revalidateCourseSurfaces(trackSlug);
  return { success: true };
}

// Tables holding LEARNER history for a course. A course with any of these is
// not deletable — erasing someone's attendance or submitted work to tidy up a
// course list is never the right trade. Hide covers that case; this is only for
// courses that never ran.
const LEARNER_HISTORY_TABLES: { table: string; column: string; label: string }[] = [
  { table: "student_tracks", column: "track_slug", label: "enrollments" },
  { table: "attendance", column: "track", label: "attendance records" },
  { table: "submissions", column: "track_slug", label: "submissions" },
  { table: "week_progress", column: "track_slug", label: "progress records" },
  { table: "reflections", column: "track_slug", label: "reflections" },
  { table: "track_completions", column: "track_slug", label: "completions" },
];

// Config rows the course owns outright — no learner data, safe to remove with
// it. Ordered so nothing is left pointing at a course that no longer exists.
const COURSE_CONFIG_TABLES: { table: string; column: string }[] = [
  { table: "session_content", column: "track" },
  { table: "announcements", column: "track_slug" },
  { table: "instructor_tracks", column: "track_slug" },
  { table: "cohorts", column: "track_slug" },
  { table: "hidden_courses", column: "track_slug" },
  { table: "track_overrides", column: "track_slug" },
];

export type DeleteCourseResult =
  | { success: true }
  | { success: false; error: string; blockedBy?: { label: string; count: number }[] };

/**
 * Permanently delete a course. Unlike hide, this does not come back.
 *
 * Refuses outright if any learner history exists — the counts come back so the
 * UI can say what's in the way instead of a bare "can't". Only the course's own
 * config (curriculum, announcements, instructor assignments, cohorts) is
 * removed. Hardcoded TS-config courses can't be deleted this way: their
 * definition lives in code, so they'd reappear on the next render — hide those.
 */
export async function deleteCourseAction(
  programSlug: string,
  trackSlug: string,
): Promise<DeleteCourseResult> {
  const svc = await requireSuperAdmin();

  // A course defined in TypeScript would regenerate itself from config the
  // moment the page re-rendered, so "deleted" would be a lie.
  const homeProgram = getHomeProgramForTrack(trackSlug);
  if (homeProgram?.tracks.some((t) => t.slug === trackSlug)) {
    return {
      success: false,
      error:
        "This course is defined in code, not the database — it would come back on the next deploy. Hide it instead.",
    };
  }

  const blockedBy: { label: string; count: number }[] = [];
  for (const { table, column, label } of LEARNER_HISTORY_TABLES) {
    const { count, error } = await svc
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, trackSlug);
    // A missing table or a failed count must not read as "nothing there" —
    // that would delete a course whose history we simply couldn't see.
    if (error) {
      console.error(`[deleteCourseAction] count failed on ${table}:`, error);
      return { success: false, error: `Couldn't verify ${label}. Nothing was deleted.` };
    }
    if ((count ?? 0) > 0) blockedBy.push({ label, count: count ?? 0 });
  }
  if (blockedBy.length > 0) {
    return {
      success: false,
      error: "This course has learner history, so it can't be deleted. Hide it instead.",
      blockedBy,
    };
  }

  for (const { table, column } of COURSE_CONFIG_TABLES) {
    const { error } = await svc.from(table).delete().eq(column, trackSlug);
    if (error) {
      console.error(`[deleteCourseAction] delete failed on ${table}:`, error);
      return {
        success: false,
        error: `Failed while removing ${table}. The course is partially deleted — re-run to finish.`,
      };
    }
  }

  revalidateCourseSurfaces(trackSlug);
  revalidatePath("/dashboard/admin/programs", "page");
  void programSlug;
  return { success: true };
}

export type UpdateCourseResult =
  | { success: true }
  | { success: false; error: string };

export async function updateCourseAction(
  programSlug: string,
  trackSlug: string,
  formData: {
    name: string;
    instructor: string;
    totalWeeks: number;
    sessionsPerWeek: number;
    phase?: string;
    /** Course cover image URL. Empty string clears it; undefined leaves it alone. */
    coverImageUrl?: string;
  },
): Promise<UpdateCourseResult> {
  const svc = await requireSuperAdmin();
  const { name, instructor, totalWeeks, sessionsPerWeek, phase } = formData;

  if (!name.trim()) return { success: false, error: "Course name is required." };
  if (!instructor.trim()) return { success: false, error: "Instructor name is required." };
  if (!Number.isFinite(totalWeeks) || !Number.isInteger(totalWeeks) || totalWeeks < 1 || totalWeeks > 52)
    return { success: false, error: "Weeks must be between 1 and 52." };
  if (!Number.isFinite(sessionsPerWeek) || !Number.isInteger(sessionsPerWeek) || sessionsPerWeek < 1 || sessionsPerWeek > 7)
    return { success: false, error: "Sessions per week must be between 1 and 7." };

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single<{ id: string }>();
  if (!programRow) return { success: false, error: "Could not find that program." };

  // Upsert (not update) so a hardcoded TS-config course with no override row yet
  // gets one created on first edit — making EVERY course editable from the DB
  // without a code deploy. Unset fields fall back to the TS config via mergeTrack.
  const { error } = await svc
    .from("track_overrides")
    .upsert(
      {
        program_id: programRow.id,
        track_slug: trackSlug,
        name: name.trim(),
        instructor: instructor.trim(),
        total_weeks: totalWeeks,
        sessions_per_week: sessionsPerWeek,
        ...(phase ? { phase } : {}),
        ...(formData.coverImageUrl !== undefined
          ? { cover_image_url: formData.coverImageUrl.trim() || null }
          : {}),
      },
      { onConflict: "program_id,track_slug" },
    );

  if (error) {
    console.error("[updateCourseAction] failed:", error);
    return { success: false, error: "Failed to update course." };
  }

  revalidateCourseSurfaces(trackSlug);
  return { success: true };
}

export type ApplyScheduleResult =
  | { success: true; summary: string }
  | { success: false; error: string };

/**
 * Stamp a weekly meeting schedule onto a course: every numbered unit gets a
 * date (7 days apart from the first session), a start time (ET wall clock),
 * and a duration. This is what makes the course calendar, the .ics feed, and
 * the "Today / Live now · Join" panel real for a DB-built course — until now
 * these fields could only be set by SQL (Security+ and Tech & AI were both
 * loaded by hand).
 *
 * Labeled extras (a kickoff) keep whatever date they already have — their
 * timing is deliberate, not derived. Session-modeled multi-meeting courses
 * (unit "Session", >1/week) are rejected: their units aren't 7 days apart,
 * so a weekly stamp would write wrong dates for every other session.
 */
export async function applyWeeklyScheduleAction(
  programSlug: string,
  trackSlug: string,
  formData: { firstDate: string; time: string; durationMinutes: number },
): Promise<ApplyScheduleResult> {
  const svc = await requireSuperAdmin();
  const { firstDate, time, durationMinutes } = formData;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDate))
    return { success: false, error: "Pick the first session's date." };
  if (!/^\d{2}:\d{2}$/.test(time))
    return { success: false, error: "Pick a start time." };
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 600)
    return { success: false, error: "Duration must be 5–600 minutes." };

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single<{ id: string }>();
  if (!programRow) return { success: false, error: "Could not find that program." };

  const { data: row } = await svc
    .from("track_overrides")
    .select("week_summaries, total_weeks, unit_label, sessions_per_week")
    .eq("program_id", programRow.id)
    .eq("track_slug", trackSlug)
    .maybeSingle<{
      week_summaries:
        | { week: number; topic: string; icon: string; date?: string; label?: string; time?: string; durationMinutes?: number }[]
        | null;
      total_weeks: number | null;
      unit_label: string | null;
      sessions_per_week: number | null;
    }>();
  if (!row) return { success: false, error: "Save the course once before setting its schedule." };

  if (row.unit_label === "Session" && (row.sessions_per_week ?? 1) > 1) {
    return {
      success: false,
      error:
        "This course meets more than once a week, so its sessions aren't 7 days apart — set per-session dates individually instead.",
    };
  }

  const totalWeeks = row.total_weeks ?? 8;
  const existing = row.week_summaries ?? [];
  type ScheduleEntry = {
    week: number;
    topic: string;
    icon: string;
    date?: string;
    label?: string;
    time?: string;
    durationMinutes?: number;
  };
  const entries: ScheduleEntry[] =
    existing.length > 0
      ? [...existing].sort((a, b) => a.week - b.week)
      : Array.from({ length: totalWeeks }, (_, i) => ({
          week: i + 1,
          topic: `Week ${i + 1}`,
          icon: "📅",
        }));

  // Anchor at noon UTC so date math never slips a calendar day.
  const first = new Date(`${firstDate}T12:00:00Z`);
  // Camps stamp consecutive DAILY dates (Mon–Fri); the weekly 7-day stride
  // would silently rewrite Day 2-5 onto later weeks. If every regular unit
  // already has a date, keep the existing day pattern (shifted so the first
  // unit lands on firstDate) and only restamp time/duration.
  const regular = entries.filter((e) => !("label" in e && e.label));
  const keepPattern = regular.length > 0 && regular.every((e) => e.date);
  const firstExisting = keepPattern
    ? new Date(`${regular[0].date}T12:00:00Z`).getTime()
    : 0;
  let n = 0;
  const stamped = entries.map((e) => {
    if ("label" in e && e.label) return e; // extras keep their own timing
    const d = keepPattern
      ? new Date(
          first.getTime() + (new Date(`${e.date}T12:00:00Z`).getTime() - firstExisting),
        )
      : new Date(first.getTime() + n * 7 * 86_400_000);
    n += 1;
    return { ...e, date: d.toISOString().slice(0, 10), time, durationMinutes };
  });

  // "Wednesdays 3:00–3:30 PM ET" (weekly) or "Mon–Fri · 3:00–3:30 PM ET"
  // (daily camps) — derived, so the meta line can't drift from the schedule.
  const [h, m] = time.split(":").map(Number);
  const fmt = (mins: number) => {
    const hh = Math.floor(mins / 60) % 24;
    const mm = mins % 60;
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${h12}:${String(mm).padStart(2, "0")} ${hh >= 12 ? "PM" : "AM"}`;
  };
  const startMins = h * 60 + m;
  const timeLabel = `${fmt(startMins)}–${fmt(startMins + durationMinutes)} ET`;
  const stampedDates = stamped.flatMap((e) =>
    ("label" in e && e.label) || !("date" in e) || !e.date
      ? []
      : [new Date(`${e.date}T12:00:00Z`)],
  );
  // ISO weekday indices present across the schedule (Mon=1 … Sun=7).
  const dayIdx = [...new Set(stampedDates.map((d) => ((d.getUTCDay() + 6) % 7) + 1))].sort(
    (a, b) => a - b,
  );
  const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const contiguous = dayIdx.length > 1 && dayIdx[dayIdx.length - 1] - dayIdx[0] === dayIdx.length - 1;
  const label =
    dayIdx.length <= 1
      ? `${first.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })}s ${timeLabel}`
      : contiguous
        ? `${SHORT[dayIdx[0] - 1]}–${SHORT[dayIdx[dayIdx.length - 1] - 1]} · ${timeLabel}`
        : `${dayIdx.map((i) => SHORT[i - 1]).join(", ")} · ${timeLabel}`;

  // start_date anchors "has the course begun" — it must be the earliest DATED
  // unit including labeled extras, not the first regular session. Setting it
  // to firstDate hid Home for the Summer's Friday welcome session behind the
  // pre-start holding view when the Monday class schedule was saved
  // (2026-08-07): the course read as "starts Monday" on welcome morning.
  const earliestDate = stamped
    .flatMap((e) => ("date" in e && e.date ? [e.date] : []))
    .sort()[0] ?? firstDate;

  // The machine-readable twin of `session_times`. The label above is prose for
  // a human; the countdown, the .ics feed and add-to-calendar need an absolute
  // instant, and until now this action wrote only the prose — so a course could
  // show "Saturdays 12:00 PM ET" in its header while Launch Readiness correctly
  // reported no kickoff time and calendar entries fell back to date-only.
  // Derived from whichever unit owns `earliestDate` (a labeled extra can come
  // first and carry its own time). No time on that unit means we genuinely
  // don't know: leave the column alone rather than guess.
  const earliestEntry = stamped.find((e) => "date" in e && e.date === earliestDate);
  const kickoffTime =
    earliestEntry && "time" in earliestEntry ? earliestEntry.time : undefined;

  const { error } = await svc
    .from("track_overrides")
    .update({
      start_date: earliestDate,
      week_summaries: stamped,
      session_times: [label],
      ...(kickoffTime
        ? { kickoff_time_utc: easternToUtc(earliestDate, kickoffTime) }
        : {}),
    })
    .eq("program_id", programRow.id)
    .eq("track_slug", trackSlug);

  if (error) {
    console.error("[applyWeeklyScheduleAction] failed:", error);
    return { success: false, error: "Failed to save the schedule." };
  }

  revalidateCourseSurfaces(trackSlug);
  return { success: true, summary: label };
}
