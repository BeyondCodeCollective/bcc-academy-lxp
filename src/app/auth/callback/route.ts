import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Emails that get admin role on first login
const ADMIN_EMAILS = [
  "fonz.morris@wearebgc.org",
  "ramon.clemente@wearebgc.org",
  "mancini@wearebgc.org",
  "kkjoyner@gmail.com",
];

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
      // Auto-create student record on first login
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: existing } = await supabase
          .from("students")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existing) {
          // Derive name from email (e.g. "fonz.morris@gmail.com" → "Fonz", "Morris")
          const emailPrefix = (user.email || "").split("@")[0];
          const parts = emailPrefix
            .split(/[._-]/)
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
          const firstName = parts[0] || "New";
          const lastName = parts.slice(1).join(" ") || "Student";

          // Get the default cohort
          const { data: cohort } = await supabase
            .from("cohorts")
            .select("id")
            .order("created_at", { ascending: true })
            .limit(1)
            .single();

          await supabase.from("students").insert({
            id: user.id,
            email: user.email,
            first_name: firstName,
            last_name: lastName,
            role: ADMIN_EMAILS.includes((user.email || "").toLowerCase())
              ? "admin"
              : "student",
            cohort_id: cohort?.id || null,
          });
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // Something went wrong — redirect to login
  return NextResponse.redirect(`${origin}/?error=auth`);
}
