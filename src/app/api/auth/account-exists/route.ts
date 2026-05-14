import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isPrivilegedEmail } from "@/lib/auth/admins";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ exists: false });
  }

  if (isPrivilegedEmail(email)) {
    return NextResponse.json({ exists: true });
  }

  const svc = createServiceClient();
  const { data } = await svc
    .from("students")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  return NextResponse.json({ exists: !!data });
}
