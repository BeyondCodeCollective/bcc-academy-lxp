"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/dashboard/admin/actions-shared";

// Use the shared requireAdmin so these mutations inherit the preview-as-student
// block (the previous local guard skipped it, letting a super-admin in preview
// mode still write Lunch & Learns — a real-restriction violation).

export type LunchLearnInput = {
  title: string;
  presenter: string;
  recording_url: string;
  description: string | null;
  recorded_at: string;
};

export async function createLunchLearn(input: LunchLearnInput) {
  const { svc, userId } = await requireAdmin();
  const { error } = await svc.from("lunch_learns").insert({
    ...input,
    description: input.description || null,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function updateLunchLearn(id: string, input: LunchLearnInput) {
  const { svc } = await requireAdmin();
  const { error } = await svc
    .from("lunch_learns")
    .update({
      ...input,
      description: input.description || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  revalidatePath(`/dashboard/lunch-learn/${id}`);
  return { success: true };
}

export async function deleteLunchLearn(id: string) {
  const { svc } = await requireAdmin();
  const { error } = await svc.from("lunch_learns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  return { success: true };
}
