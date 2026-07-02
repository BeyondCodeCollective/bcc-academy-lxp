import { type NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveHomeProgramSlug } from "@/lib/programs/server";
import { canAccessAdminPanel } from "@/lib/roles";

/**
 * GET /dashboard/switch-program?track=<slug>
 *
 * Switches the session's program context to the home program of the given
 * track, then lands on that track's overview page. Used by the dashboard's
 * "from your other programs" course list so learners enrolled across
 * programs (e.g. a Catalyst track and a Forte track) can move between them
 * without re-logging in.
 *
 * Only switches into tracks the signed-in student is actually enrolled in.
 */
export async function GET(req: NextRequest) {
  const track = req.nextUrl.searchParams.get("track") ?? "";
  // DB-aware resolution: Course-Builder tracks (e.g. comptia-security) have no
  // TS config entry, so a config-only lookup would no-op the switch and strand
  // the learner on whatever program their stale override cookie points at.
  const homeSlug = track ? await resolveHomeProgramSlug(track) : null;
  const fallback = NextResponse.redirect(new URL("/dashboard", req.url));
  if (!track || !homeSlug || !isSupabaseConfigured()) return fallback;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/", req.url));

  const svc = createServiceClient();
  // Admins browse the full catalog and must be able to open ANY course; only
  // students are restricted to tracks they're actually enrolled in.
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!canAccessAdminPanel(student?.role ?? "")) {
    const { data: enrollment } = await svc
      .from("student_tracks")
      .select("track_slug")
      .eq("student_id", user.id)
      .eq("track_slug", track)
      .maybeSingle();
    if (!enrollment) return fallback;
  }

  // Same cookie pair + options the auth callback sets at login — both must
  // move, since program-override shadows program-slug in resolution order.
  const res = NextResponse.redirect(new URL(`/dashboard/track/${track}`, req.url));
  const cookieOpts = { path: "/", httpOnly: false, sameSite: "lax" as const };
  res.cookies.set("program-slug", homeSlug, cookieOpts);
  res.cookies.set("program-override", homeSlug, {
    ...cookieOpts,
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
