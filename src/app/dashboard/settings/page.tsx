import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";
import { ensureCalendarToken } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const ctx = await getSessionContext();
  if (!ctx?.userId) redirect("/");

  const svc = createServiceClient();
  const { data: pref } = await svc
    .from("notification_preferences")
    .select("announcements, feedback")
    .eq("student_id", ctx.userId)
    .maybeSingle<{ announcements: boolean; feedback: boolean }>();

  // Missing row = opted in to everything (matches the send-path default).
  const initialPrefs = {
    announcements: pref?.announcements ?? true,
    feedback: pref?.feedback ?? true,
  };

  const token = await ensureCalendarToken();
  const h = await headers();
  const host = h.get("host") ?? "bccacademy.io";
  const proto =
    h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const calendarUrl = `${proto}://${host}/api/calendar/${token}.ics`;

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl px-4 sm:px-5 py-8 space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Choose what we email you, and subscribe to your schedule."
      />
      <SettingsForm initialPrefs={initialPrefs} calendarUrl={calendarUrl} />
    </div>
  );
}
