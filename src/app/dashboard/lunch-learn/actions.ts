"use server";

import { createServiceClient, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasCapability } from "@/lib/roles";
import type { Capability } from "@/lib/roles";

async function requireCapability(capability: Capability) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = student?.role ?? "";
  if (!hasCapability(role, capability)) throw new Error("Not authorized");
  return { svc, userId: user.id, role };
}

export type LunchLearnInput = {
  title: string;
  presenter: string;
  recording_url: string;
  description: string | null;
  recorded_at: string;
};

export async function createLunchLearn(input: LunchLearnInput) {
  const { svc, userId } = await requireCapability("access_admin_panel");
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
  const { svc } = await requireCapability("access_admin_panel");
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
  const { svc } = await requireCapability("access_admin_panel");
  const { error } = await svc.from("lunch_learns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  return { success: true };
}
