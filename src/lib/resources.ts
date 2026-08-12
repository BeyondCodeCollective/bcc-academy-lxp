// Per-program resources — flexible admin-editable items (tools, materials,
// links, docs, contacts) shown on /dashboard/resources. Reads via the service
// client in server components; writes go through the admin action.

import { createServiceClient } from "@/lib/supabase/server";

export type Resource = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  category: string | null;
  icon: string | null;
  sort_order: number;
  /** null = program-wide; a slug scopes the resource to that course. */
  track_slug: string | null;
};

async function programIdForSlug(slug: string): Promise<string | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("programs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

/** All resources for a program (every scope), ordered for display. */
export async function fetchResourcesForProgram(programSlug: string): Promise<Resource[]> {
  const programId = await programIdForSlug(programSlug);
  if (!programId) return [];
  const svc = createServiceClient();
  const { data } = await svc
    .from("resources")
    .select("id, title, description, url, category, icon, sort_order, track_slug")
    .eq("program_id", programId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as Resource[];
}

/** The track slugs a student is enrolled in (for resource visibility). */
export async function enrolledTrackSlugs(studentId: string): Promise<Set<string>> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("student_tracks")
    .select("track_slug")
    .eq("student_id", studentId);
  return new Set((data ?? []).map((r) => r.track_slug as string));
}

/** Program-wide resources plus those scoped to the given enrolled courses. */
export function visibleResources(all: Resource[], enrolled: Set<string>): Resource[] {
  return all.filter((r) => r.track_slug === null || enrolled.has(r.track_slug));
}

/**
 * Nav visibility (data-driven — no empty nav item): true when the STUDENT
 * would see at least one resource, not merely when the program has rows —
 * a list scoped entirely to other courses shouldn't produce a nav item.
 */
export async function programHasResources(
  programSlug: string,
  enrolledSlugs: string[] = [],
): Promise<boolean> {
  const programId = await programIdForSlug(programSlug);
  if (!programId) return false;
  const svc = createServiceClient();
  const { data } = await svc
    .from("resources")
    .select("track_slug")
    .eq("program_id", programId);
  const rows = (data ?? []) as { track_slug: string | null }[];
  const enrolled = new Set(enrolledSlugs);
  return rows.some((r) => r.track_slug === null || enrolled.has(r.track_slug));
}
