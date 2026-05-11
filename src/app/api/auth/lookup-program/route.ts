import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Returns which program slug a student is enrolled in.
// Used by the central login page (bccacademy.io/login) to route
// the magic link to the correct subdomain's auth callback.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ programSlug: null });
  }

  const admin = createServiceClient();

  // Step 1: look up the student row with the embedded programs join.
  const { data, error } = await admin
    .from("students")
    .select("role, program_id, programs(slug)")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    console.error("[lookup-program] query error:", error.message, error.details);
  }

  const program = data?.programs as unknown as { slug: string } | null;
  let slug = program?.slug ?? null;

  // Step 2: if the embedded join returned nothing but we have a program_id,
  // do a direct lookup — guards against PostgREST relation inference issues.
  if (!slug && data?.program_id) {
    const { data: prog } = await admin
      .from("programs")
      .select("slug")
      .eq("id", data.program_id)
      .maybeSingle();
    slug = prog?.slug ?? null;
    if (slug) {
      console.log("[lookup-program] embedded join missed, fallback found slug:", slug);
    }
  }

  // Super admins and admins with no program assigned default to ATG
  if (!slug && ["super_admin", "admin"].includes(data?.role ?? "")) {
    slug = "atg";
  }

  console.log("[lookup-program] email:", email, "→ slug:", slug, "role:", data?.role);

  return NextResponse.json({ programSlug: slug });
}
