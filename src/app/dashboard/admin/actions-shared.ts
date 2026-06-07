import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { hasCapability, canSwitchPrograms } from "@/lib/roles";
import type { Capability } from "@/lib/roles";

export async function requireCapability(capability: Capability) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role, program_id")
    .eq("id", user.id)
    .single<{ role: string; program_id: string | null }>();

  const role = student?.role ?? "";
  if (!hasCapability(role, capability)) throw new Error("Not authorized");
  return { svc, userId: user.id, role, programId: student?.program_id ?? null };
}

// Shorthand aliases used by domain files.
export const requireAdmin = () => requireCapability("access_admin_panel");
export const requireManager = () => requireCapability("manage_students");

export async function requireSuperAdmin() {
  const result = await requireAdmin();
  if (!canSwitchPrograms(result.role)) throw new Error("Not authorized");
  return result;
}

// Records a super-admin view/export/delete against identifiable respondent
// data. Fire-and-forget — we'd rather let the admin see their data than
// make them wait on an audit insert or hard-fail on its failure. Errors
// log asynchronously.
export function logAdminAccess(
  svc: ReturnType<typeof createServiceClient>,
  args: {
    actorUserId: string;
    programId: string | null;
    action: "view" | "export" | "delete" | "send_invite";
    resource: string;
    rowCount?: number;
    metadata?: Record<string, unknown>;
  },
): void {
  void svc
    .from("admin_access_log")
    .insert({
      actor_user_id: args.actorUserId,
      program_id: args.programId,
      action: args.action,
      resource: args.resource,
      row_count: args.rowCount ?? null,
      metadata: args.metadata ?? null,
    })
    .then(({ error }) => {
      if (error) {
        console.error("admin_access_log insert failed:", {
          code: error.code,
          message: error.message,
        });
      }
    });
}

// Resolves a program UUID from its slug using the service client.
// Used by actions that receive programSlug as a parameter rather than
// resolving it from the current host.
export async function programIdFromSlug(
  svc: ReturnType<typeof createServiceClient>,
  slug: string,
): Promise<string> {
  const { data, error } = await svc
    .from("programs")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error || !data) throw new Error(`Program not found: ${slug}`);
  return data.id;
}
