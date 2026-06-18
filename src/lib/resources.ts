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

/** All resources for a program, ordered for display. */
export async function fetchResourcesForProgram(programSlug: string): Promise<Resource[]> {
  const programId = await programIdForSlug(programSlug);
  if (!programId) return [];
  const svc = createServiceClient();
  const { data } = await svc
    .from("resources")
    .select("id, title, description, url, category, icon, sort_order")
    .eq("program_id", programId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as Resource[];
}

/** Cheap existence check for nav visibility (data-driven — no empty nav item). */
export async function programHasResources(programSlug: string): Promise<boolean> {
  const programId = await programIdForSlug(programSlug);
  if (!programId) return false;
  const svc = createServiceClient();
  const { count } = await svc
    .from("resources")
    .select("id", { count: "exact", head: true })
    .eq("program_id", programId);
  return (count ?? 0) > 0;
}
