import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { authCookieDomain } from "@/lib/supabase/cookie-domain";
import { getProgram } from "@/lib/programs/server";
import { sendWelcomeEmail } from "@/lib/email";

// Emails that always get super_admin role (hardcoded + env var)
const SUPER_ADMIN_EMAILS = [
  "fonz.morris@wearebgc.org",
  "admin@wearebgc.org",
  ...(process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
];

// Emails that get admin role (env var)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "email" | "magiclink" | null;
  const trackParam = searchParams.get("track");

  if (code || token_hash) {
    const cookieStore = await cookies();
    const program = await getProgram();
    const domain = authCookieDomain(request.headers.get("host"));

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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, domain ? { ...options, domain } : options)
            );
          },
        },
      }
    );

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
            .select("id, cohort_id, role")
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
          // Programs that require invite links (Forge) block new signups that
          // didn't come through a `?track=<slug>` invite link. Programs that
          // don't (ATG — every student gets the same tracks) skip this gate.
          // Super admins and env-configured admins are always exempt.
          const email = (user.email || "").toLowerCase();
          const isPrivileged =
            SUPER_ADMIN_EMAILS.includes(email) || ADMIN_EMAILS.includes(email);
          if (program.requireInviteLink === true && !trackParam && !isPrivileged) {
            await supabase.auth.signOut();
            return NextResponse.redirect(`${origin}/?error=invite`);
          }

          const firstName = "";
          const lastName = "";

          const { error: insertErr } = await admin.from("students").insert({
            id: user.id,
            email: user.email,
            first_name: firstName,
            last_name: lastName,
            role: SUPER_ADMIN_EMAILS.includes(email)
              ? "super_admin"
              : ADMIN_EMAILS.includes(email)
                ? "admin"
                : "student",
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
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    } else {
      console.error("[auth/callback] auth error:", authError.message);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
