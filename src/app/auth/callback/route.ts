import { NextResponse, after } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { authCookieDomain } from "@/lib/supabase/cookie-domain";
import { getProgram, fetchDynamicProgram, resolveHomeProgramSlug } from "@/lib/programs/server";
import { getProgramBySlug, getHomeProgramForTrack, getTrackBySlug, isKnownProgramHost, hasTsConfigSlug } from "@/lib/programs";
import { safeNextPath } from "@/lib/auth/next-path";
import { courseLandingPath, primaryTrack } from "@/lib/enrollment";
import { completePendingSetup } from "@/lib/auth/deferred-setup";
import { determineRole, isPrivilegedEmail, isStaffEmail } from "@/lib/auth/admins";
import { subscribeToNewsletter } from "@/lib/mailchimp";
import { sendStaffAccountNotification } from "@/lib/email";
import { logActivityEvent } from "@/lib/analytics/log-event";

/**
 * The program UUID that OWNS a track — TS-config tracks via their home
 * program, Course Builder tracks via their track_overrides row. Used to stamp
 * a NEW student's program_id from the course they're joining rather than the
 * surface they signed in on: a camp kid who requests a fresh login link from
 * the apex homepage must still land under the camp's program (three Roblox/BGC
 * learners got filed under Catalyst exactly this way).
 */
async function trackHomeProgramId(
  admin: ReturnType<typeof createServiceClient>,
  trackSlug: string,
): Promise<string | null> {
  const homeSlug = getHomeProgramForTrack(trackSlug)?.slug;
  if (homeSlug) {
    const { data } = await admin
      .from("programs")
      .select("id")
      .eq("slug", homeSlug)
      .maybeSingle<{ id: string }>();
    return data?.id ?? null;
  }
  const { data } = await admin
    .from("track_overrides")
    .select("program_id")
    .eq("track_slug", trackSlug)
    .maybeSingle<{ program_id: string | null }>();
  return data?.program_id ?? null;
}

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
  // Preserve a safe destination across failure redirects to /login: the login
  // form reads ?next=, so a student who has to manually re-request a sign-in
  // link after a failed exchange still lands where the original link pointed
  // (e.g. the participation agreement) instead of the default dashboard.
  const nextDestination = safeNextPath(nextParam);
  const nextQS = nextDestination ? `&next=${encodeURIComponent(nextDestination)}` : "";
  // The email the magic link was issued for — used to guard against silently
  // falling back to a DIFFERENT account already signed in on this browser.
  const intendedEmail = searchParams.get("email")?.toLowerCase() ?? null;

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
      // Never silently sign someone in as the WRONG account. If the magic link
      // was issued for a specific email and the existing browser session
      // belongs to someone else (e.g. you were logged in as A and clicked a
      // link for B that failed to exchange), sign the stale session out and
      // refuse the fallback — a clean re-login beats impersonating A as B.
      if (fu && intendedEmail && (fu.email ?? "").toLowerCase() !== intendedEmail) {
        console.warn(
          "[auth/callback] wrong-account fallback BLOCKED — magic link for",
          intendedEmail,
          "but existing session is",
          (fu.email ?? "unknown").toLowerCase(),
          "→ signing out, forcing clean re-login",
        );
        await supabase.auth.signOut();
        return false;
      }
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
          // TS-config tracks resolve in-memory; Course-Builder (DB) tracks live
          // only in track_overrides, so getHomeProgramForTrack can't see them.
          // Fall back to a DB lookup for the track's program in that case.
          const homeSlug = await resolveHomeProgramSlug(firstTrack);
          if (homeSlug) {
            // Always trust the allowlist over a stale pending-join-slug cookie.
            // The cookie can be left over from a previous session on a different
            // program (e.g. someone who previously visited /join/catalyst then
            // tries to log in as a Forte student). The allowlist is the canonical
            // source of truth for which program the student belongs to.
            joinSlug = homeSlug;
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
        // limit(1) not maybeSingle: a learner allowlisted for >1 track makes
        // maybeSingle throw, which would false-reject a legitimate student.
        const { data: finalRows } = await admin
          .from("allowed_signup_emails")
          .select("track_slug")
          .eq("email", email)
          .limit(1);
        const finalTrack = finalRows?.[0]?.track_slug as string | undefined;
        if (finalTrack) {
          trackParam = finalTrack;
          if (!joinSlug) {
            const hpSlug = await resolveHomeProgramSlug(trackParam);
            if (hpSlug) {
              joinSlug = hpSlug;
              if (hasTsConfigSlug(joinSlug)) program = getProgramBySlug(joinSlug);
            }
          }
        } else {
          // Track-less (agreement-only) invites carry no allowlist entry, but
          // an admin-minted invites row is just as authoritative — accept it
          // before rejecting the signup. Without this, the invite gate silently
          // signed agreement-only invitees out to /login?error=invite.
          const { data: invRows } = await admin
            .from("invites")
            .select("token")
            .ilike("email", email)
            .limit(1);
          if (!invRows?.length) {
            await supabase.auth.signOut();
            return NextResponse.redirect(`${origin}/login?error=invite${nextQS}`);
          }
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
          .select("id, role, cohort_id, welcome_seen_at, programs(slug)")
          .eq("id", user.id)
          .maybeSingle();

        // Privileged emails always route to Catalyst, regardless of any stale
        // role on the existing students row. Without this, an admin whose row
        // was created before being added to SUPER_ADMIN_EMAILS would bounce to
        // /login?status=not-enrolled forever.
        const envRole = determineRole(email);
        const isPrivilegedByEnv = envRole === "super_admin" || envRole === "admin";

        // Privileged admins are not learners — don't route them into a specific
        // track even if the allowlist lookup found one. Without this clear, the
        // track leaks into ?track= and deferred-setup enrolls the admin as if
        // they were a student joining the course.
        if (isPrivilegedByEnv) trackParam = null;

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

        // A joined track's OWNING program beats the sign-in surface — the
        // upsert only fires for brand-new accounts (ignoreDuplicates), and a
        // learner's home is where their course lives, not where they clicked.
        const trackProgramId =
          !existing && trackParam ? await trackHomeProgramId(admin, trackParam) : null;
        await admin.from("students").upsert(
          {
            id: user.id,
            email: user.email,
            first_name: "",
            last_name: "",
            role: determineRole(email),
            cohort_id: null,
            program_id: trackProgramId ?? effectiveProgramRow?.id ?? programId,
          },
          { onConflict: "id", ignoreDuplicates: true }
        );
        await admin.from("students").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
        after(() => logActivityEvent({ userId: user.id, eventType: "login", programId: effectiveProgramRow?.id ?? programId }));

        // First-time signup → add to the Mailchimp newsletter (auto-subscribe).
        // Only on `!existing` so we don't fire on every login. Name is blank at
        // this stage; sendWelcomeEmail re-syncs it once onboarding captures it.
        if (!existing) {
          after(() => subscribeToNewsletter({ email, programSlug: effectiveSlug }));
        }

        const cookieOpts = { path: "/", httpOnly: false, sameSite: "lax" as const };
        const withProgramCookies = (r: NextResponse) => {
          r.cookies.set("program-slug", effectiveSlug, cookieOpts);
          r.cookies.set("program-override", effectiveSlug, { ...cookieOpts, maxAge: 60 * 60 * 24 * 365 });
          return r;
        };

        // A staff-domain email with no prior account and no join intent just
        // got a brand-new auto-created account. That's a feature (staff Lunch
        // & Learn access) — but it's also how an instructor whose real account
        // lives under a personal email silently duplicates and lands in an
        // empty shell. Make it loud on both sides: notify admins, and show the
        // staffer an explainer instead of a bare dashboard. Privileged emails
        // (SUPER_ADMIN/ADMIN lists) skip this — their fresh account is correct.
        if (!existing && !isPrivilegedByEnv && isStaffEmail(email) && !trackParam) {
          after(() => sendStaffAccountNotification({ email }));
          const welcome = nextDestination
            ? `/dashboard/staff-welcome?next=${encodeURIComponent(nextDestination)}`
            : "/dashboard/staff-welcome";
          return withProgramCookies(redirectWithCookies(`${origin}${welcome}`));
        }

        // Any emailed dashboard link (a session page, the agreement, an apply
        // route) sends the user to the page they came from rather than the
        // generic dashboard setup screen (or their single course).
        const safeNext = nextDestination;

        // Enrol BEFORE honouring `next`. This used to live inside the
        // `!safeNext` branch below, so any emailed link carrying a `next` —
        // including the per-learner sign-in links minted by
        // scripts/make-track-signin-links.mjs — created the students row and
        // then skipped enrolment entirely. The learner signed in fine and
        // found no course, which is indistinguishable from "the platform is
        // broken" (it stranded two Wisdom Leaders learners on 2026-07-19).
        // completePendingSetup is idempotent and unions trackParam with every
        // allowlisted track, so running it on each sign-in is safe.
        if (!canBypassInviteGate && trackParam) {
          await completePendingSetup(
            user.id,
            email,
            effectiveProgram,
            trackParam,
            (existing?.cohort_id as string | null) ?? null,
            envRole,
            (existing?.welcome_seen_at as string | null) ?? null,
          );
        }

        // Single-course learners go straight to their one course, so the only
        // loading skeleton shown is that course's — no dashboard→course double
        // flash. Admins/staff fall through to the normal dashboard.
        if (!safeNext && !canBypassInviteGate) {
          const { data: enr } = await admin
            .from("student_tracks")
            .select("track_slug")
            .eq("student_id", user.id);
          // Land every learner in their course, not on a picker. Someone
          // enrolled in Security+ AND its MASS wraparound has two enrollments
          // but one course; the dashboard home in between was a step nobody
          // asked for. It stays reachable from the nav.
          if (enr && enr.length > 0) {
            const enrolledCfgs = enr
              .map((e) => getTrackBySlug(effectiveProgram, e.track_slug as string))
              .filter((t): t is NonNullable<typeof t> => !!t);
            const primary = primaryTrack(enrolledCfgs);
            const dest = primary
              ? courseLandingPath(primary)
              : `/dashboard/track/${enr[0].track_slug}`;
            return withProgramCookies(redirectWithCookies(`${origin}${dest}`));
          }

          // First invite click: enrollment used to be deferred to the first
          // dashboard paint, which could render its empty "track is being
          // finalized" home before the freshly-inserted enrollment was
          // readable. When we KNOW the track they're joining, run the
          // (idempotent) setup right here and land them directly in the
          // course — the generic dashboard never flashes.
          const joinTrackCfg = trackParam
            ? getTrackBySlug(effectiveProgram, trackParam)
            : undefined;
          if ((enr ?? []).length === 0 && joinTrackCfg) {
            // Enrolment already ran above; just land them in the course.
            return withProgramCookies(
              redirectWithCookies(`${origin}${courseLandingPath(joinTrackCfg)}`),
            );
          }
        }

        const setupParams = new URLSearchParams({ setup: "1" });
        if (trackParam) setupParams.set("track", trackParam);
        const redirectTarget = safeNext ? `${origin}${safeNext}` : `${origin}/dashboard?${setupParams}`;
        return withProgramCookies(redirectWithCookies(redirectTarget));
      }

      // Pinned host (program subdomain): simple upsert + redirect.
      // Cohort, track enrollment, and survey work happen on the dashboard
      // after the first paint via completePendingSetup(). Same rule as the
      // unpinned path: a joined track's owning program wins over the host, so
      // signing up for another program's course from this domain can't file
      // the account under the wrong program.
      const pinnedTrackProgramId = trackParam
        ? await trackHomeProgramId(admin, trackParam)
        : null;
      await admin.from("students").upsert(
        {
          id: user.id,
          email: user.email,
          first_name: "",
          last_name: "",
          role: determineRole(email),
          cohort_id: null,
          program_id: pinnedTrackProgramId ?? programId,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
      await admin.from("students").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
      after(() => logActivityEvent({ userId: user.id, eventType: "login", programId }));

      // Single-course learners → straight to their course (no dashboard→course
      // skeleton flash). New students / admins / staff fall through to setup.
      if (!canBypassInviteGate) {
        const { data: enr } = await admin
          .from("student_tracks")
          .select("track_slug")
          .eq("student_id", user.id);
        if (enr && enr.length === 1) {
          return redirectWithCookies(`${origin}/dashboard/track/${enr[0].track_slug}`);
        }
      }

      const setupParams = new URLSearchParams({ setup: "1" });
      if (trackParam) setupParams.set("track", trackParam);
      return redirectWithCookies(`${origin}/dashboard?${setupParams}`);
    } else {
      console.error("[auth/callback] auth error:", authError!.message);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth${nextQS}`);
}
