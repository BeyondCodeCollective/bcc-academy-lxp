import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { authCookieDomain } from "@/lib/supabase/cookie-domain";
import { getProgram } from "@/lib/programs/server";
import { getProgramBySlug } from "@/lib/programs";
import { sendWelcomeEmail } from "@/lib/email";
import { BCC_INTAKE_SURVEY_ID, BCC_INTAKE_EXEMPT_PROGRAMS } from "@/lib/surveys/platform";
import { BCC_INTAKE_QUESTION_IDS } from "@/lib/surveys/schemas";
import { SUPER_ADMIN_EMAILS, ADMIN_EMAILS, determineRole, isPrivilegedEmail } from "@/lib/auth/admins";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "email" | "magiclink" | null;
  const trackParam = searchParams.get("track");
  const joinSlug = searchParams.get("join");

  if (code || token_hash) {
    const cookieStore = await cookies();
    const program = joinSlug ? getProgramBySlug(joinSlug) : await getProgram();
    const domain = authCookieDomain(request.headers.get("host"));

    // Capture every cookie Supabase wants to set so we can forward them onto
    // the redirect response. cookies().set() doesn't reliably attach to a
    // NextResponse.redirect() in Next.js App Router Route Handlers, so we
    // explicitly copy them onto the response object as well.
    const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

    // Auth client — handles session exchange and cookie management
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

    // Helper that returns a redirect with all pending Supabase session cookies
    // already applied directly to the response headers.
    const redirectWithCookies = (url: string) => {
      const res = NextResponse.redirect(url);
      pendingCookies.forEach(({ name, value, options }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res.cookies.set(name, value, options as any);
      });
      return res;
    };

    // Service client — bypasses RLS for database writes
    const admin = createServiceClient();

    let authError = null;
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      authError = error;
    } else if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      });
      authError = error;
    }

    if (!authError) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Use program-specific default cohort
        const defaultCohort = {
          name: program.defaultCohort.name,
          display_name: program.defaultCohort.displayName,
          start_date: program.defaultCohort.startDate,
          total_weeks: program.defaultCohort.totalWeeks,
        };

        // Fetch program row and existing student row in parallel — they're
        // independent queries but both needed before we can decide what to do.
        const [programRes, studentRes] = await Promise.all([
          admin.from("programs").select("id").eq("slug", program.slug).maybeSingle(),
          admin
            .from("students")
            .select("id, cohort_id, role, programs(slug)")
            .eq("id", user.id)
            .maybeSingle(),
        ]);

        const programForCohort = programRes.data;
        const existing = studentRes.data;

        if (studentRes.error) {
          console.error("[auth/callback] student query:", studentRes.error.message);
        }

        // Returning users with a cohort already set skip the cohort round-trip
        // entirely — it's only needed for brand-new signups or stale rows.
        let cohortId: string | undefined = existing?.cohort_id ?? undefined;

        if (!cohortId) {
          const { data: cohort, error: cohortQueryErr } = await admin
            .from("cohorts")
            .select("id")
            .eq("program_id", programForCohort?.id ?? "")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (cohortQueryErr) {
            console.error("[auth/callback] cohort query:", cohortQueryErr.message);
          }

          cohortId = cohort?.id;

          if (!cohortId) {
            const { data: newCohort, error: cohortInsertErr } = await admin
              .from("cohorts")
              .insert({ ...defaultCohort, program_id: programForCohort?.id })
              .select("id")
              .single();

            if (cohortInsertErr) {
              console.error("[auth/callback] cohort insert:", cohortInsertErr.message);
            }
            cohortId = newCohort?.id;
          }
        }

        if (!existing) {
          // Central login (marketing domain): unadmitted users get a
          // friendly redirect instead of a student row in the wrong program.
          // Admitted students arrive via program subdomain invite links, not
          // through the marketing apex.
          if (program.slug === "marketing") {
            return redirectWithCookies(`${origin}/login?status=not-enrolled`);
          }

          // Programs that require invite links (Forge) block new signups that
          // didn't come through a `?track=<slug>` invite link. Programs that
          // don't (ATG — every student gets the same tracks) skip this gate.
          // Super admins and env-configured admins are always exempt.
          const email = (user.email || "").toLowerCase();
          if (program.requireInviteLink === true && !trackParam && !isPrivilegedEmail(email)) {
            await supabase.auth.signOut();
            return NextResponse.redirect(`${origin}/?error=invite`);
          }

          const { error: insertErr } = await admin.from("students").insert({
            id: user.id,
            email: user.email,
            first_name: "",
            last_name: "",
            role: determineRole(email),
            cohort_id: cohortId || null,
            program_id: programForCohort?.id,
          });

          if (insertErr) {
            console.error("[auth/callback] student insert:", insertErr.message);
          }
        } else {
          // Student exists — ensure cohort is set and role stays correct.
          // `existing` was fetched in parallel above with cohort_id + role, so
          // no extra query is needed here.
          const email = (user.email || "").toLowerCase();
          const correctRole = SUPER_ADMIN_EMAILS.includes(email)
            ? "super_admin"
            : ADMIN_EMAILS.includes(email)
              ? "admin"
              : null; // null = don't change role

          const updates: Record<string, unknown> = {};

          if (!existing.cohort_id && cohortId) {
            updates.cohort_id = cohortId;
          }

          if (correctRole && existing.role !== correctRole) {
            updates.role = correctRole;
          }

          if (Object.keys(updates).length > 0) {
            const { error: updateErr } = await admin
              .from("students")
              .update(updates)
              .eq("id", user.id);

            if (updateErr) {
              console.error("[auth/callback] student update:", updateErr.message);
            }
          }
        }

        // Assign track enrollment on first signup only.
        // Returning users don't get re-enrolled by clicking another track's
        // link, so students can't leak tracks to each other by sharing URLs.
        if (!existing && programForCohort) {
          // Programs without invite gating (ATG) auto-enroll new signups in
          // every track. Programs with invite gating (Forge) only enroll in
          // the specific track from `?track=<slug>`.
          const tracksToEnroll =
            program.requireInviteLink === true
              ? program.tracks.filter((t) => t.slug === trackParam)
              : program.tracks;

          if (tracksToEnroll.length > 0) {
            const { error: trackErr } = await admin
              .from("student_tracks")
              .upsert(
                tracksToEnroll.map((t) => ({
                  student_id: user.id,
                  track_slug: t.slug,
                  program_id: programForCohort.id,
                })),
                { onConflict: "student_id,track_slug,program_id" }
              );

            if (trackErr) {
              console.error("[auth/callback] track assignment:", trackErr.message);
            }
          }

          const emailPrefix = (user.email || "").split("@")[0];
          const derivedName =
            emailPrefix
              .split(/[._-]/)
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())[0] || "there";

          void sendWelcomeEmail({
            to: user.email!,
            firstName: derivedName,
            program,
            enrolledTracks: tracksToEnroll,
          }).then(() =>
            admin
              .from("students")
              .update({ welcome_email_sent_at: new Date().toISOString() })
              .eq("id", user.id)
          );
        }

        // Marketing domain: resolve the user's real program and keep them
        // on bccacademy.io. The program-override cookie tells getProgram()
        // which program to render so the dashboard works without subdomains.
        if (program.slug === "marketing") {
          const programSlug =
            (existing?.programs as unknown as { slug: string } | null)?.slug ??
            (["super_admin", "admin"].includes(existing?.role ?? "") ? "atg" : null);

          if (programSlug) {
            const res = redirectWithCookies(`${origin}/dashboard`);
            const cookieOpts = { path: "/", httpOnly: false, sameSite: "lax" as const };
            res.cookies.set("program-slug", programSlug, cookieOpts);
            res.cookies.set("program-override", programSlug, {
              ...cookieOpts,
              maxAge: 60 * 60 * 24 * 365,
            });
            return res;
          }
          return redirectWithCookies(`${origin}/login?status=not-enrolled`);
        }

        // Claim any public survey submissions that match this user's email.
        // A user who took a public survey (e.g. forge.bccacademy.io's
        // pre-survey) before signing up should not be forced to retake it
        // when they later authenticate with the same email. Upsert with
        // ignoreDuplicates so existing auth'd responses are never
        // overwritten by older public ones. Idempotent — safe to run on
        // every callback.
        const claimEmail = (user.email || "").toLowerCase();
        if (claimEmail) {
          const { data: publicRows, error: publicQueryErr } = await admin
            .from("public_survey_responses")
            .select("program_id, survey_type, responses, completed_at")
            .eq("email", claimEmail)
            .not("completed_at", "is", null);

          if (publicQueryErr) {
            console.error("[auth/callback] public submissions lookup:", publicQueryErr.message);
          } else if (publicRows && publicRows.length > 0) {
            const claimRows = publicRows.map((r) => ({
              student_id: user.id,
              survey_type: r.survey_type as string,
              responses: r.responses,
              completed_at: r.completed_at as string,
              program_id: r.program_id as string,
              updated_at: new Date().toISOString(),
            }));
            const { error: claimErr } = await admin
              .from("survey_responses")
              .upsert(claimRows, {
                onConflict: "student_id,survey_type",
                ignoreDuplicates: true,
              });
            if (claimErr) {
              console.error("[auth/callback] claim public submissions:", claimErr.message);
            }

            // BCC intake auto-completion. The BCC learner intake is just
            // the SHARED_DEMOGRAPHICS block (see lib/surveys/schemas.ts).
            // Other surveys — e.g. the Forge pre-survey — embed the same
            // demographic ids. If any claimed public submission has every
            // intake-required answer, synthesize an intake response so the
            // user is not asked the same questions again on first login.
            const intakeAlreadyDone = publicRows.some(
              (r) => r.survey_type === BCC_INTAKE_SURVEY_ID && r.completed_at,
            );
            if (!intakeAlreadyDone) {
              const intakeSource = publicRows.find((r) => {
                const responses = (r.responses ?? {}) as Record<string, unknown>;
                return BCC_INTAKE_QUESTION_IDS.every((key) => {
                  const v = responses[key];
                  return v !== undefined && v !== null && v !== "";
                });
              });
              if (intakeSource) {
                const sourceResponses = (intakeSource.responses ?? {}) as Record<string, unknown>;
                const intakeResponses: Record<string, unknown> = {};
                for (const key of BCC_INTAKE_QUESTION_IDS) {
                  intakeResponses[key] = sourceResponses[key];
                }
                const { error: intakeErr } = await admin
                  .from("survey_responses")
                  .upsert(
                    {
                      student_id: user.id,
                      survey_type: BCC_INTAKE_SURVEY_ID,
                      responses: intakeResponses,
                      completed_at: intakeSource.completed_at as string,
                      program_id: intakeSource.program_id as string,
                      updated_at: new Date().toISOString(),
                    },
                    {
                      onConflict: "student_id,survey_type",
                      ignoreDuplicates: true,
                    },
                  );
                if (intakeErr) {
                  console.error("[auth/callback] intake auto-complete:", intakeErr.message);
                }
              }
            }
          }
        }
      }

      // BCC Learner Intake — platform-level required survey, fires before any program-specific
      // survey. ATG students and privileged users (super admins, admins) are exempt.
      const userEmailForIntake = (user!.email || "").toLowerCase();
      const isPrivilegedUser =
        SUPER_ADMIN_EMAILS.includes(userEmailForIntake) ||
        ADMIN_EMAILS.includes(userEmailForIntake);
      if (!isPrivilegedUser && !BCC_INTAKE_EXEMPT_PROGRAMS.includes(program.slug)) {
        const { data: intakeRow } = await admin
          .from("survey_responses")
          .select("completed_at")
          .eq("student_id", user!.id)
          .eq("survey_type", BCC_INTAKE_SURVEY_ID)
          .maybeSingle();
        if (!intakeRow?.completed_at) {
          return redirectWithCookies(`${origin}/dashboard/survey/${BCC_INTAKE_SURVEY_ID}`);
        }
      }

      // If the program has a required survey, skip the dashboard and go straight to it.
      // Privileged users (admins, super admins) skip this gate.
      const requiredSurvey = program.surveys?.find((s) => s.required);
      if (requiredSurvey && !isPrivilegedUser) {
        // Check if already completed
        const { data: existing } = await admin
          .from("survey_responses")
          .select("completed_at")
          .eq("student_id", user!.id)
          .eq("survey_type", requiredSurvey.id)
          .maybeSingle();
        if (!existing?.completed_at) {
          return redirectWithCookies(`${origin}/dashboard/survey/${requiredSurvey.id}`);
        }
      }

      return redirectWithCookies(`${origin}/dashboard`);
    } else {
      console.error("[auth/callback] auth error:", authError.message);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
