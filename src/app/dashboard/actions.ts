"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeOnboarding(data: {
  first_name: string;
  last_name: string;
  location: string;
  date_of_birth: string;
  education_level: string;
}) {
  // Verify the user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Use service client to bypass RLS for the update
  const svc = createServiceClient();
  const { error } = await svc
    .from("students")
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      location: data.location,
      date_of_birth: data.date_of_birth,
      education_level: data.education_level,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  return { success: true };
}
