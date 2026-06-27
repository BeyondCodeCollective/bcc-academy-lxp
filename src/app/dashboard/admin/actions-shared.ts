import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { hasCapability, canSwitchPrograms } from "@/lib/roles";
import type { Capability } from "@/lib/roles";
import { isMasterEmail } from "@/lib/auth/admins";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";

export async function requireCapability(capability: Capability) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role, program_id, email")
    .eq("id", user.id)
    .single<{ role: string; program_id: string | null; email: string | null }>();

  const role = student?.role ?? "";
  // The master (owner) is the top tier and bypasses every capability check.
  // super_admin is cross-program VIEW-only, so management capabilities resolve
  // through an admin role or the master email — not super_admin.
  const isMaster = isMasterEmail(student?.email);
  if (!isMaster && !hasCapability(role, capability)) throw new Error("Not authorized");
  // A super-admin previewing as a student is treated as a student — block
  // admin mutations until they exit preview.
  if (await isPreviewingAsStudent(role)) {
    throw new Error("Exit student preview to make changes.");
  }
  return { svc, userId: user.id, role, programId: student?.program_id ?? null, isMaster };
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

// Authorization context returned by requireCapability/requireAdmin/requireManager.
type ActorContext = { role: string; programId: string | null; isMaster?: boolean };

// Resolves a client-supplied programSlug to its UUID AND enforces that the actor
// is allowed to act on it. Capability checks (requireAdmin etc.) only prove the
// actor holds a role SOMEWHERE — they do not bind the action to the actor's own
// program. Without this, a program-A admin/instructor could pass programSlug="b"
// and read or mutate another tenant's data (the service client bypasses RLS, so
// there is no second line of defense). super_admins (switch_programs) legitimately
// operate across programs and are allowed through.
export async function resolveProgramForActor(
  actor: ActorContext,
  svc: ReturnType<typeof createServiceClient>,
  programSlug: string,
): Promise<string> {
  const targetId = await programIdFromSlug(svc, programSlug);
  // super_admins (switch_programs) and the master owner legitimately operate
  // across programs.
  if (canSwitchPrograms(actor.role) || actor.isMaster) return targetId;
  if (!actor.programId || targetId !== actor.programId) {
    throw new Error("Not authorized for this program");
  }
  return targetId;
}

// Same boundary for actions keyed on a studentId rather than a programSlug:
// confirm the target student belongs to the actor's program (super_admins pass).
export async function assertStudentInActorProgram(
  actor: ActorContext,
  svc: ReturnType<typeof createServiceClient>,
  studentId: string,
): Promise<void> {
  if (canSwitchPrograms(actor.role) || actor.isMaster) return;
  const { data } = await svc
    .from("students")
    .select("program_id")
    .eq("id", studentId)
    .maybeSingle<{ program_id: string | null }>();
  if (!data || !actor.programId || data.program_id !== actor.programId) {
    throw new Error("Not authorized for this student");
  }
}
