import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { authCookieDomain } from "@/lib/supabase/cookie-domain";
import { getProgram, fetchDynamicProgram } from "@/lib/programs/server";
import { getProgramBySlug, getHomeProgramForTrack, isKnownProgramHost, hasTsConfigSlug } from "@/lib/programs";
import { determineRole, isPrivilegedEmail, isStaffEmail } from "@/lib/auth/admins";

// Magic-link landing. Pin to iad1 only: Supabase is in Virginia (us-east-1),
// co-located with iad1, so DB round-trips are sub-millisecond from this region.
// The callback still issues 3–5 sequential round-trips (auth token exchange +
// program lookup + student upsert; unpinned hosts add a student SELECT and a
// second program lookup). From fra1 each round-trip adds ~150ms (transatlantic)
// vs <1ms from iad1, so pinning here saves 500ms+ per login. /login is fully
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
  const nextParam = searchParams.get("next");

  if (code || token_hash) {
    const cookieStore = await cookies();

    if (!joinSlug) {
      joinSlug = cookieStore.get("pending-join-slug")?.value ?? null;
    }
    if (!trackParam) {
      trackParam = cookieStore.get("pending-join-track")?.value ?? null;
    }

    // Resolve program config. For dynamic (DB-created) courses, fall back to
    // fetchDynamicProgram so the invite gate and program_id use the correct config.
    let program: Awaited<ReturnType<typeof getProgram>>;
    if (joinSlug) {
      if (hasTsConfigSlug(joinSlug)) {
        program = getProgramBySlug(joinSlug);
      } else {
        const dynamic = await fetchDynamicProgram(joinSlug);
        program = dynamic ?? getProgramBySlug(joinSlug);
      }
    } else {
      program = await getProgram();
    }
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

      // If join/track context wasn't in the URL or cookies (e.g. Supabase
      // stripped query params from the redirect URL), fall back to the
      // allowlist. This is the source of truth for which program/track the
      // student belongs to and is always reliable regardless of how the
      // magic link was opened.
      if (!joinSlug || !trackParam) {
        const { data: allowRows } = await admin
          .from("allowed_signup_emails")
          .select("track_slug")
          .eq("email", email)
          .limit(1);
        const firstTrack = allowRows?.[0]?.track_slug as string | undefined;
        if (firstTrack) {
          const homeProgram = getHomeProgramForTrack(firstTrack);
          if (homeProgram) {
            // Always trust the allowlist over a stale pending-join-slug cookie.
            // The cookie can be left over from a previous session on a different
            // program (e.g. someone who previously visited /join/catalyst then
            // tries to log in as a Forte student). The allowlist is the canonical
            // source of truth for which program the student belongs to.
            joinSlug = homeProgram.slug;
            if (!trackParam) trackParam = firstTrack;
            // Re-resolve the program config now that we have the slug
            if (hasTsConfigSlug(joinSlug)) {
              program = getProgramBySlug(joinSlug);
            }
          }
        }
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
        // The allowlist fallback above may have failed silently (transient DB error,
        // Supabase stripping URL params, cross-browser cookie loss — all of these
        // leave trackParam null). Do one final direct lookup before rejecting: if the
        // email is genuinely on the list, recover the track and continue rather than
        // bouncing a legitimate student.
        const { data: finalCheck } = await admin
          .from("allowed_signup_emails")
          .select("track_slug")
          .eq("email", email)
          .maybeSingle();
        if (finalCheck?.track_slug) {
          trackParam = finalCheck.track_slug as string;
          if (!joinSlug) {
            const hp = getHomeProgramForTrack(trackParam);
            if (hp) {
              joinSlug = hp.slug;
              if (hasTsConfigSlug(joinSlug)) program = getProgramBySlug(joinSlug);
            }
          }
        } else {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=invite`);
        }
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

        // Privileged emails always route to Catalyst, regardless of any stale
        // role on the existing students row. Without this, an admin whose row
        // was created before being added to SUPER_ADMIN_EMAILS would bounce to
        // /login?status=not-enrolled forever.
        const envRole = determineRole(email);
        const isPrivilegedByEnv = envRole === "super_admin" || envRole === "admin";

        // Allowlist inference: when a learner has no existing student row and
        // no explicit join slug, fall back to their per-track allowlist entries
        // to decide which program shell to drop them into. Upskill Bahamas
        // (forte) tracks live both in their own config and inside Catalyst's
        // aggregated track list, so a learner allowlisted only for forte
        // tracks should land on the Upskill Bahamas dashboard — not the
        // generic Catalyst umbrella — so they see the right branding and skip
        // the Catalyst pre-survey gate they aren't supposed to take.
        let singleNonCatalystHome: string | null = null;
        if (!existing && !isPrivilegedByEnv && !joinSlug) {
          const { data: allowRows } = await admin
            .from("allowed_signup_emails")
            .select("track_slug")
            .eq("email", email);
          const homePrograms = new Set(
            (allowRows ?? [])
              .map((r) => getHomeProgramForTrack(r.track_slug as string)?.slug)
              .filter((s): s is string => !!s && s !== "catalyst"),
          );
          if (homePrograms.size === 1) {
            singleNonCatalystHome = [...homePrograms][0];
          }
        }

        let effectiveSlug: string | null = null;
        if (!existing) {
          effectiveSlug = isPrivilegedByEnv
            ? "catalyst"
            : (joinSlug && joinSlug !== "marketing")
              ? joinSlug
              : singleNonCatalystHome;
        } else {
          // Honor an explicit join slug over the stored program so a student
          // coming through /join/forte (or via the allowlist which sets the
          // pending-join-slug cookie) lands in Forte even if they have an
          // existing Catalyst record. Without this, the program-override
          // cookie would stay "catalyst" and skip logic keyed on "forte"
          // (e.g. skipForPrograms: ["forte"]) would never fire.
          const joinOverride = (!isPrivilegedByEnv && joinSlug && joinSlug !== "marketing") ? joinSlug : null;
          effectiveSlug = joinOverride ??
            (existing.programs as unknown as { slug: string } | null)?.slug ??
            (isPrivilegedByEnv || ["super_admin", "admin"].includes(existing.role ?? "") ? "catalyst" : null);
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

        const setupParams = new URLSearchParams({ setup: "1" });
        if (trackParam) setupParams.set("track", trackParam);
        // For apply flows, send the user directly to the form they came from
        // rather than the generic dashboard setup screen.
        const safeNext = nextParam?.startsWith("/dashboard/apply/") ? nextParam : null;
        const redirectTarget = safeNext
          ? `${origin}${safeNext}`
          : `${origin}/dashboard?${setupParams}`;
        const res = redirectWithCookies(redirectTarget);
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

      const setupParams = new URLSearchParams({ setup: "1" });
      if (trackParam) setupParams.set("track", trackParam);
      return redirectWithCookies(`${origin}/dashboard?${setupParams}`);
    } else {
      console.error("[auth/callback] auth error:", authError!.message);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
