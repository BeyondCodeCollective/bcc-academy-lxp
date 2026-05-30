"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { hasCapability } from "@/lib/roles";
import { hasTsConfigSlug } from "@/lib/programs";

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

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
  if (totalWeeks < 1 || totalWeeks > 52) return { success: false, error: "Weeks must be between 1 and 52." };
  if (sessionsPerWeek < 1 || sessionsPerWeek > 7) return { success: false, error: "Sessions per week must be between 1 and 7." };

  const slug = toSlug(name);
  if (!slug) return { success: false, error: "Could not derive a valid slug from the course name." };

  // Uniqueness check: TS configs
  if (hasTsConfigSlug(slug)) {
    return { success: false, error: `A course with this name already exists (slug: ${slug}).` };
  }

  // Uniqueness check: DB
  const { data: existing } = await svc
    .from("programs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return { success: false, error: `A course with this name already exists (slug: ${slug}).` };
  }

  // Insert program row
  const { data: newProgram, error: programError } = await svc
    .from("programs")
    .insert({ slug, name: name.trim(), is_dynamic: true })
    .select("id")
    .single<{ id: string }>();

  if (programError || !newProgram) {
    console.error("[createCourseAction] programs insert failed:", programError);
    return { success: false, error: "Failed to create course. Please try again." };
  }

  // Insert track_overrides row (track slug = program slug for single-track courses)
  const { error: trackError } = await svc
    .from("track_overrides")
    .insert({
      program_id: newProgram.id,
      track_slug: slug,
      name: name.trim(),
      instructor: instructor.trim(),
      total_weeks: totalWeeks,
      sessions_per_week: sessionsPerWeek,
    });

  if (trackError) {
    // Best-effort cleanup: delete the orphaned program row
    await svc.from("programs").delete().eq("id", newProgram.id);
    console.error("[createCourseAction] track_overrides insert failed:", trackError);
    return { success: false, error: "Failed to save track details. Please try again." };
  }

  return {
    success: true,
    slug,
    joinUrl: `bccacademy.io/join/${slug}`,
  };
}
