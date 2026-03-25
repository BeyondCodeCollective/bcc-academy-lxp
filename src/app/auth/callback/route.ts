import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Emails that get admin role on first login
const ADMIN_EMAILS = [
  "fonz.morris@wearebgc.org",
  "fonzmorris@gmail.com",
  "youngfonz@gmail.com",
  "ramon.clemente@wearebgc.org",
  "mancini@wearebgc.org",
  "kkjoyner@gmail.com",
];

// Default cohort — auto-created if no cohorts exist
const DEFAULT_COHORT = {
  name: "cohort-1-techplus",
  display_name: "Cohort 1 — CompTIA Tech+ Foundations",
  start_date: "2026-03-24",
  total_weeks: 7,
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "email" | "magiclink" | null;

  if (code || token_hash) {
    const cookieStore = await cookies();
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
        // Ensure at least one cohort exists
        const { data: cohort, error: cohortQueryErr } = await supabase
          .from("cohorts")
          .select("id")
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (cohortQueryErr) {
          console.error("[auth/callback] cohort query error:", cohortQueryErr.message);
        }

        let cohortId = cohort?.id;

        if (!cohortId) {
          const { data: newCohort, error: cohortInsertErr } = await supabase
            .from("cohorts")
            .insert(DEFAULT_COHORT)
            .select("id")
            .single();

          if (cohortInsertErr) {
            console.error("[auth/callback] cohort insert error:", cohortInsertErr.message);
          }
          cohortId = newCohort?.id;
        }

        // Auto-create student record on first login
        const { data: existing, error: studentQueryErr } = await supabase
          .from("students")
          .select("id")
          .eq("id", user.id)
          .single();

        if (studentQueryErr && studentQueryErr.code !== "PGRST116") {
          // PGRST116 = "no rows returned" which is expected for new users
          console.error("[auth/callback] student query error:", studentQueryErr.message);
        }

        if (!existing) {
          const emailPrefix = (user.email || "").split("@")[0];
          const parts = emailPrefix
            .split(/[._-]/)
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
          const firstName = parts[0] || "New";
          const lastName = parts.slice(1).join(" ") || "Student";

          const { error: insertErr } = await supabase.from("students").insert({
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
            console.error("[auth/callback] student insert error:", insertErr.message);
          }
        } else {
          // Student exists but may have no cohort — assign them
          const { error: updateErr } = await supabase
            .from("students")
            .update({ cohort_id: cohortId })
            .eq("id", user.id)
            .is("cohort_id", null);

          if (updateErr) {
            console.error("[auth/callback] student update error:", updateErr.message);
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
