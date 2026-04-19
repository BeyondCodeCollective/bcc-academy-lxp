import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";

// Mirrors the privileged lists in auth/callback/route.ts so admins can
// always bootstrap a session without an invite link.
const SUPER_ADMIN_EMAILS = [
  "fonz.morris@wearebgc.org",
  "admin@wearebgc.org",
  ...(process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
];

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; track?: string }
    | null;

  const email = (body?.email || "").trim().toLowerCase();
  const track = (body?.track || "").trim();

  if (!email) {
    return NextResponse.json({ allowed: false });
  }

  // Admins always allowed (bootstrap access)
  if (SUPER_ADMIN_EMAILS.includes(email) || ADMIN_EMAILS.includes(email)) {
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
