import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /invite/<token>
 *
 * One-click cohort invite. The token lives in our DB (no expiry), and we mint
 * a FRESH Supabase magic link at click time — so the student always clicks a
 * valid link, never a stale 1-hour one. We then hand off to the existing
 * /auth/callback, which verifies the token, creates the session, enrolls them
 * in the track, and lands them on the dashboard.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const origin = req.nextUrl.origin;
  const fail = NextResponse.redirect(new URL("/login?error=invite", origin));

  const svc = createServiceClient();
  const { data: invite } = await svc
    .from("invites")
    .select("email, track_slug, program_slug, used_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return fail;

  const callbackUrl = new URL(`${origin}/auth/callback`);
  callbackUrl.searchParams.set("join", invite.program_slug);
  // Agreement-only invites store an empty track_slug — omit the param so the
  // callback skips enrollment entirely (an empty value is treated the same,
  // but omitting it is explicit).
  if (invite.track_slug) {
    callbackUrl.searchParams.set("track", invite.track_slug);
  }

  // Optional post-login destination (e.g. the participation-agreement page,
  // for one-click "please sign" emails). Whitelisted to the same paths the
  // auth callback's safeNext accepts — arbitrary values are dropped here so
  // the emailed link can't be repurposed as an open redirect.
  const nextParam = req.nextUrl.searchParams.get("next");
  if (nextParam?.startsWith("/dashboard/agreement")) {
    callbackUrl.searchParams.set("next", nextParam);
  }

  // Magic links only verify for users that already exist — but most invitees
  // are brand new (allowlisted, never signed up). Create the account first
  // (idempotent: ignore "already registered"); email_confirm marks it ready so
  // the freshly-minted link verifies on the next hop.
  await svc.auth.admin
    .createUser({ email: invite.email, email_confirm: true })
    .catch(() => {});

  const { data, error } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email: invite.email,
    options: { redirectTo: callbackUrl.toString() },
  });
  if (error || !data?.properties?.hashed_token) {
    console.error("[invite] generateLink failed:", error?.message);
    return fail;
  }

  callbackUrl.searchParams.set("token_hash", data.properties.hashed_token);
  callbackUrl.searchParams.set("type", "magiclink");

  // Record first use for the admin report — but don't block re-clicks (email
  // prefetch / double-taps should still log the student in).
  if (!invite.used_at) {
    await svc
      .from("invites")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);
  }

  return NextResponse.redirect(callbackUrl.toString());
}
