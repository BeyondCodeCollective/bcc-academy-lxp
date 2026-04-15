import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";

// Emails that get admin role on first login (comma-separated env var)
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
              cookieStore.set(name, value, options)
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

        // Ensure at least one cohort exists
        const { data: cohort, error: cohortQueryErr } = await admin
          .from("cohorts")
          .select("id")
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (cohortQueryErr) {
          console.error("[auth/callback] cohort query:", cohortQueryErr.message);
        }

        let cohortId = cohort?.id;

        if (!cohortId) {
          const { data: newCohort, error: cohortInsertErr } = await admin
            .from("cohorts")
            .insert(defaultCohort)
            .select("id")
            .single();

          if (cohortInsertErr) {
            console.error("[auth/callback] cohort insert:", cohortInsertErr.message);
          }
          cohortId = newCohort?.id;
        }

        // Auto-create student record on first login
        const { data: existing, error: studentQueryErr } = await admin
          .from("students")
          .select("id")
          .eq("id", user.id)
          .single();

        if (studentQueryErr && studentQueryErr.code !== "PGRST116") {
          console.error("[auth/callback] student query:", studentQueryErr.message);
        }

        if (!existing) {
          const emailPrefix = (user.email || "").split("@")[0];
          const parts = emailPrefix
            .split(/[._-]/)
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
          const firstName = parts[0] || "New";
          const lastName = parts.slice(1).join(" ") || "Student";

          const { error: insertErr } = await admin.from("students").insert({
            id: user.id,
            email: user.email,
            first_name: firstName,
            last_name: lastName,
            role: ADMIN_EMAILS.includes((user.email || "").toLowerCase())
              ? "admin"
              : "student",
            cohort_id: cohortId || null,
          });

          if (insertErr) {
            console.error("[auth/callback] student insert:", insertErr.message);
          }
        } else {
          // Student exists but may have no cohort — assign them
          const { error: updateErr } = await admin
            .from("students")
            .update({ cohort_id: cohortId })
            .eq("id", user.id)
            .is("cohort_id", null);

          if (updateErr) {
            console.error("[auth/callback] student update:", updateErr.message);
          }
        }

        // Assign track enrollment if ?track= param was provided
        if (trackParam) {
          // Validate the track slug exists in the program config
          const validTrack = program.tracks.find((t) => t.slug === trackParam);
          if (validTrack) {
            // Look up program DB ID
            const { data: programRow } = await admin
              .from("programs")
              .select("id")
              .eq("slug", program.slug)
              .single();

            if (programRow) {
              const { error: trackErr } = await admin
                .from("student_tracks")
                .upsert(
                  {
                    student_id: user.id,
                    track_slug: trackParam,
                    program_id: programRow.id,
                  },
                  { onConflict: "student_id,track_slug,program_id" }
                );

              if (trackErr) {
                console.error("[auth/callback] track assignment:", trackErr.message);
              }
            }
          }
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    } else {
      console.error("[auth/callback] auth error:", authError.message);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
