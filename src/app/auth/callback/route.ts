import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { authCookieDomain } from "@/lib/supabase/cookie-domain";
import { getProgram } from "@/lib/programs/server";
import { getProgramBySlug, isKnownProgramHost } from "@/lib/programs";
import { determineRole, isPrivilegedEmail, isStaffEmail } from "@/lib/auth/admins";

// Magic-link landing. Pin to iad1 only: Supabase is in us-west-2 and
// even after the deferred-setup refactor the callback still issues
// 3–5 sequential round-trips (auth token exchange + program lookup +
// student upsert; unpinned hosts add a student SELECT and a second
// program lookup). From fra1 each round-trip is ~310ms (transatlantic
// + transcontinental) vs ~150ms from iad1, so iad1 nets ~300–800ms
// even after losing fra1's user-proximity advantage. /login is fully
// static (served from the CDN edge), so no region pin needed there.
export const preferredRegion = ["iad1"];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const ALLOWED_TYPES: EmailOtpType[] = [
    "magiclink",
    "signup",
    "recovery",
    "invite",
    "email",
    "email_change",
  ];
  const type: EmailOtpType | null = ALLOWED_TYPES.includes(rawType as EmailOtpType)
    ? (rawType as EmailOtpType)
    : null;
  let trackParam = searchParams.get("track");
  let joinSlug = searchParams.get("join");

  if (code || token_hash) {
    const cookieStore = await cookies();

    if (!joinSlug) {
      joinSlug = cookieStore.get("pending-join-slug")?.value ?? null;
    }
    if (!trackParam) {
      trackParam = cookieStore.get("pending-join-track")?.value ?? null;
    }

    const program = joinSlug ? getProgramBySlug(joinSlug) : await getProgram();
    const domain = authCookieDomain(request.headers.get("host"));

    const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const finalOptions = domain ? { ...options, domain } : options;
              cookieStore.set(name, value, finalOptions);
              pendingCookies.push({ name, value, options: finalOptions as Record<string, unknown> });
            });
          },
        },
      }
    );

    const redirectWithCookies = (url: string) => {
      const res = NextResponse.redirect(url);
      pendingCookies.forEach(({ name, value, options }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res.cookies.set(name, value, options as any);
      });
      res.cookies.set("pending-join-slug", "", { path: "/", maxAge: 0 });
      res.cookies.set("pending-join-track", "", { path: "/", maxAge: 0 });
      return res;
    };

    const admin = createServiceClient();

    let authResult: { user: import("@supabase/supabase-js").User | null } | null = null;
    let authError = null;
    const fallbackToExisting = async () => {
      const { data: { user: fu } } = await supabase.auth.getUser();
      if (fu) authResult = { user: fu };
      return !!fu;
    };

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) { if (!(await fallbackToExisting())) authError = error; }
      else { authResult = data; }
    } else if (token_hash && type) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (error) { if (!(await fallbackToExisting())) authError = error; }
      else { authResult = data; }
    }

    const user = authResult?.user ?? null;

    if (!authError && user) {
      const hostStr = request.headers.get("host") ?? "";
      const isUnpinnedHost = !isKnownProgramHost(hostStr);
      const email = (user.email || "").toLowerCase();

      // Marketing domain — unadmitted users get a friendly redirect
      if (program.slug === "marketing") {
        return redirectWithCookies(`${origin}/login?status=not-enrolled`);
      }

      // Programs that require invite links block new signups without
      // ?track=<slug>. Privileged admins (SUPER_ADMIN_EMAILS /
      // ADMIN_EMAILS) and internal staff (wearebgc.org / BCC staff) bypass
      // this — they're not signing up for a course, they're signing in to
      // the dashboard. Without the staff bypass, BGC employees who weren't
      // explicitly listed in SUPER_ADMIN_EMAILS got rejected as if they
      // were a stray learner.
      const canBypassInviteGate =
        isPrivilegedEmail(email) || isStaffEmail(email);
      if (program.requireInviteLink === true && !trackParam && !canBypassInviteGate) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/?error=invite`);
      }

      // Fetch program UUID (needed for student upsert)
      const { data: programRow } = await admin
        .from("programs")
        .select("id")
        .eq("slug", program.slug)
        .maybeSingle();

      const programId = programRow?.id;

      if (isUnpinnedHost) {
        // Unpinned hosts (marketing apex, localhost): determine the student's
        // home program from their identity or join intent so the program cookie
        // routes them to the right dashboard.
        const { data: existing } = await admin
          .from("students")
          .select("id, role, programs(slug)")
          .eq("id", user.id)
          .maybeSingle();

        let effectiveSlug: string | null = null;
        if (!existing) {
          effectiveSlug = (joinSlug && joinSlug !== "marketing") ? joinSlug : null;
        } else {
          effectiveSlug = (existing.programs as unknown as { slug: string } | null)?.slug ??
            (["super_admin", "admin"].includes(existing.role ?? "") ? "catalyst" : null);
        }

        if (!effectiveSlug) {
          return redirectWithCookies(`${origin}/login?status=not-enrolled`);
        }

        // Upsert minimal student row in the resolved program
        const effectiveProgram = getProgramBySlug(effectiveSlug);
        const { data: effectiveProgramRow } = await admin
          .from("programs")
          .select("id")
          .eq("slug", effectiveSlug)
          .maybeSingle();

        await admin.from("students").upsert(
          {
            id: user.id,
            email: user.email,
            first_name: "",
            last_name: "",
            role: determineRole(email),
            cohort_id: null,
            program_id: effectiveProgramRow?.id ?? programId,
          },
          { onConflict: "id", ignoreDuplicates: true }
        );

        const res = redirectWithCookies(`${origin}/dashboard?setup=1`);
        const cookieOpts = { path: "/", httpOnly: false, sameSite: "lax" as const };
        res.cookies.set("program-slug", effectiveSlug, cookieOpts);
        res.cookies.set("program-override", effectiveSlug, {
          ...cookieOpts,
          maxAge: 60 * 60 * 24 * 365,
        });

        return res;
      }

      // Pinned host (program subdomain): simple upsert + redirect.
      // Cohort, track enrollment, and survey work happen on the dashboard
      // after the first paint via completePendingSetup().
      await admin.from("students").upsert(
        {
          id: user.id,
          email: user.email,
          first_name: "",
          last_name: "",
          role: determineRole(email),
          cohort_id: null,
          program_id: programId,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );

      return redirectWithCookies(`${origin}/dashboard?setup=1`);
    } else {
      console.error("[auth/callback] auth error:", authError!.message);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
