"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { hasCapability } from "@/lib/roles";
import { getProgramBySlug } from "@/lib/programs";
import { toSlug } from "@/lib/programs/slug";
import { bustOverrideCache } from "@/lib/programs/server";

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

export async function createCourseAction(formData: {
  name: string;
  instructor: string;
  totalWeeks: number;
  sessionsPerWeek: number;
}): Promise<CreateCourseResult> {
  const svc = await requireSuperAdmin();

  const { name, instructor, totalWeeks, sessionsPerWeek } = formData;

  if (!name.trim()) return { success: false, error: "Course name is required." };
  if (!instructor.trim()) return { success: false, error: "Instructor name is required." };
  if (!Number.isFinite(totalWeeks) || !Number.isInteger(totalWeeks) || totalWeeks < 1 || totalWeeks > 52) return { success: false, error: "Weeks must be between 1 and 52." };
  if (!Number.isFinite(sessionsPerWeek) || !Number.isInteger(sessionsPerWeek) || sessionsPerWeek < 1 || sessionsPerWeek > 7) return { success: false, error: "Sessions per week must be between 1 and 7." };

  const slug = toSlug(name);
  if (!slug) return { success: false, error: "Could not derive a valid slug from the course name." };

  // All builder courses live as tracks under Catalyst (no standalone program row).
  const { data: catalystRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", "catalyst")
    .single<{ id: string }>();
  if (!catalystRow) {
    return { success: false, error: "Could not find the Catalyst program. Please contact an engineer." };
  }

  // Uniqueness check: TS config tracks in Catalyst
  const catalystTracks = getProgramBySlug("catalyst").tracks;
  if (catalystTracks.some((t) => t.slug === slug)) {
    return { success: false, error: `A course with this name already exists (slug: ${slug}).` };
  }

  // Uniqueness check: existing track_overrides rows under Catalyst
  const { data: existing } = await svc
    .from("track_overrides")
    .select("track_slug")
    .eq("program_id", catalystRow.id)
    .eq("track_slug", slug)
    .maybeSingle();
  if (existing) {
    return { success: false, error: `A course with this name already exists (slug: ${slug}).` };
  }

  // Insert track_overrides row under Catalyst
  const { error: trackError } = await svc
    .from("track_overrides")
    .insert({
      program_id: catalystRow.id,
      track_slug: slug,
      name: name.trim(),
      instructor: instructor.trim(),
      total_weeks: totalWeeks,
      sessions_per_week: sessionsPerWeek,
      start_date: new Date().toISOString().slice(0, 10),
    });

  if (trackError) {
    console.error("[createCourseAction] track_overrides insert failed:", trackError);
    return { success: false, error: "Failed to create course. Please try again." };
  }

  bustOverrideCache("catalyst");
  return {
    success: true,
    slug,
    joinUrl: `https://bccacademy.io/join/catalyst?track=${slug}`,
  };
}

export async function archiveCourseAction(trackSlug: string): Promise<{ success: boolean; error?: string }> {
  const svc = await requireSuperAdmin();

  const { data: catalystRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", "catalyst")
    .single<{ id: string }>();
  if (!catalystRow) return { success: false, error: "Could not find Catalyst program." };

  const { error } = await svc
    .from("track_overrides")
    .update({ archived_at: new Date().toISOString() })
    .eq("program_id", catalystRow.id)
    .eq("track_slug", trackSlug);

  if (error) {
    console.error("[archiveCourseAction] failed:", error);
    return { success: false, error: "Failed to archive course." };
  }
  bustOverrideCache("catalyst");
  return { success: true };
}

export async function unarchiveCourseAction(trackSlug: string): Promise<{ success: boolean; error?: string }> {
  const svc = await requireSuperAdmin();

  const { data: catalystRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", "catalyst")
    .single<{ id: string }>();
  if (!catalystRow) return { success: false, error: "Could not find Catalyst program." };

  const { error } = await svc
    .from("track_overrides")
    .update({ archived_at: null })
    .eq("program_id", catalystRow.id)
    .eq("track_slug", trackSlug);

  if (error) {
    console.error("[unarchiveCourseAction] failed:", error);
    return { success: false, error: "Failed to unarchive course." };
  }
  bustOverrideCache("catalyst");
  return { success: true };
}

export type UpdateCourseResult =
  | { success: true }
  | { success: false; error: string };

export async function updateCourseAction(
  trackSlug: string,
  formData: { name: string; instructor: string; totalWeeks: number; sessionsPerWeek: number },
): Promise<UpdateCourseResult> {
  const svc = await requireSuperAdmin();
  const { name, instructor, totalWeeks, sessionsPerWeek } = formData;

  if (!name.trim()) return { success: false, error: "Course name is required." };
  if (!instructor.trim()) return { success: false, error: "Instructor name is required." };
  if (!Number.isFinite(totalWeeks) || !Number.isInteger(totalWeeks) || totalWeeks < 1 || totalWeeks > 52)
    return { success: false, error: "Weeks must be between 1 and 52." };
  if (!Number.isFinite(sessionsPerWeek) || !Number.isInteger(sessionsPerWeek) || sessionsPerWeek < 1 || sessionsPerWeek > 7)
    return { success: false, error: "Sessions per week must be between 1 and 7." };

  const { data: catalystRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", "catalyst")
    .single<{ id: string }>();
  if (!catalystRow) return { success: false, error: "Could not find Catalyst program." };

  const { error } = await svc
    .from("track_overrides")
    .update({
      name: name.trim(),
      instructor: instructor.trim(),
      total_weeks: totalWeeks,
      sessions_per_week: sessionsPerWeek,
    })
    .eq("program_id", catalystRow.id)
    .eq("track_slug", trackSlug);

  if (error) {
    console.error("[updateCourseAction] failed:", error);
    return { success: false, error: "Failed to update course." };
  }
  bustOverrideCache("catalyst");
  return { success: true };
}
