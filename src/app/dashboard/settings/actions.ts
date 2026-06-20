"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

async function requireUserId(): Promise<string> {
  const ctx = await getSessionContext();
  if (!ctx?.userId) throw new Error("Not authenticated");
  return ctx.userId;
}

/** Upsert the current student's notification preferences. */
export async function updateNotificationPreferences(prefs: {
  announcements: boolean;
  feedback: boolean;
}): Promise<{ success: true }> {
  const userId = await requireUserId();
  const svc = createServiceClient();

  const { error } = await svc.from("notification_preferences").upsert(
    {
      student_id: userId,
      announcements: prefs.announcements,
      feedback: prefs.feedback,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id" },
  );

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Return the student's calendar token, generating + persisting one on first
 * use. Lets the settings page always render a working subscribe URL.
 */
export async function ensureCalendarToken(): Promise<string> {
  const userId = await requireUserId();
  const svc = createServiceClient();

  const { data: existing } = await svc
    .from("students")
    .select("calendar_token")
    .eq("id", userId)
    .maybeSingle<{ calendar_token: string | null }>();

  if (existing?.calendar_token) return existing.calendar_token;

  const token = randomUUID();
  const { error } = await svc
    .from("students")
    .update({ calendar_token: token })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return token;
}
