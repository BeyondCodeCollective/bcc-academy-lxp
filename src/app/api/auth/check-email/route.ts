import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { isPrivilegedEmail } from "@/lib/auth/admins";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; track?: string }
    | null;

  const email = (body?.email || "").trim().toLowerCase();
  const track = (body?.track || "").trim();

  if (!email) {
    return NextResponse.json({ allowed: false });
  }

  if (isPrivilegedEmail(email)) {
    return NextResponse.json({ allowed: true });
  }

  const program = await getProgram();

  // Programs that don't require invite links (ATG) auto-enroll new signups
  // in every track, so anyone with a valid email is allowed.
  if (program.requireInviteLink !== true) {
    return NextResponse.json({ allowed: true });
  }

  // Valid track invite → new signup allowed
  if (track) {
    if (program.tracks.some((t) => t.slug === track)) {
      return NextResponse.json({ allowed: true });
    }
  }

  // Returning user (existing student record) → allowed
  const admin = createServiceClient();
  const { data } = await admin
    .from("students")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  return NextResponse.json({ allowed: !!data });
}
