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

  const { data } = await admin
    .from("students")
    .select("role, programs(slug)")
    .ilike("email", email)
    .maybeSingle();

  const program = data?.programs as unknown as { slug: string } | null;
  const slug =
    program?.slug ??
    // Super admins and admins with no program assigned default to ATG
    (["super_admin", "admin"].includes(data?.role ?? "") ? "atg" : null);

  return NextResponse.json({ programSlug: slug });
}
