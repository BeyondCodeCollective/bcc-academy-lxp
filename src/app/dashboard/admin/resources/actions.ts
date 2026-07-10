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
 * Replace the full resource list for a program. Simpler than per-row diffing:
 * the editor always sends the complete ordered list, so we delete the
 * program's rows and re-insert in order. Admin-only (service role).
 */
export async function saveResources(programSlug: string, items: ResourceInput[]) {
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
      title: it.title.trim(),
      description: clean(it.description),
      url: clean(it.url),
      category: clean(it.category),
      icon: clean(it.icon),
      sort_order: i,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }));

  const { error: delError } = await svc
    .from("resources")
    .delete()
    .eq("program_id", programId);
  if (delError) throw new Error(delError.message);

  if (rows.length > 0) {
    const { error: insError } = await svc.from("resources").insert(rows);
    if (insError) throw new Error(insError.message);
  }

  revalidatePath("/dashboard/resources", "page");
  revalidatePath("/dashboard/admin/resources", "page");
  return { success: true };
}
