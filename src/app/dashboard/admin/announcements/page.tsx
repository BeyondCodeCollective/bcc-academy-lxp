import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { getProgram } from "@/lib/programs/server";
import { createServiceClient } from "@/lib/supabase/server";
import { AnnouncementsManager } from "../announcements-manager";

export default async function AnnouncementsPage() {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) redirect("/dashboard");

  const program = await getProgram();
  const svc = createServiceClient();

  // Get program ID
  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", program.slug)
    .single();

  const programId = programRow?.id;

  // Get active announcements
  const { data: announcements } = programId
    ? await svc
        .from("announcements")
        .select("id, message, track_slug, created_at, expires_at")
        .eq("program_id", programId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <AnnouncementsManager
        announcements={(announcements ?? []) as any}
        tracks={program.tracks.map((t) => ({ slug: t.slug, name: t.name }))}
        programSlug={program.slug}
      />
    </div>
  );
}
