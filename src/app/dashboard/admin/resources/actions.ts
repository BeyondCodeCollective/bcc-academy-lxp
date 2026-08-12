"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, resolveProgramForActor } from "../actions-shared";

export type ResourceInput = {
  title: string;
  description: string;
  url: string;
  category: string;
  icon: string;
};

/**
 * Replace the resource list for ONE scope of a program — program-wide
 * (trackSlug null) or a single course. Simpler than per-row diffing: the
 * editor always sends the complete ordered list for the scope it's editing,
 * so we delete that scope's rows and re-insert in order. Other scopes'
 * rows are untouched. Admin-only (service role).
 */
export async function saveResources(
  programSlug: string,
  trackSlug: string | null,
  items: ResourceInput[],
) {
  const actor = await requireAdmin();
  const { svc, userId } = actor;
  // Bind the client-supplied slug to the actor's own program — this action
  // wipes and re-inserts the whole list, so a cross-tenant call is destructive.
  const programId = await resolveProgramForActor(actor, svc, programSlug);

  // Keep only rows with a title; trim everything; blank optionals → null.
  const clean = (v: string) => (v.trim() === "" ? null : v.trim());
  const rows = items
    .filter((it) => it.title.trim() !== "")
    .map((it, i) => ({
      program_id: programId,
      track_slug: trackSlug,
      title: it.title.trim(),
      description: clean(it.description),
      url: clean(it.url),
      category: clean(it.category),
      icon: clean(it.icon),
      sort_order: i,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }));

  let del = svc.from("resources").delete().eq("program_id", programId);
  del = trackSlug === null ? del.is("track_slug", null) : del.eq("track_slug", trackSlug);
  const { error: delError } = await del;
  if (delError) throw new Error(delError.message);

  if (rows.length > 0) {
    const { error: insError } = await svc.from("resources").insert(rows);
    if (insError) throw new Error(insError.message);
  }

  revalidatePath("/dashboard/resources", "page");
  revalidatePath("/dashboard/admin/resources", "page");
  return { success: true };
}
