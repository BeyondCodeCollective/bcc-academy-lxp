"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasCapability } from "@/lib/roles";
import { getProgramBySlug } from "@/lib/programs";
import { toSlug } from "@/lib/programs/slug";

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
  | { success: true; slug: string; joinUrl: string }
  | { success: false; error: string };

// Programs a builder course can be filed under. All three resolve on the
// bccacademy.io hub: Catalyst directly, ATG + Beyond Code Centers via the hub
// aggregation (applyTrackOverrides). Other programs (forte, bgc) run on their
// own domains, so a course there wouldn't surface on the hub — excluded here.
const COURSE_PROGRAM_SLUGS = ["catalyst", "beyond-code-centers", "atg"] as const;

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
  if (!(COURSE_PROGRAM_SLUGS as readonly string[]).includes(programSlug)) {
    return { success: false, error: "Invalid program." };
  }

  const slug = toSlug(name);
  if (!slug) return { success: false, error: "Could not derive a valid slug from the course name." };

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single<{ id: string }>();
  if (!programRow) {
    return { success: false, error: `Could not find the ${programSlug} program. Please contact an engineer.` };
  }

  // Uniqueness check: TS config tracks in the chosen program
  const programTracks = getProgramBySlug(programSlug).tracks;
  if (programTracks.some((t) => t.slug === slug)) {
    return { success: false, error: `A course with this name already exists (slug: ${slug}).` };
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
      start_date: new Date().toISOString().slice(0, 10),
      phase: phase ?? "core",
    });

  if (trackError) {
    console.error("[createCourseAction] track_overrides insert failed:", trackError);
    return { success: false, error: "Failed to create course. Please try again." };
  }

  revalidateCourseSurfaces(slug);
  return {
    success: true,
    slug,
    joinUrl: `https://bccacademy.io/join/${programSlug}?track=${slug}`,
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

export type UpdateCourseResult =
  | { success: true }
  | { success: false; error: string };

export async function updateCourseAction(
  programSlug: string,
  trackSlug: string,
  formData: { name: string; instructor: string; totalWeeks: number; sessionsPerWeek: number; phase?: string },
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
        // Keep short_name in sync with name. The edit form only exposes one
        // name field, but several surfaces (admin home picker, track tabs,
        // bulk-assign dropdowns) render short_name — without this a rename only
        // updates the title and the old name lingers everywhere short_name shows.
        short_name: name.trim(),
        instructor: instructor.trim(),
        total_weeks: totalWeeks,
        sessions_per_week: sessionsPerWeek,
        ...(phase ? { phase } : {}),
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
