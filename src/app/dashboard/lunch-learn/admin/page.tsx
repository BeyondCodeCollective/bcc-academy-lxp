import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import { LunchLearnAdmin } from "./admin-client";

export const dynamic = "force-dynamic";

export default async function LunchLearnAdminPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canAccessAdminPanel(ctx.student?.role ?? "")) {
    redirect("/dashboard");
  }

  const svc = createServiceClient();
  const { data: rows } = await svc
    .from("lunch_learns")
    .select("id, title, presenter, recording_url, description, recorded_at")
    .order("recorded_at", { ascending: false });

  return <LunchLearnAdmin recordings={rows ?? []} />;
}
