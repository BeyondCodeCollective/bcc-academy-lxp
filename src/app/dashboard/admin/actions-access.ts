"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./actions-shared";
import { canManageRoles } from "@/lib/roles";
import { getAllPrograms, getJoinablePrograms } from "@/lib/programs";

// Cross-program access grants. Granting someone a program is a role/credential
// change, so this whole file is MASTER-only — the same tier that assigns roles.
// A super-admin can see who holds what, but can't hand out a program.

export type AccessGrantRow = {
  id: string;
  studentId: string;
  name: string;
  email: string;
  role: "instructor" | "admin";
  programSlug: string;
  trackSlug: string | null;
};

async function requireMaster() {
  const ctx = await requireAdmin();
  const { svc, userId } = ctx;
  const { data } = await svc
    .from("students")
    .select("email")
    .eq("id", userId)
    .maybeSingle<{ email: string | null }>();
  if (!canManageRoles(data?.email)) throw new Error("Not authorized");
  return ctx;
}

export async function listAccessGrants(): Promise<AccessGrantRow[]> {
  const { svc } = await requireMaster();
  const { data, error } = await svc
    .from("staff_program_access")
    .select("id, role, track_slug, students(id, first_name, last_name, email), programs(slug)")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listAccessGrants error:", error.message);
    return [];
  }
  return (data ?? []).map((r) => {
    // PostgREST types embedded rows as arrays; both FKs resolve to one row.
    const one = <T,>(v: unknown): T | null =>
      (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
    const s = one<{ id: string; first_name: string | null; last_name: string | null; email: string | null }>(r.students);
    const p = one<{ slug: string }>(r.programs);
    return {
      id: r.id as string,
      studentId: s?.id ?? "",
      name: `${s?.first_name ?? ""} ${s?.last_name ?? ""}`.trim(),
      email: s?.email ?? "",
      role: r.role as "instructor" | "admin",
      programSlug: p?.slug ?? "",
      trackSlug: (r.track_slug as string | null) ?? null,
    };
  });
}

export async function grantProgramAccess(input: {
  email: string;
  programSlug: string;
  role: "instructor" | "admin";
  trackSlug?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { svc, userId } = await requireMaster();
  const email = input.email.trim().toLowerCase();

  const { data: person } = await svc
    .from("students")
    .select("id, role")
    .eq("email", email)
    .maybeSingle<{ id: string; role: string }>();
  if (!person) return { ok: false, error: "No account with that email yet." };
  // A super-admin already holds every program — a grant would be a no-op that
  // reads as if it did something.
  if (person.role === "super_admin") {
    return { ok: false, error: "They're a super-admin — they already have every program." };
  }

  const { data: program } = await svc
    .from("programs")
    .select("id")
    .eq("slug", input.programSlug)
    .maybeSingle<{ id: string }>();
  if (!program) return { ok: false, error: `Unknown program: ${input.programSlug}` };

  const { error } = await svc.from("staff_program_access").insert({
    student_id: person.id,
    program_id: program.id,
    role: input.role,
    track_slug: input.trackSlug || null,
    granted_by: userId,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "They already have that grant." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/admin/access");
  return { ok: true };
}

export async function revokeProgramAccess(id: string): Promise<{ ok: boolean; error?: string }> {
  const { svc } = await requireMaster();
  const { error } = await svc.from("staff_program_access").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/admin/access");
  return { ok: true };
}

/** Programs a grant can name — same list the super-admin switcher offers. */
export async function listGrantablePrograms(): Promise<{ slug: string; name: string }[]> {
  await requireMaster();
  const all = [...getJoinablePrograms(), ...getAllPrograms()];
  const seen = new Set<string>();
  return all
    .filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true)))
    .map((p) => ({ slug: p.slug, name: p.name }));
}
